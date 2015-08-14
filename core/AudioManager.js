/**
 * Manager for playing all sounds in the game (wraps Phaser.SoundManager)
 * @param {Phaser.Game} game reference to the Phaser.Game object
 * @constructor
 */
Dijon.AudioManager = function(game) {
    this.game = game;
    this._init();
};

Dijon.AudioManager.prototype = {
    constructor: Dijon.AudioManager,

    // private methods
    _init: function() {
        this._defaultVolume = 1;
        this._sprites = {};
        this._sounds = {};

        this._markerLookup = {};
    },

    _addAudio: function(key, isAudioSprite) {
        if (isAudioSprite === true) {
            return this._parseAudioSprite(key, this.game.add.audioSprite(key));
        } else {
            return this._allowMultiple(this.game.add.sound(key));
        }
    },

    _parseAudioSprite: function(key, audioSprite) {
        for (var soundKey in audioSprite.sounds) {
            this._allowMultiple(audioSprite.sounds[soundKey]);
            this._markerLookup[soundKey] = key;
        }
        return audioSprite;
    },

    _allowMultiple: function(sound) {
        sound.allowMultiple = true;
        return sound;
    },

    _getKeyFromMarkerName: function(marker) {
        if (typeof this._markerLookup[marker] !== 'undefined') {
            return this._markerLookup[marker];
        }
        for (var key in this._sprites) {
            if (typeof this._sprites[key].sounds[marker] !== 'undefined') {
                this._markerLookup[marker] = key;
                return key;
            }
        }
        return false;
    },

    _playSpriteMarker: function(key, marker, volume, loop, forceRestart) {
        if (typeof volume !== 'undefined') {
            if (typeof volume === 'string') {
                if (volume.indexOf('+') >= 0 || volume.indexOf('-') >= 0) {
                    volume = this._defaultVolume + parseFloat(volume);
                } else {
                    volume = parseFloat(volume);
                }
            }
        } else {
            volume = this._defaultVolume;
        }

        loop = loop || false;
        forceRestart = forceRestart === false ? false : true;

        return this._sprites[key].play(marker, volume);
    },

    _stopSpriteMarker: function(key, marker) {
        if (typeof this._sprites === 'undefined' || typeof this._sprites[key] === 'undefined') {
            return false;
        }
        this._sprites[key].stop(marker);
    },

    _stopSound: function() {
        this.stop();
    },

    // public methods
    /**
     * Sets the default volume for all sounds (used in the case where a volume is not supplied to the playAudio, playSound, or playSpriteMarker methods)
     * @param {Number} vol the default volume to use
     */
    setDefaultVolume: function(vol) {
        this._defaultVolume = vol;
    },

    /**
     * adds audio to the lookup (called by AssetManager when any sound is loaded, usually not necessary to call from a game)
     * @param {String} key         the Phaser.Cache key of the audio asset
     * @param {Boolean} isAudioSprite whether the asset is an audio sprite
     */
    addAudio: function(key, isAudioSprite) {
        if (isAudioSprite === true) {
            return this.addAudioSprite(key);
        }
        return this.addSound(key);
    },

    /**
     * adds a single sound to the lookup (usually not necessary to call from a game)
     * @param {String} key the Phaser.Cache key of the asset
     * @return {Phaser.Sound} the added sound
     */
    addSound: function(key) {
        if (typeof this._sounds[key] !== 'undefined') {
            return this._sounds[key];
        }
        this._sounds[key] = this.game.add.audio(key);
        this._sounds[key].allowMultiple = true;
        return this._sounds[key];
    },

    /**
     * adds an audio sprite to the lookup (usually not necessary to call from a game)
     * @param {String} key the Phaser.Cache key of the asset
     * @return {Phaser.AudioSprite} the added audio sprite
     */
    addAudioSprite: function(key) {
        if (typeof this._sprites[key] !== 'undefined') {
            return this._sprites[key];
        }
        this._sprites[key] = this._addAudio(key, true);

        return this._sprites[key];
    },

    /**
     * a global method to play a sound - will check audio sprite markers for the provided key first, then single sounds
     * @param  {String} marker       the sound marker (or key) to check for
     * @param  {Number} volume       the volume at which to play the sound
     * @param  {Boolean} loop         whether the sound should loop (won't work if it's a sprite marker, and "loop" hasn't been set in the audio sprite descriptor file)
     * @param  {Boolean} forceRestart whether to restart the sound if it's already playing
     * @return {Phaser.Sound}              the playing sound
     */
    playAudio: function(marker, volume, loop, forceRestart) {
        if (this._getKeyFromMarkerName(marker)) {
            return this.playSpriteMarker(marker, volume, loop, forceRestart);
        }

        return this.playSound(marker, volume, loop, forceRestart);
    },

    /**
     * calls Dijon.AudioManager.playAudio on a delay
     * @param  {int} delay        number of milliseconds to delay the sound
     * @param  {String} marker       the sound marker (or key) to check for
     * @param  {Number} volume       the volume at which to play the sound
     * @param  {Boolean} loop         whether the sound should loop (won't work if it's a sprite marker, and "loop" hasn't been set in the audio sprite descriptor file)
     * @param  {Boolean} forceRestart whether to restart the sound if it's already playing
     */
    playDelayedAudio: function(delay, marker, volume, loop, forceRestart) {
        if (this._getKeyFromMarkerName(marker)) {
            return this.playDelayedSpriteMarker(delay, marker, volume, loop, forceRestart);
        }
        return this.playDelayedSound(delay, marker, volume, loop, forceRestart);
    },

    /**
     * plays a single sound
     * @param  {String} key          the Phaser.Cache key for the sound
     * @param  {Number} volume       the volume at which to play the sound
     * @param  {Boolean} loop         whether the sound should loop (won't work if it's a sprite marker, and "loop" hasn't been set in the audio sprite descriptor file)
     * @param  {Boolean} forceRestart whether to restart the sound if it's already playing
     * @return {Phaser.Sound} the playing sound
     */
    playSound: function(key, volume, loop, forceRestart) {
        if (typeof this._sounds[key] === 'undefined') {
            return false;
        }
        volume = typeof volume === 'undefined' ? this._defaultVolume : volume;
        loop = loop || false;
        forceRestart = forceRestart || true;

        return this._sounds[key].play("", 0, volume, loop, forceRestart);
    },

    /**
     * plays a marker from an audio sprite
     * @param  {String} marker       the marker to check for (will check all audio sprites)
     * @param  {Number} volume       the volume at which to play the sound
     * @param  {Boolean} loop         whether the sound should loop (won't work if it's a sprite marker, and "loop" hasn't been set in the audio sprite descriptor file)
     * @param  {Boolean} forceRestart whether to restart the sound if it's already playing
     * @return {Phaser.Sound} the playing sound
     */
    playSpriteMarker: function(marker, volume, loop, forceRestart) {
        var key = this._getKeyFromMarkerName(marker);
        if (!key) {
            console.log('marker not found', marker);
            return;
        }

        return this._playSpriteMarker(key, marker, volume, loop, forceRestart);
    },

    playDelayedSound: function(delay, key, volume, loop, forceRestart) {
        this.game.time.events.add(delay, this.playSound, this, key, volume, loop, forceRestart);
    },

    playDelayedSpriteMarker: function(delay, marker, volume, loop, forceRestart) {
        this.game.time.events.add(delay, this.playSpriteMarker, this, marker, volume, loop, forceRestart);
    },


    /**
     * stops any playing audio file with the given marker
     * checks audio sprites first, then single sounds
     * @return {Phaser.Sound} the sound that was stopped
     */
    stopAudio: function(marker) {
        if (this._getKeyFromMarkerName(marker)) {
            return this.stopSpriteMarker(marker);
        }
        return this.stopSound(marker);
    },

    /**
     * stops a single sound from playing
     * @return {Phaser.Sound} the sound that was stopped
     */
    stopSound: function(key) {
        if (typeof this._sounds === 'undefined' || typeof this._sounds[key] === 'undefined') {
            return false;
        }
        return this._sounds[key].stop();
    },

    /**
     * stops a single sound from playing
     * @return {Phaser.Sound} the sound that was stopped
     */
    stopSpriteMarker: function(marker) {
        var key = this._getKeyFromMarkerName(marker);
        if (!key) {
            console.log('marker not found', marker);
            return;
        }
        return this._stopSpriteMarker(key, marker);
    },

    /**
     * stops removes a sound from Dijon.AudioManager's lookup
     * @param  {String} key the key of the sound to be removed
     * @return {void}
     */
    removeSound: function(key) {
        if (typeof this._sounds === 'undefined' || typeof this._sounds[key] === 'undefined') {
            return false;
        }
        if (this._sounds[key]) {
            this.stopSound(key);
            this._sounds[key].destroy();
            delete this._sounds[key];
        }
    },

    /**
     * stops removes an audio sprite from Dijon.AudioManager's lookup
     * @param  {String} key the key of the sound to be removed
     * @return {void}
     */
    removeSprite: function(key) {
        if (typeof this._sprites === 'undefined' || typeof this._sprites[key] === 'undefined') {
            return false;
        }
        this.stopSpriteMarker(key);
        this._sprites[key] = null;
        delete this._sprites[key];
    },

    fade: function(sound, volume, time, stop) {
        if (!sound)
            return;

        if (sound.fadeTween && sound.fadeTween)
            this.game.tweens.remove(sound.fadeTween);

        sound.fadeTween = this.game.add.tween(sound).to({
            volume: volume
        }, time || 300, Phaser.Easing.Linear.None);

        if (stop === true)
            sound.fadeTween.onComplete.addOnce(this._stopSound, sound);

        sound.fadeTween.start();
    }

};
