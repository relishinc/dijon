var BaseState = function() {
    Phaser.State.call(this);
};

BaseState.prototype = Object.create(Phaser.State.prototype);
BaseState.prototype.constructor = BaseState;

BaseState.prototype = {
    // Phaser.State overrides

    init: function() {
        Phaser.State.prototype.stateKeys = Object.keys(Phaser.State.prototype);
        this.game.stateHistory.push(this.game.state.current);

        if (typeof this.game.preloader !== 'undefined' && ((this.getPreloadID() && !this.game.assetManager.hasLoadedAssets(this.getPreloadID())) || (this.getBuildSequence().length > 0 && this.getBuildInterval() > 0)))
            this.game.preloader.show();
    },

    preload: function() {
        if (this.getPreloadID())
            this.game.assetManager.loadAssets(this.getPreloadID());
    },

    getPreloadID: function() {
        return null;
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

        if (this.game.debugger) {
            this.game.debugger.selectedObject = null;
            this.game.debugger.refresh();
        }
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

        if (sequenceInterval === 0) {
            while (sequence.length > 0)
                this._executeSequenceMethod(sequence, sequenceCallback, sequenceCallbackContext);
            return;
        }
        if (typeof this.game.__stateBuildInterval !== 'undefined')
            this.game.time.events.remove(this.game.__stateBuildInterval);

        this.game.__stateBuildInterval = this.game.time.events.repeat(sequenceInterval, sequence.length, this._executeSequenceMethod, this, sequence, sequenceCallback, sequenceCallbackContext);
        /*var self = this;
        this.sequenceTimer = setInterval(function() {
            self._executeSequenceMethod(sequence, sequenceCallback, sequenceCallbackContext)
        }, sequenceInterval);
*/
    },

    _executeSequenceMethod: function(sequence, callback, callbackContext) {
        sequence.shift().call(this);

        if (sequence.length === 0 && callback && callbackContext) {
            clearInterval(this.sequenceTimer);
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
        this.afterBuildInterface();
        this.startBuild();

    },

    shutdown: function() {
        this._removeAudio();
        this._removeStateProps();
    },

    // private methods

    _removeAudio: function() {
        var sound;
        if (typeof this._audio !== 'undefined') {
            while (this._audio.length > 0) {
                sound = this._audio.shift();
                if (typeof sound !== 'undefined' && sound != null && typeof sound.stop !== 'undefined') {
                    if (typeof sound.onStop !== 'undefined') {
                        sound.onStop.removeAll();
                    }
                    sound.stop();
                }
            }
        }
    },

    _removeStateProps: function() {
        var keys = Object.keys(this),
            defaults = Array.prototype.slice.call(Object.keys(Phaser.State.prototype)),
            key,
            index;

        while (defaults.length > 0) {
            key = defaults.shift();
            index = keys.indexOf(key);
            if (index >= 0) {
                keys.splice(index, 1);
            }
        }

        while (keys.length > 0) {
            key = keys.pop();
            this[key] = null;
            delete this[key];
        }
    },

    // public methods

    buildInterface: function() {
        // called after all sounds are loaded and decoded
    },

    afterBuildInterface: function() {
        // called after buildInterface is called
    },

    addAudio: function(track) {
        if (typeof this.audio === 'undefined') {
            this._audio = [];
        }
        this._audio.push(track);
        return track;
    },

    reset: function() {
        this.game.model.reset();
    },

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
    }
};

module.exports = BaseState;
