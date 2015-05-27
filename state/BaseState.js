var BaseState = function() {
    Phaser.State.call(this);
};

BaseState.prototype = Object.create(Phaser.State.prototype);
BaseState.prototype.constructor = BaseState;

BaseState.prototype = {
    init: function() {
        Phaser.State.prototype.stateKeys = Object.keys(Phaser.State.prototype);
        this.game.stateHistory.push(this.game.state.current);

        // show preloader
        if (typeof this.game.preloader !== 'undefined')
            this.game.preloader.show();

        // set build sequence interval
        this.buildInterval = 20;
        this.buildSequence = [];
    },

    startBuild: function() {
        if (typeof this.buildSequence === 'undefined' || this.buildSequence.length === 0) {
            this.buildComplete();
            this.afterBuild();
            return;
        }
        this.game.time.events.repeat(this.buildInterval, this.buildSequence.length, this.executeBuildMethod, this);
    },

    executeBuildMethod: function() {
        if (typeof this.buildSequence === 'undefined' || this.buildSequence.length === 0)
            return;

        this.buildSequence.shift().call(this);

        if (this.buildSequence.length === 0) {
            this.buildComplete();
            this.afterBuild();
        }
    },

    buildComplete: function() {
        // hide preloader
    },

    afterBuild: function() {
        if (typeof this.game.preloader !== 'undefined')
            this.game.preloader.hide();
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

        this.removeAudio();
        this.removeStateProps();
    }
};

module.exports = BaseState;
