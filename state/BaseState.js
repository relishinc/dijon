var BaseState = function () {
    Phaser.State.call(this);
};

BaseState.prototype = Object.create(Phaser.State.prototype);
BaseState.prototype.constructor = BaseState;

BaseState.prototype = {
    init: function () {
        this.autoHidePreloader = true;
        Phaser.State.prototype.stateKeys = Object.keys(Phaser.State.prototype);
        this.game.stateHistory.push(this.game.state.current);
    },

    create: function () {
        if (!this.game.assetManager.allSoundsDecoded()){
            this.game.assetManager.onLoadCompleteAndAudioDecoded.addOnce(this.create, this);
            return;
        }

        if (!this.game.model.isEnding && this.game.state.current !== 'boot' && this.game.state.current !== 'preload' && this.game.state.current !== 'menu' && this.game.state.current !== 'intro'){
            this.game.hud.enableButtons();
        }

        this.buildInterface();

        if (this.autoHidePreloader){
            this.game.preloader.hide();
        }
    },

    buildInterface: function(){

    },

    addAudio: function(track){
        if (typeof this.audio === 'undefined'){
            this.audio = [];
        }
        this.audio.push(track);
        return track;
    },

    update: function () {

    },

    render: function () {
        if (this.game.showFPS){
            this.game.fpsText.setText(this.game.time.fps.toString() || '--');
        }
    },

    reset: function() {
        this.game.hud.reset();
        this.game.model.reset();
    },

    // game state stuff
    // ------------------------
    lastState: function (clearWorld, clearCache) {
        if (typeof clearWorld === 'undefined') {
            clearWorld = false;
        }
        if (typeof clearCache === 'undefined') {
            clearCache = false;
        }

        return this.game.state.start(this.getLastState(), clearWorld, clearCache);
    },

    getLastState: function () {
        return this.game.getLastState();
    },

    goBack: function () {
        this.lastState();
    },

    removeAudio: function(){
        var sound;
        if (typeof this.audio !== 'undefined'){
            while (this.audio.length > 0){
                sound = this.audio.shift();
                if (typeof sound !== 'undefined' && sound != null && typeof sound.stop !== 'undefined'){
                    sound.stop();
                }
            }
        }
    },

    removeStateProps: function(){
        var keys = Object.keys(this);
        var defaults = Array.prototype.slice.call(Object.keys(Phaser.State.prototype));
        var key, index, n;

        while(defaults.length > 0){
            key = defaults.shift();
            index = keys.indexOf(key);
            if (index >= 0){
                keys.splice(index, 1);
            }
        }

        n = keys.length;
        while(n >= 0){
            this[keys[n]] = null;
            delete this[keys[n]];
            n --;
        }
    },

    shutdown: function(){
        this.game.popupManager.removeAllPopups();
        this.removeAudio();
        this.removeStateProps();
    }
};

module.exports = BaseState;
