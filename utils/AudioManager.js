var AudioManager = function(game, maxChannels) {
    this.game = game;
    this.game.audioManager = this;

    this.maxChannels = maxChannels || AudioManager.CHANNELS;

    this.init();
};

AudioManager.prototype = {
    constructor: AudioManager,

    init: function() {
        this.fx = {};
        this.sound = {};
        this.fxVolume = 1;
        this.maxFX = 6;
        this.soundVolume = 1;
        this.currentKey = null;
        this.multiChannel = true;
        this.markerLookup = {};

        if (this.multiChannel) {
            this.channels = {};
        }
    },

    addAudio: function(key, audioSprite) {
        //console.log('addAudio', key, audioSprite)
        if (audioSprite === true) {
            return this.addAudioSprite(key);
        }
        return this.addSound(key);
    },

    playAudio: function(marker, volume, loop, forceRestart) {
        console.log(marker, this._getKeyFromMarkerName(marker));
        if (this._getKeyFromMarkerName(marker)) {
            return this.playFXMarker(marker, volume, loop, forceRestart);
        }

        return this.playMusic(marker, volume, loop, forceRestart);
    },

    removeAudio: function(key) {
        if (typeof this.fx !== 'undefined' && typeof this.fx[key] !== 'undefined')
            this.removeFX(key);
        if (typeof this.music !== 'undefined' && typeof this.music[key] !== 'undefined')
            this.removeMusic(key);
    },

    playDelayedAudio: function(delay, marker, volume, loop, forceRestart) {
        if (this._getKeyFromMarkerName(marker)) {
            //delay, marker, volume, loop, forceRestart
            return this.playDelayedFXMarker(delay, marker, volume, loop, forceRestart);
        }
        return this.playDelayedMusic(delay, marker, volume, loop, forceRestart);
    },

    stopAudio: function(marker) {
        if (this._getKeyFromMarkerName(marker)) {
            return this.stopFXMarker(marker);
        }
        return this.stopMusic(marker);
    },

    stopSound: function(marker) {
        if (this._getKeyFromMarkerName(marker)) {
            return this.stopFXMarker(marker);
        }
        return this.stopMusic(marker);
    },

    addSound: function(key) {
        if (typeof this.sound[key] !== 'undefined') {
            return this.sound[key];
        }
        this.sound[key] = this.game.add.audio(key);
        this.sound[key].allowMultiple = true;
        return this.sound[key];
    },

    addAudioSprite: function(key) {
        return this.addFX(key, true);
    },

    addFX: function(key, isAudioSprite) {
        if (typeof this.fx[key] !== 'undefined') {
            return this.fx[key];
        }

        this.fx[key] = this._addAudio(key, isAudioSprite);

        //console.log(this.fx[key])
        /*
        if (this.multiChannel && (!this.channels[key] || this.channels[key].length < AudioManager.CHANNELS)){
            this._populateChannel(key, isAudioSprite);
        }*/

        return this.fx[key];
    },

    _addAudio: function(key, isAudioSprite) {
        if (isAudioSprite === true) {
            return this._parseAudioSprite(key, this.game.add.audioSprite(key));
        } else {
            return this._allowMultiple(this.game.add.sound(key));
        }
    },

    _allowMultiple: function(sound) {
        sound.allowMultiple = true;
        return sound;
    },

    _parseAudioSprite: function(key, audioSprite) {
        for (var soundKey in audioSprite.sounds) {
            this._allowMultiple(audioSprite.sounds[soundKey]);
            this.markerLookup[soundKey] = key;
        }
        return audioSprite;
    },

    _populateChannel: function(key, isAudioSprite) {
        if (!this.channels[key] || typeof this.channels[key] === 'undefined') {
            this.channels[key] = [];
        }
        while (this.channels[key].length < this.maxChannels) {
            this.channels[key].push(this._addAudio(key, isAudioSprite));
        }
    },

    _getChannel: function(key) {
        if (typeof this.channels[key] === 'undefined') {
            return false;
        }
        var isPlaying = true,
            channel = null,
            n = 0;
        while (isPlaying && n < AudioManager.CHANNELS) {
            channel = this.channels[key][n];
            isPlaying = channel.isPlaying;
            n++;
        }
        return channel;
    },

    removeMusic: function(key) {
        if (typeof this.sound === 'undefined' || typeof this.sound[key] === 'undefined') {
            return false;
        }
        if (this.sound[key]) {
            this.stopMusic(key);
            this.sound[key].destroy(true);
            this.sound[key] = null;
            delete this.sound[key];
        }
    },

    removeFX: function(key) {
        if (typeof this.fx === 'undefined' || typeof this.fx[key] === 'undefined') {
            console.log('no fx with key', key);
            return false;
        }
        this.stopFX(key);
        this._destroyAudioSprite(this.fx[key]);
        this.fx[key] = null;
        delete this.fx[key];
    },

    _destroyAudioSprite: function(audioSprite) {
        var keys = Object.keys(audioSprite.sounds);
        while (keys.length > 0) {
            //console.log(audioSprite.sounds[keys.pop()])
            audioSprite.sounds[keys.pop()].destroy(true);
        }
        audioSprite.sounds = {};
    },

    playMusic: function(key, volume, loop, forceRestart) {
        if (typeof this.sound[key] === 'undefined') {
            return false;
        }
        volume = volume || this.soundVolume;
        loop = loop || false;
        forceRestart = forceRestart || true;

        return this.sound[key].play("", 0, volume, loop, forceRestart);
    },

    stopMusic: function(key) {
        if (typeof this.sound === 'undefined' || typeof this.sound[key] === 'undefined') {
            return false;
        }
        return this.sound[key].stop();
    },

    _getKeyFromMarkerName: function(marker) {
        if (typeof this.markerLookup[marker] !== 'undefined') {
            return this.markerLookup[marker];
        }
        for (var key in this.fx) {
            if (typeof this.fx[key].sounds[marker] !== 'undefined') {
                this.markerLookup[marker] = key;
                return key;
            }
        }
        return false;
    },

    playFXMarker: function(marker, volume, loop, forceRestart) {
        var key = this._getKeyFromMarkerName(marker);
        //console.log(marker,'key is', key);
        if (!key) {
            console.log('marker not found', marker);
            return;
        }

        return this.playFX(key, marker, volume, loop, forceRestart);
    },

    playDelayedFXMarker: function(delay, marker, volume, loop, forceRestart) {
        this.game.time.events.add(delay, this.playFXMarker, this, marker, volume, loop, forceRestart);
    },

    playDelayedMusic: function(delay, key, volume, loop, forceRestart) {
        this.game.time.events.add(delay, this.playMusic, this, key, volume, loop, forceRestart);
    },

    stopFXMarker: function(marker) {
        var key = this._getKeyFromMarkerName(marker);
        if (!key) {
            console.log('marker not found', marker);
            return;
        }
        return this.stopFX(key, marker);
    },

    playFX: function(key, marker, volume, loop, forceRestart) {
        if (typeof volume !== 'undefined') {
            if (typeof volume === 'string') {
                if (volume.indexOf('+') >= 0 || volume.indexOf('-') >= 0) {
                    volume = this.fxVolume + parseFloat(volume);
                } else {
                    volume = parseFloat(volume);
                }
            }
        } else {
            volume = this.fxVolume;
        }

        volume = volume || this.fxVolume;

        if (volume > 1) {
            volume = 1;
        }

        loop = loop || false;
        forceRestart = forceRestart === false ? false : true;

        /*if (this.multiChannel){
            return this._getChannel(key).play(marker, volume);
        }*/
        if (!this.game.device.webAudio && this.fx[key].get(marker).isPlaying) {
            this.stopFX(key, null);
        }
        //console.log(this.fx[key].get(marker))
        //return this.fx[key].get(marker).play(marker, null, volume, loop, forceRestart);
        return this.fx[key].play(marker, volume);
    },

    playDelayedFX: function(delay, key, marker, volume, loop, forceRestart) {
        this.game.time.events.add(delay, this.playFX, this, key, marker, volume, loop, forceRestart);
    },

    stopFX: function(key, marker) {
        if (typeof this.fx === 'undefined' || typeof this.fx[key] === 'undefined') {
            return false;
        }
        this.fx[key].stop(marker);
    }
};

AudioManager.CHANNELS = 4;

module.exports = AudioManager;
