/**
 * Manager for loading and clearing assets
 * @param {Phaser.Game} game reference to the Phaser.Game object
 * @constructor
 */
Dijon.AssetManager = function(game) {
    this.game = game;
    this._init();
};

Dijon.AssetManager.prototype = {
    constructor: Dijon.AssetManager,

    // private methods
    /**
     * adds internal variables and signals
     * @return {void}
     * @private
     */
    _init: function() {
        this._data = {};

        this._assetPath = null;
        this._dataPath = null;
        this._spriteSheetPath = null;
        this._imgPath = null;
        this._fontPath = null;
        this._audioSpritePath = null;
        this._soundPath = null;

        this._autoLoadData = {};
        this._completedLoads = {};
        this._requiredData = {};

        this._currentAssetList = null;
        this._hasFiles = false;
        this._soundsToDecode = [];
        this._isLoadingQueue = false;
        this._maxPercent = 100;

        this._numSounds = 0;
        this._soundsDecoded = 0;

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

        this.setBaseURL();
        this.setPaths();

        this.setResolution();
    },

    /**
     * parses an asset list by key (usually from data/assets.json) and stores them internally
     * @param  {String} key the id of the list
     * @param  {Array}  list the json array of assets
     * @return {void}
     * @private
     */
    _parseAssetList: function(key, list) {
        this._autoLoadData[key] = list.audtoload;
        this._requiredData[key] = list.required;

        this._loadData[key] = [];

        _.each(list.assets, function(asset) {
            this._loadData[key].push(asset);
        }, this);
    },

    /**
     * adds assets from a list to the load list
     * @param  {String} id id of the list to add
     * @return {void}
     * @private
     */
    _loadAssets: function(id) {
        var assets = this._loadData[id],
            i;

        for (i = 0; i < assets.length; i++) {
            this._loadAsset(assets[i]);
        }
    },

    /**
     * start the background loading
     * @return {void}
     * @private
     */
    _backgroundLoadStart: function() {
        this.onBackgroundLoadStart.dispatch();
    },

    /**
     * when a file completes in an background load queue - dispatches the onBackgroundFileComplete signal
     * @param  {Number} progress   the percent progress
     * @param  {String} id         the file id
     * @param  {int}    fileIndex  the index of the file in the list
     * @param  {int}    totalFiles the total number of files in the list
     * @return {void}
     * @private
     */
    _backgroundFileComplete: function(progress, id, fileIndex, totalFiles) {
        this.onBackgroundFileComplete.dispatch(progress, id, fileIndex, totalFiles);
    },

    /**
     * when the background load completes - dispatches the onBackgroundLoadComplete signal, starts checking for decoded sounds
     * @return {void}
     * @private
     */
    _backgroundLoadComplete: function() {
        this.game.load.onFileComplete.remove(this._backgroundFileComplete, this);

        this.onBackgroundLoadComplete.dispatch();
        this._checkSoundDecoding(this.onBackgroundLoadCompleteAndAudioDecoded);
    },

    /**
     * when the asset list starts loading, dispatches the onLoadStart signal
     * @return {void}
     */
    _gameLoadStart: function() {
        this.onLoadStart.dispatch();
    },

    /**
     * when a file starts loading - dispatches the onFileStart signal
     * @return {void}
     */
    _gameFileStart: function() {
        this.onFileStart.dispatch();
    },

    /**
     * when a file completes in the game load - dispatches the onFileComplete signal
     * @param  {Number} progress   the percent progress
     * @param  {String} id         the file id
     * @param  {int}    fileIndex  the index of the file in the list
     * @param  {int}    totalFiles the total number of files in the list
     * @return {void}
     * @private
     */
    _gameFileComplete: function(progress, id, fileIndex, totalFiles) {
        this.onFileComplete.dispatch(this.getLoadProgress(progress), id, fileIndex, totalFiles);
    },

    /**
     * when the background load completes - dispatches the onLoadComplete signal, starts checking for decoded sounds
     * @return {void}
     * @private
     */
    _gameLoadComplete: function() {
        this._completedLoads[this._currentAssetList] = true;
        this.onLoadComplete.dispatch();
        this.game.load.onFileStart.remove(this._gameFileStart, this);
        this.game.load.onFileComplete.remove(this._gameFileComplete, this);

        this._checkSoundDecoding(this.onLoadCompleteAndAudioDecoded);
    },

    /**
     * checks if all the sounds in the queue are decoded
     * @param  {Phaser.Signal} eventToDispatch the signal to be dispatched when all sounds are decoded
     * @return {void}
     * @private
     */
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

    /**
     * when a sound is decoded, this method removes it from the _soundsToDecode array, and increases the overall percentage loaded
     * @param  {Phaser.Sound} sound the sound being decoded
     * @return {void}
     * @private
     */
    _onSoundDecoded: function(sound) {
        var soundIndex = this._soundsToDecode.indexOf(sound.key);
        this._soundsToDecode.splice(soundIndex, 1);

        if (typeof this.game.audio !== 'undefined' && typeof this.game.audio.addAudio !== 'undefined') {
            if (sound.__isAudioSprite)
                this.game.add.audioSprite(sound.key);

            this.game.audio.addAudio(sound.key, sound.__isAudioSprite);
        }

        this._soundsDecoded++;
        this._maxPercent = (100 - (this._numSounds * this.getSoundDecodingModifier())) + (this._soundsDecoded * this.getSoundDecodingModifier());
        this._gameFileComplete(100);

        if (this._soundsToDecode.length === 0) {
            sound.eventToDispatch.dispatch();
        }
    },

    /**
     * shortcut to get an asset key using a file name (strips its extension)
     * @param  {String} fileName the url of the file
     * @return {Stirng}          the asset key (the filename with its extension stripped)
     * @private
     */
    _getAssetKey: function(fileName) {
        var ext = fileName.split('.');
        ext.pop();

        return ext.join('');
    },

    /**
     * gets the extension of a given file
     * @param  {String} fileName
     * @return {String}          the extension
     * @private
     */
    _getExtension: function(fileName) {
        return fileName.split('.').pop();
    },

    /**
     * determines what kind of asset we're dealing with and adds it to the load queue
     * @param  {Object} asset the asset object we're going to load
     * @return {void}
     * @private
     */
    _loadAsset: function(asset) {
        var type = asset.type,
            url = asset.url || asset.key;

        switch (type) {
            case Dijon.AssetManager.ASSET_LIST:
                return this._loadAssets(asset.id);
            case Dijon.AssetManager.SOUND:
                this.loadSound(url, asset.extensions);
                break;
            case Dijon.AssetManager.AUDIO_SPRITE:
                this.loadAudioSprite(url, asset.extensions);
                break;
            case Dijon.AssetManager.IMAGE:
                this.loadImage(url);
                break;
            case Dijon.AssetManager.ATLAS:
                this.loadAtlas(url);
                break;
            case Dijon.AssetManager.TEXT:
                this.loadText(url, asset.extensions);
                break;
        }
    },

    /**
     * parses the data from the external assets file (normally data/assets.json)
     * @return {void}
     * @private
     */
    _parseData: function() {
        var key;

        for (key in this._data) {
            this._parseAssetList(key, this._data[key]);
        }
    },

    setBaseURL: function(baseURL) {
        if (typeof baseURL === 'undefined')
            baseURL = '';

        // ensure trailing slash
        if (baseURL !== '' && baseURL.charAt(baseURL.length - 1) !== '/')
            baseURL += '/';

        this._baseURL = baseURL;
        this.setPaths();
    },

    // public methods
    /**
     * sets the paths where the Dijon.AssetManager will look for different files
     * @param {Object} pathObj an object containing locations for different file types (should have the following properties: assetPath, dataPath, spritesheetPath, imgPath, fontPath, audioSpritePath, soundPath)
     * @return {void}
     */
    setPaths: function(pathObj) {
        if (typeof pathObj === 'undefined')
            pathObj = {};

        // prepend baseURL
        this._assetPath = this._baseURL + (pathObj.assetPath || 'assets');
        this._dataPath = this._baseURL + (pathObj.dataPath || 'assets/data');
        this._spriteSheetPath = this._baseURL + (pathObj.spritesheetPath || 'assets/img/spritesheets');
        this._imgPath = this._baseURL + (pathObj.imgPath || 'assets/img');
        this._fontPath = this._baseURL + (pathObj.fontPath || 'assets/fonts');
        this._audioSpritePath = this._baseURL + (pathObj.audioSpritePath || 'assets/audio/sprite');
        this._soundPath = this._baseURL + (pathObj.soundPath || 'assets/audio/sound');
    },

    setResolution: function(res) {
        if (typeof res === 'undefined')
            res = this.game.resolution;

        this._resolution = '';
        // leave this out for now
        /*
        if (res > 1.5) {
            this._resolution = Dijon.AssetManager.RESOLUTION_2X;
        }*/
    },

    /**
     * sets the percentage of the load we should allot to each sound
     * @param {Number} [num = 2] the percentage
     */
    setSoundDecodingModifier: function(num) {
        this._soundDecodingModifier = parseInt(num) || 2;
    },

    /**
     * gets the percentage of the load we should allot to each sound
     */
    getSoundDecodingModifier: function() {
        return this._soundDecodingModifier || 2;
    },

    /**
     * loads any text file
     * @param  {String} url of the file to load (prepends the dataPath)
     * @return {Phaser.Loader.text}     adds the file to the load queue
     */
    loadText: function(url) {
        var key = this._getAssetKey(url);
        return this.game.load.text(key, this._dataPath + '/' + url);
    },

    /**
     * loads a texture atlas
     * @param  {String} url url of the texture atlas (prepends the spritesheetPath)
     * @return {Phaser.Loader.atlasJSONHash}     adds the atlas and it's json descriptor file to the load queue
     */
    loadAtlas: function(url) {
        if (this.game.cache.checkImageKey(url)) {
            return;
        }

        return this.game.load.atlasJSONHash(url, this._spriteSheetPath + '/' + url + this._resolution + '.png', this._spriteSheetPath + '/' + url + this._resolution + '.json');

    },

    /**
     * loads any image file
     * @param  {String} url the full image url, with extension (prepends the imgPath)
     * @return {Phaser.Loader.image} adds the image file to the load queue
     */
    loadImage: function(url, standalone) {
        var key = this._getAssetKey(url),
            loader = standalone === true ? new Phaser.Loader(this.game) : this.game.load;

        if (this.game.cache.checkImageKey(key)) {
            // if the image key already exists, don't reload the image and return the key
            return key;
        }
        url = key + this._resolution + '.' + this._getExtension(url);

        return loader.image(key, this._imgPath + '/' + url);
    },
    /**
     * loads a bitmap font
     * @param  {String} url the url of the bitmap font (prepends the fontPath)
     * @return {Phaser.Loader.bitmapFont}     adds the bitmap font and its xml descriptor to the load queue
     */
    loadBitmapFont: function(url) {
        this.game.load.bitmapFont(url, this._fontPath + '/' + url + '.png', this._fontPath + '/' + url + '.fnt');
    },

    /**
     * loads any audio file (adds the 'm4a' file extension if we're on an iOS device as it decodes way faster)
     * @param  {String}  url           the url of the audio file (prepends either the audioSpritePath or the soundPath depending on the type of file)
     * @param  {String}  exts          comma separated string of file extensions (usually "ogg,mp3")
     * @param  {Boolean} isAudioSprite whether the asset is an audio sprite
     * @return {Phaser.Loader.audiosprite|Phaser.Loader.audio}                adds the audioSprite or audio file to the file queue
     */
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
                path.push((isAudioSprite ? this._audioSpritePath : this._soundPath) + '/' + url + '.' + exts[i]);
            }
        } else {
            path = (isAudioSprite ? this._audioSpritePath : this._soundPath) + '/' + type + '/' + url + '.' + exts;
        }

        if (isAudioSprite) {
            this.game.load.audiosprite(url, path, this._audioSpritePath + '/' + url + '.json');
        } else {
            this.game.load.audio(url, path);
        }

        this._soundsToDecode.push({
            url: url,
            isAudioSprite: isAudioSprite
        });
    },

    /**
     * loads a sound file
     * @param  {String} url  the url to the sound file (prepends soundPath)
     * @param  {String} exts comma separated list of extensions (usually "ogg,mp3")
     * @return {Dijon.AssetManager.loadAudio}
     */
    loadSound: function(url, exts) {
        return this.loadAudio(url, exts, false);
    },

    /**
     * loads a sound file
     * @param  {String} url  the url to the audioSprite file (prepends audioSpritePath)
     * @param  {String} exts comma separated list of extensions (usually "ogg,mp3")
     * @return {Dijon.AssetManager.loadAudio}
     */
    loadAudioSprite: function(url, exts) {
        return this.loadAudio(url, exts, true);
    },

    /**
     * loads an entire list of assets
     * @param  {String} id         the id of the asset list to load
     * @param  {Boolean} background whether this is a background load
     * @return {Phaser.Loader.start}            starts the load
     */
    loadAssets: function(id, background) {
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

    /**
     * gets the (adjusted) load progress (also takes into accound the number of sounds to decode)
     * @param  {Number} progress the game progress
     * @return {Number}          the adjusted progress
     */
    getLoadProgress: function(progress) {
        var adjustedProgress = progress * this._maxPercent / 100;
        return adjustedProgress;
    },

    /**
     * checks whether all the sounds in the queue are decoded
     * @return {Boolean}
     */
    allSoundsDecoded: function() {
        //console.log('sounds to decode', this._soundsToDecode.length);
        return this._soundsToDecode.length === 0;
    },


    /**
     * sets the data for the Dijon.AssetManager to use as a reference (usually from data/assets.json)
     * triggers the _parseData internal method, which stores the asset list for later use
     * @param {String} textFileFromCache the id of the file in the Phaser.Cache
     */
    setData: function(textFileFromCache) {
        this._data = JSON.parse(textFileFromCache);
        this._loadData = {};
        this._parseData();
    },

    /**
     * clears the assets from a particular id in the storage
     * @param  {String} id            the id of the asset list to clear
     * @param  {Boolean} [clearAudio = true]    whether to clear audio files
     * @param  {Boolean} [clearAtlasses = true] whether to clear texture atlasses
     * @param  {Boolean} [clearImages = true]   whether to clear images
     * @param  {Boolean} [clearText = true]     whether to clear text files
     * @return {void}
     */
    clearAssets: function(id, clearAudio, clearAtlasses, clearImages, clearText) {
        var assets = this._data[id];

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

    /**
     * clears an asset from the game's memory
     * @param  {Object} asset         the asset to clear
     * @param  {Boolean} [clearAudio = true]    whether to clear audio files
     * @param  {Boolean} [clearAtlasses = true] whether to clear texture atlasses
     * @param  {Boolean} [clearImages = true]   whether to clear images
     * @param  {Boolean} [clearText = true]     whether to clear text files
     * @return {void}
     */
    clearAsset: function(asset, clearAudio, clearAtlasses, clearImages, clearText) {
        var type = asset.type,
            url = asset.key,
            required = asset.required;

        if (required) {
            console.log('the ' + type + ' asset: ' + url + ' is required and will not be cleared');
            return;
        }
        switch (type) {
            case Dijon.AssetManager.AUDIO:
                if (clearAudio) {
                    this.game.sound.removeByKey(url);
                    this.game.cache.removeSound(url);
                }
                break;
            case Dijon.AssetManager.IMAGE:
                if (clearImages) {
                    this.game.cache.removeImage(url);
                    PIXI.BaseTextureCache[url].destroy();
                }
                break;
            case Dijon.AssetManager.ATLAS:
                if (clearAtlasses) {
                    this.game.cache.removeImage(url);
                    PIXI.BaseTextureCache[url].destroy();
                    this.game.cache.removeXML(url);
                }
                break;
            case Dijon.AssetManager.TEXT:
                if (clearText) {
                    Dijon.AssetManager.removeText(url);
                }
                break;
        }
    },

    /**
     * checks if the assets from this list id are already loaded
     * @param  {String}  id the asset list id to check
     * @return {Boolean}    whether it has been loaded already
     */
    hasLoadedAssets: function(id) {
        return this._completedLoads[id] === true;
    }
};

/**
 * @type {String}
 * @static
 */
Dijon.AssetManager.SOUND = 'sound';

/**
 * @type {String}
 * @static
 */
Dijon.AssetManager.AUDIO_SPRITE = 'audioSprite';

/**
 * @type {String}
 * @static
 */
Dijon.AssetManager.IMAGE = 'image';

/**
 * @type {String}
 * @static
 */
Dijon.AssetManager.ATLAS = 'atlas';

/**
 * @type {String}
 * @static
 */
Dijon.AssetManager.TEXT = 'text';

/**
 * @type {String}
 * @static
 */
Dijon.AssetManager.ASSET_LIST = 'assetList';

Dijon.AssetManager.RESOLUTION_2X = "@2x";
Dijon.AssetManager.RESOLUTION_3X = "@3x";
