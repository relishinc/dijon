var BaseState = function() {
    Phaser.State.call(this);
};

BaseState.prototype = Object.create(Phaser.State.prototype);
BaseState.prototype.constructor = BaseState;

BaseState.prototype = {

    init: function() {
        Phaser.State.prototype.stateKeys = Object.keys(Phaser.State.prototype);
        this.game.stateHistory.push(this.game.state.current);

        this.sequenceTimer = this.game.time.create(false);
        // show preloader if there's a build sequence and a preloader
        if (typeof this.game.preloader !== 'undefined' && this.getBuildSequence().length > 0)
            this.game.preloader.show();
    },

    getBuildInterval: function() {
        return 20;
    },

    getBuildSequence: function() {
        return [];
    },

    startBuild: function() {
        this.runSequence(this.getBuildSequence(), this._initialSequenceComplete, this);
    },

    afterBuild: function() {
        if (typeof this.game.preloader !== 'undefined')
            this.game.preloader.hide();
    },

    runSequence: function(sequenceToBuild, callback, callbackContext, interval) {
        var sequence = sequenceToBuild,
            sequenceCallback = callback || null,
            sequenceCallbackContext = callbackContext || this,
            sequenceInterval = typeof interval === 'undefined' ? this.getBuildInterval() : interval;

        if (sequence.length === 0) {
            callback.call(callbackContext);
            return;
        }

        this.sequenceTimer.repeat(sequenceInterval, sequence.length, this._executeSequenceMethod, this, sequence, sequenceCallback, sequenceCallbackContext);
        this.sequenceTimer.start();
    },

    _executeSequenceMethod: function(sequence, callback, callbackContext) {
        sequence.shift().call(this);

        if (sequence.length === 0 && callback && callbackContext) {
            callback.call(callbackContext);
        }
    },

    _initialSequenceComplete: function() {
        this.afterBuild();
    },

    create: function() {
        if (!this.game.assetManager.allSoundsDecoded()) {
            this.game.assetManager.onLoadCompleteAndAudioDecoded.addOnce(this.create, this);
            return;
        }

        this.buildInterface();

        this.startBuild();

        this.afterBuildInterface();

        if (this.autoHidePreloader && typeof this.game.preloader !== 'undefined') {
            this.game.preloader.hide();
        }

        if (this.game.debugger) {
            this.game.debugger.selectedObject = null;
            this.game.debugger.refresh();
        }
    },

    buildInterface: function() {

    },

    afterBuildInterface: function() {

    },

    addAudio: function(track) {
        if (typeof this.audio === 'undefined') {
            this.audio = [];
        }
        this.audio.push(track);
        return track;
    },

    update: function() {

    },

    render: function() {

    },

    reset: function() {
        this.game.model.reset();
    },

    // game state stuff
    // ------------------------
    lastState: function(clearWorld, clearCache) {
        if (typeof clearWorld === 'undefined') {
            clearWorld = false;
        }
        if (typeof clearCache === 'undefined') {
            clearCache = false;
        }

        return this.game.state.start(this.getLastState(), clearWorld, clearCache);
    },

    getLastState: function() {
        return this.game.getLastState();
    },

    goBack: function() {
        this.lastState();
    },

    removeAudio: function() {
        var sound;
        if (typeof this.audio !== 'undefined') {
            while (this.audio.length > 0) {
                sound = this.audio.shift();
                if (typeof sound !== 'undefined' && sound != null && typeof sound.stop !== 'undefined') {
                    if (typeof sound.onStop !== 'undefined') {
                        sound.onStop.removeAll();
                    }
                    sound.stop();
                }
            }
        }
    },

    removeStateProps: function() {
        var keys = Object.keys(this);
        var defaults = Array.prototype.slice.call(Object.keys(Phaser.State.prototype));
        var key, index, n;

        while (defaults.length > 0) {
            key = defaults.shift();
            index = keys.indexOf(key);
            if (index >= 0) {
                keys.splice(index, 1);
            }
        }

        n = keys.length;
        while (n >= 0) {
            this[keys[n]] = null;
            delete this[keys[n]];
            n--;
        }
    },

    shutdown: function() {
        if (typeof this.game.popupManager !== 'undefined') {
            this.game.popupManager.removeAllPopups();
        }

        if (typeof this.sequenceTimer !== 'undefined')
            this.sequenceTimer.removeAll();

        this.removeAudio();


        this.removeStateProps();
    }
};

module.exports = BaseState;
