var global = require('../../global');

var AssetManager = function(game) {
    this.game = game;
    this.game.assetManager = this;
    this.init();
};

AssetManager.prototype = {
    constructor: AssetManager,

    init: function() {
        this._xml = null;
        this._data = {};

        this._autoLoadData = {};
        this._requiredData = {};

        this._currentState = null;
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

    loadText: function(url, ext) {
        if (typeof ext === 'undefined' || ext == null) {
            ext = 'xml';
        }

        return this.game.load.text(url, global.dataPath + '/' + url + '.' + ext);
    },

    loadAtlas: function(url) {
        if (this.game.cache.checkImageKey(url)) {
            return;
        }

        return this.game.load.atlasXML(url, global.spritesheetPath + '/' + url + '.png', global.spritesheetPath + '/' + url + '.xml');
    },

    loadImage: function(url, ext) {
        if (this.game.cache.checkImageKey(url)) {
            return;
        }
        if (typeof ext === 'undefined' || ext == null) {
            ext = 'jpg';
        }

        return this.game.load.image(url, global.imgPath + '/' + url + '.' + ext);
    },

    loadAudio: function(url, type, exts, isAudioSprite) {
        if (this.game.cache.checkSoundKey(url) && this.game.cache.getSound(url).decoded) {
            return;
        }
        var path;
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
                path.push(global.audioPath + '/' + type + '/' + url + '.' + exts[i]);
            }
        } else {
            path = global.audioPath + '/' + type + '/' + url + '.' + exts;
        }

        if (isAudioSprite) {
            this.game.load.audiosprite(url, path, global.audioPath + '/' + type + '/' + url + '.json');
        } else {
            this.game.load.audio(url, path);
        }

        this._soundsToDecode.push({
            url: url,
            isAudioSprite: isAudioSprite
        });
    },

    loadBitmapFont: function(url) {
        this.game.load.bitmapFont(url, global.fontPath + '/' + url + '.png', global.fontPath + '/' + url + '.fnt');
    },

    setStateData: function(xml) {
        var parser = new DOMParser();
        this._xml = parser.parseFromString(xml, "application/xml");
        this._parseStateData();
    },

    _parseStateData: function() {
        var states = this._xml.querySelectorAll('states state');
        _.each(states, this._parseStateNode, this);
    },

    _parseStateNode: function(state) {
        var stateName, assets;

        stateName = state.getAttribute('id');

        this._autoLoadData[stateName] = state.getAttribute('autoload') !== "false";
        this._requiredData[stateName] = state.getAttribute('required') === "true";
        this._data[stateName] = [];

        assets = state.querySelectorAll('asset');

        _.each(assets, function(asset) {
            this._data[stateName].push(asset);
        }, this);
    },

    _addStateAssets: function(state) {
        var assets = this._data[state];

        for (var i = 0; i < assets.length; i++) {
            this._loadAsset(assets[i]);
        }
    },

    loadState: function(state, background) {
        this._currentState = state;
        this.game.load.onFileComplete.remove(this._backgroundFileComplete, this);
        this.game.load.onFileComplete.remove(this._gameFileComplete, this);

        this.game.load.reset();
        this._hasFiles = false;
        this._soundsToDecode = [];

        if (typeof this._data === 'undefined') {
            return;
        }

        if (typeof this._data[state] === 'undefined' || this._data[state].length < 1) {
            return console.log('no preload data registered for ', state);
        }

        this._addStateAssets(state);

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
            return this._gameLoadComplete();
        }

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

    getLoadProgress: function() {
        return this.game.load.progress;
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

        this.onFileComplete.dispatch(progress, id, fileIndex, totalFiles);
    },

    _gameLoadComplete: function() {
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

        if (this._soundsToDecode.length === 0) {
            sound.eventToDispatch.dispatch();
        }
    },

    _loadAsset: function(asset) {
        var type, url, extension, extensions, audioType, audioSprite;
        type = asset.getAttribute('type');
        url = asset.getAttribute('key');
        extension = asset.getAttribute('extension') || null;

        switch (type) {
            case AssetManager.STATE:
                return this._addStateAssets(url);
            case AssetManager.AUDIO:
                extensions = asset.getAttribute('extensions');
                audioType = asset.getAttribute('audioType');
                audioSprite = asset.getAttribute('sprite') === 'true';

                this.loadAudio(url, audioType, extensions, audioSprite);
                break;
            case AssetManager.IMAGE:
                this.loadImage(url, extension);
                break;
            case AssetManager.ATLAS:
                this.loadAtlas(url);
                break;
            case AssetManager.TEXT:
                this.loadText(url, extension);
                break;
        }
    },

    clearState: function(state, clearAudio, clearAtlasses, clearImages, clearText) {
        var assets = this._data[state];

        console.log('clearing: ', state);

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
    },

    clearAsset: function(asset, clearAudio, clearAtlasses, clearImages, clearText) {
        var type, url, required;
        type = asset.getAttribute('type');
        url = asset.getAttribute('key');
        required = asset.getAttribute('required') === "true";
        if (required) {
            console.log('the ' + type + ' asset: ' + url + ' is required and will not be cleared');
            return;
        }
        console.log('clearing: ', url);
        switch (type) {
            case AssetManager.AUDIO:
                if (clearAudio) {
                    this.game.cache.removeSound(url);
                }
                break;
            case AssetManager.IMAGE:
                if (clearImages) {
                    this.game.cache.removeImage(url);
                    PIXI.BaseTextureCache[url].destroy();
                }
                break;
            case AssetManager.ATLAS:
                if (clearAtlasses) {
                    this.game.cache.removeImage(url);
                    PIXI.BaseTextureCache[url].destroy();
                    this.game.cache.removeXML(url);
                }
                break;
            case AssetManager.TEXT:
                if (clearText) {
                    AssetManager.removeText(url);
                }
                break;
        }
    }
};

AssetManager.AUDIO = 'audio';
AssetManager.IMAGE = 'image';
AssetManager.ATLAS = 'atlas';
AssetManager.TEXT = 'text';
AssetManager.STATE = 'state';

module.exports = AssetManager;
