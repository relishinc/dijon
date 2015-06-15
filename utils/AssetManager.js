var global = require('../../global');

var AssetManager = function(game) {
    this.game = game;
    this.game.assetManager = this;

    this._init();
};

AssetManager.prototype = {
    constructor: AssetManager,

    _init: function() {
        this._data = {};

        this._autoLoadData = {};
        this._completedLoads = {};
        this._requiredData = {};

        this._currentAssetList = null;
        this._hasFiles = false;
        this._soundsToDecode = null;
        this._isLoadingQueue = false;

        this.onLoadStart = new Phaser.Signal();
        this.onFileStart = new Phaser.Signal();
        this.onFileComplete = new Phaser.Signal();
        this.onLoadComplete = new Phaser.Signal();
        this.onLoadCompleteAndAudioDecoded = new Phaser.Signal();

        this.onBackgroundLoadStart = new Phaser.Signal();
        this.onBackgroundFileStart = new Phaser.Signal();
        this.onBackgroundFileComplete = new Phaser.Signal();
        this.onBackgroundLoadComplete = new Phaser.Signal();
        this.onBackgroundLoadCompleteAndAudioDecoded = new Phaser.Signal();
    },

    setSoundDecodingModifier: function(num) {
        this._soundDecodingModifier = parseInt(num) || 2;
    },

    getSoundDecodingModifier: function() {
        return this._soundDecodingModifier || 4;
    },

    loadText: function(url) {
        var key = this._getAssetKey(url);
        return this.game.load.text(key, global.dataPath + '/' + url);
    },

    loadAtlas: function(url) {
        if (this.game.cache.checkImageKey(url)) {
            return;
        }

        return this.game.load.atlasJSONHash(url, global.spritesheetPath + '/' + url + '.png', global.spritesheetPath + '/' + url + '.json');

    },

    loadImage: function(url) {
        if (this.game.cache.checkImageKey(url)) {
            return;
        }

        var key = this._getAssetKey(url);

        return this.game.load.image(key, global.imgPath + '/' + url);
    },

    loadAudio: function(url, exts, isAudioSprite) {
        var type, path;
        if (this.game.cache.checkSoundKey(url) && this.game.cache.getSound(url).decoded) {
            return;
        }
        // type should be 'sound' or 'sprite' ('fx' and 'music' to be deprecated)
        // default to sound

        if (typeof type === 'undefined') {
            type = 'sound';
        }

        if (exts.indexOf(',') >= 0) {
            exts = exts.split(',');
        }
        if (this.game.device.iOS && exts.indexOf('m4a') === -1) {
            exts.unshift('m4a');
        }
        if (typeof exts === 'object') {
            path = [];
            for (var i = 0; i < exts.length; i++) {
                path.push((isAudioSprite ? global.audioSpritePath : global.soundPath) + '/' + url + '.' + exts[i]);
            }
        } else {
            path = (isAudioSprite ? global.audioSpritePath : global.soundPath) + '/' + type + '/' + url + '.' + exts;
        }

        if (isAudioSprite) {
            this.game.load.audiosprite(url, path, global.audioSpritePath + '/' + url + '.json');
        } else {
            this.game.load.audio(url, path);
        }

        this._soundsToDecode.push({
            url: url,
            isAudioSprite: isAudioSprite
        });
    },

    loadSound: function(url, exts) {
        return this.loadAudio(url, exts, false);
    },

    loadAudioSprite: function(url, exts) {
        return this.loadAudio(url, exts, true);
    },

    _parseAssetList: function(key, list) {

        this._autoLoadData[key] = list.audtoload;
        this._requiredData[key] = list.required;

        this._loadData[key] = [];

        _.each(list.assets, function(asset) {
            this._loadData[key].push(asset);
        }, this);
    },

    _loadAssets: function(id) {
        var assets = this._loadData[id],
            i;

        for (i = 0; i < assets.length; i++) {
            this._loadAsset(assets[i]);
        }
    },

    loadAssets: function(id, background) {
        this._maxPercent = 100;

        this._currentAssetList = id;
        this.game.load.onFileComplete.remove(this._backgroundFileComplete, this);
        this.game.load.onFileComplete.remove(this._gameFileComplete, this);

        this.game.load.reset();
        this._hasFiles = false;
        this._soundsToDecode = [];

        if (typeof this._data === 'undefined') {
            return;
        }

        if (typeof this._data[id] === 'undefined' || this._data[id].length < 1) {
            return console.log('no preload data registered for ', id);
        }

        this._loadAssets(id);

        this._hasFiles = this.game.load._fileList.length > 0;

        if (background) {
            this.game.load.onLoadStart.addOnce(this._backgroundLoadStart, this);
            this.game.load.onFileComplete.add(this._backgroundFileComplete, this);
            this.game.load.onLoadComplete.addOnce(this._backgroundLoadComplete, this);
        } else {
            this.game.load.onLoadStart.addOnce(this._gameLoadStart, this);
            this.game.load.onFileStart.add(this._gameFileStart, this);
            this.game.load.onFileComplete.add(this._gameFileComplete, this);
            this.game.load.onLoadComplete.addOnce(this._gameLoadComplete, this);
        }

        if (!this._hasFiles) {
            this._gameLoadStart();
            this._gameFileComplete(100);
            this._gameLoadComplete();
            return;
        }

        this._numSounds = this._soundsToDecode.length;
        this._soundsDecoded = 0;
        this._maxPercent = 100 - (this._numSounds * this.getSoundDecodingModifier());
        console.log('mp', this._maxPercent);

        return this.game.load.start();
    },

    loadQueue: function() {
        if (this._isLoadingQueue) {
            return;
        }

        if (typeof this._data === 'undefined') {
            return console.log('no preload queue to load');
        }
        var assets;

        for (var state in this._data) {
            if (this._autoLoadData[state]) {

                assets = this._data[state];
                for (var i = 0; i < assets.length; i++) {
                    this._loadAsset(assets[i], true);
                }
            }
        }

        this.game.load.start();
        this._isLoadingQueue = true;
        this.game.load.onLoadStart.addOnce(this._backgroundLoadStart, this);
        this.game.load.onFileComplete.add(this._backgroundFileComplete, this);
        this.game.load.onLoadComplete.addOnce(this._backgroundLoadComplete, this);
    },

    getLoadProgress: function(progress) {
        var adjustedProgress = progress * this._maxPercent / 100;
        return adjustedProgress;
    },

    _backgroundLoadStart: function() {
        this.onBackgroundLoadStart.dispatch();
    },

    _backgroundFileComplete: function(progress, id, fileIndex, totalFiles) {
        this.onBackgroundFileComplete.dispatch(progress, id, fileIndex, totalFiles);
    },

    _backgroundLoadComplete: function() {
        this.game.load.onFileComplete.remove(this._backgroundFileComplete, this);

        this.onBackgroundLoadComplete.dispatch();
        this._checkSoundDecoding(this.onBackgroundLoadCompleteAndAudioDecoded);
    },

    _gameLoadStart: function() {
        this.onLoadStart.dispatch();
    },

    _gameFileStart: function() {
        this.onFileStart.dispatch();
    },

    _gameFileComplete: function(progress, id, fileIndex, totalFiles) {

        this.onFileComplete.dispatch(this.getLoadProgress(progress), id, fileIndex, totalFiles);
    },

    _gameLoadComplete: function() {
        this._completedLoads[this._currentAssetList] = true;
        this.onLoadComplete.dispatch();
        this.game.load.onFileStart.remove(this._gameFileStart, this);
        this.game.load.onFileComplete.remove(this._gameFileComplete, this);

        this._checkSoundDecoding(this.onLoadCompleteAndAudioDecoded);
    },

    allSoundsDecoded: function() {
        //console.log('sounds to decode', this._soundsToDecode.length);
        return this._soundsToDecode.length === 0;
    },

    _checkSoundDecoding: function(eventToDispatch) {
        var sound, i, isAudioSprite;

        if (this._soundsToDecode && this._soundsToDecode.length > 0) {
            for (i = 0; i < this._soundsToDecode.length; i++) {
                isAudioSprite = this._soundsToDecode[i].isAudioSprite;
                sound = this.game.add.sound(this._soundsToDecode[i].url);
                sound.__isAudioSprite = isAudioSprite;
                sound.eventToDispatch = eventToDispatch;
                sound.onDecoded.addOnce(this._onSoundDecoded, this);
            }
        } else {
            eventToDispatch.dispatch();
        }
    },

    _onSoundDecoded: function(sound) {
        var soundIndex = this._soundsToDecode.indexOf(sound.key);
        this._soundsToDecode.splice(soundIndex, 1);

        if (typeof this.game.audioManager !== 'undefined' && typeof this.game.audioManager.addAudio !== 'undefined') {
            if (sound.__isAudioSprite)
                this.game.add.audioSprite(sound.key);

            this.game.audioManager.addAudio(sound.key, sound.__isAudioSprite);
        }
        this._soundsDecoded++;
        this._maxPercent = (100 - (this._numSounds * this.getSoundDecodingModifier())) + (this._soundsDecoded * 2);
        this._gameFileComplete(100);

        if (this._soundsToDecode.length === 0) {
            sound.eventToDispatch.dispatch();
        }
    },

    _getAssetKey: function(fileName) {
        if (typeof fileName === 'undefined' || !fileName)
            return null;
        var ext = fileName.split('.');
        ext.pop();

        return ext.join('');
    },

    _getExtension: function(fileName) {
        return fileName.split('.').pop();
    },

    _loadAsset: function(asset) {
        var type = asset.type,
            url = asset.url || asset.key;

        switch (type) {
            case AssetManager.ASSET_LIST:
                return this._loadAssets(asset.id);
            case AssetManager.SOUND:
                this.loadSound(url, asset.extensions);
                break;
            case AssetManager.AUDIO_SPRITE:
                this.loadAudioSprite(url, asset.extensions);
                break;
            case AssetManager.IMAGE:
                this.loadImage(url);
                break;
            case AssetManager.ATLAS:
                this.loadAtlas(url);
                break;
            case AssetManager.TEXT:
                this.loadText(url, asset.extensions);
                break;
        }
    },

    _parseData: function() {
        var key;

        for (key in this._data) {
            this._parseAssetList(key, this._data[key]);
        }
    },

    setData: function(textFileFromCache) {
        this._data = JSON.parse(textFileFromCache);
        this._loadData = {};
        this._parseData();
    },

    clearAssets: function(id, clearAudio, clearAtlasses, clearImages, clearText) {
        var assets = this._loadData[id];

        console.log('clearing: ', id);

        if (!assets || typeof assets === 'undefined' || assets.length < 1) {
            return console.log('no assets', assets);
        }

        clearAudio = clearAudio !== false;
        clearAtlasses = clearAtlasses !== false;
        clearImages = clearImages !== false;
        clearText = clearText !== false;

        for (var i = 0; i < assets.length; i++) {
            this.clearAsset(assets[i], clearAudio, clearAtlasses, clearImages, clearText);
        }

        this._completedLoads[id] = false;
    },

    clearAsset: function(asset, clearAudio, clearAtlasses, clearImages, clearText) {
        var type = asset.type,
            url = asset.url,
            id = asset.id,
            key = this._getAssetKey(url),
            required = asset.required;

        if (required) {
            console.log('the ' + type + ' asset: ' + url + ' is required and will not be cleared');
            return;
        }
        switch (type) {
            case AssetManager.ASSET_LIST:
                this.clearAssets(id);
                this._completedLoads[id] = false;
                break;
            case AssetManager.AUDIO_SPRITE:
                console.log('removing audio sprite', url);
                this.game.audioManager.removeSprite(url);
                this.game.sounds.removeByKey(url);
                break;
            case AssetManager.SOUND:
                if (clearAudio) {
                    console.log('removing sound', url);
                    this.game.audioManager.removeSound(url);
                    this.game.sound.removeByKey(url);
                }
                break;
            case AssetManager.IMAGE:
                if (clearImages) {
                    this.game.cache.removeImage(key);
                    console.log('removing image', key);
                    PIXI.BaseTextureCache[key].destroy();
                }
                break;
            case AssetManager.ATLAS:
                if (clearAtlasses) {
                    this.game.cache.removeImage(url);
                    console.log('removing atlas', url);
                    PIXI.BaseTextureCache[url].destroy();
                    this.game.cache.removeJSON(url);
                }
                break;
            case AssetManager.TEXT:
                if (clearText) {
                    console.log('removing text', key);
                    this.game.cache.removeText(key);
                }
                break;
        }
    },

    hasLoadedAssets: function(id) {
        return this._completedLoads[id] === true;
    }
};

AssetManager.SOUND = 'sound';
AssetManager.AUDIO_SPRITE = 'audioSprite';
AssetManager.IMAGE = 'image';
AssetManager.ATLAS = 'atlas';
AssetManager.TEXT = 'text';
AssetManager.ASSET_LIST = 'assetList';

module.exports = AssetManager;
