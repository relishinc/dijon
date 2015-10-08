/** @module Dijon */

/**
 * Dijon Library
 * Relish's core library for PhaserJS games
 */

/**
 * Game Managers
 * Similar to Phaser's own manager classes, we initialize and attach them to the global "game" to be used throughout
 */


/**
 * Initialize the library and attach to the global scope
 */
var Dijon = window.Dijon = Dijon || {};

/**
 * Initialize the library's core classes and attach them to the global Dijon object
 */

require('./core/AssetManager');
require('./core/AudioManager');
require('./core/TransitionManager');
require('./core/SequenceManager');
require('./core/SaveManager');

// state
require('./state/BaseState');

// model
require('./model/Model');
require('./model/CopyModel');

// mediator
require('./mediator/BaseMediator');

// component
require('./component/BaseComponent');

// display classes
// require Dijon Display classes here, as they contain addons to Phaser.GameobjectFactory and Phaser.GameObjectCreator - this way we don't need to require them every time we want to use them
require('./display/UISprite');
require('./display/UIGroup');
require('./display/UIText');

// buttons
require('./display/button/TextButton');
require('./display/button/InvisibleButton');

/**
 * Boot up the library and initialize the manager classes
 * @param  {Phaser.Game} game the global Phaser.Game instance
 * @return {void}
 */
Dijon.boot = function(game) {
    game.asset = new Dijon.AssetManager(game);
    game.audio = new Dijon.AudioManager(game);
    game.transition = new Dijon.TransitionManager(game);
    game.sequence = new Dijon.SequenceManager(game);

    Dijon.addUtilityMethods(game);
};
/**
 * _addUtilityMethods adds methods to disable and enable world input
 * @param {Phaser.Game} game the global Phaser.Game instance
 */
Dijon.addUtilityMethods = function(game) {
    game.onWorldInputDisabled = new Phaser.Signal();
    game.onWorldInputEnabled = new Phaser.Signal();

    game.disableElementInput = function(el) {
        if (el.input && el.input.enabled === true) {
            el.wasEnabled = true;
            el.input.enabled = false;
        }
        if (el.children.length > 0) {
            for (var i = 0; i < el.children.length; i++) {
                this.disableElementInput(el.children[i]);
            }
        }
    };

    game.enableElementInput = function(el) {
        if (el.input && el.input.enabled === false && el.wasEnabled) {
            el.wasEnabled = false;
            el.input.enabled = true;
        }
        if (el.children.length > 0) {
            for (var i = 0; i < el.children.length; i++) {
                this.enableElementInput(el.children[i]);
            }
        }
    };

    game.disableInput = function(group) {
        return group.forEach(function(el) {
            if (el instanceof Phaser.Group) {
                return this.disableInput(el);
            } else {
                return this.disableElementInput(el);
            }
        }, this);
    };

    game.disableWorldInput = function() {
        this.disableInput(this.world);
        this.onWorldInputDisabled.dispatch();
    };

    game.enableInput = function(group) {
        return group.forEach(function(el) {
            if (el instanceof Phaser.Group) {
                return this.enableInput(el);
            } else {
                return this.enableElementInput(el);
            }
        }, this);
    };

    game.enableWorldInput = function() {
        this.enableInput(this.world);
        this.onWorldInputEnabled.dispatch();
    };
};

Dijon.setPixelRatio = function(ratio) {
    Dijon.RATIO = ratio;
};


// additional Phaser GameObjectFactory / GameObjectCreator addons
Phaser.GameObjectFactory.prototype.spriteButton = function(x, y, key, framePrefix, callback, callbackContext, group) {
    return this.game.add.button(x, y, key, callback, callbackContext, framePrefix + '/over', framePrefix + '/up', framePrefix + '/down', framePrefix + '/up', group);
};


/**
 * Centers the pivot point
 */
PIXI.DisplayObject.prototype.centerPivot = function(roundPixel) {
    if (roundPixel === true)
        this.pivot.set(Math.round(this.width >> 1), Math.round(this.height >> 1));
    else
        this.pivot.set(this.width >> 1, this.height >> 1);

};

/**
 * Sets the location of the pivot point
 * @param {String} pivotLocation one of 'center', 'r', 'l', 't', 'b', 'tl', 'tr', 'bl', 'br'
 */
PIXI.DisplayObject.prototype.setPivot = function(pivotLocation, roundPixel) {
    switch (pivotLocation.toLowerCase()) {
        case 'center':
            this.centerPivot(roundPixel === true);
            break;
        case 'r':
            this.pivot.set(this.width, this.height >> 1);
            break;
        case 'l':
            this.pivot.set(0, this.height >> 1);
            break;
        case 't':
            this.pivot.set(this.width >> 1, 0);
            break;
        case 'b':
            this.pivot.set(this.width >> 1, this.height);
            break;
        case 'tl':
            this.pivot.set(0, 0);
            break;
        case 'tr':
            this.pivot.set(this.width, 0);
            break;
        case 'bl':
            this.pivot.set(0, this.height);
            break;
        case 'br':
            this.pivot.set(this.width, this.height);
            break;
    }

    if (roundPixel === true)
        this.pivot.set(Math.round(this.pivot.x), Math.round(this.pivot.y));
};


/**
 * addOverSound adds a hover sound to any displayObject
 * @param {String} marker the sound marker to play
 * @param {Number} volume the volume of the sound
 */
PIXI.DisplayObject.prototype.addOverSound = function(marker, volume) {
    if (!this.inputEnabled)
        this.inputEnabled = true;

    this.overSoundMarker = marker;
    this.overSoundVolume = volume;

    this.events.onInputOver.add(this.playOverSound, this);
};

/**
 * addOutSound adds a over sound to any displayObject
 * @param {String} marker the sound marker to play
 * @param {Number} volume the volume of the sound
 */
PIXI.DisplayObject.prototype.addOutSound = function(marker, volume) {
    if (!this.inputEnabled)
        this.inputEnabled = true;

    this.outSoundMarker = marker;
    this.outSoundVolume = volume;

    this.events.onInputOut.add(this.playOutSound, this);
};

/**
 * addDownSound adds a down sound to any displayObject
 * @param {String} marker the sound marker to play
 * @param {Number} volume the volume of the sound
 */
PIXI.DisplayObject.prototype.addDownSound = function(marker, volume) {
    if (!this.inputEnabled)
        this.inputEnabled = true;

    this.downSoundMarker = marker;
    this.downSoundVolume = volume;

    this.events.onInputDown.add(this.playDownSound, this);
};

/**
 * playOverSound plays the over sound
 * @return {void}
 */
PIXI.DisplayObject.prototype.playOverSound = function() {
    if (this.overSound && this.overSound.isPlaying) {
        this.overSound.stop();
    }
    if (this.outSound && this.outSound.isPlaying) {
        this.outSound.stop();
    }
    this.overSound = this.game.audio.playAudio(this.overSoundMarker, this.overSoundVolume);
};

/**
 * playOutSound plays the out sound
 * @return {void}
 */
PIXI.DisplayObject.prototype.playOutSound = function() {
    this.stopSounds();
    this.outSound = this.game.audio.playAudio(this.outSoundMarker, this.outSoundVolume);
};

/**
 * playDownSound plays the down sound
 * @return {void}
 */
PIXI.DisplayObject.prototype.playDownSound = function() {
    this.stopSounds();
    this.downSound = this.game.audio.playAudio(this.downSoundMarker, this.downSoundVolume);
};

/**
 * stopSounds stops the over, out and down sounds
 * @return {void}
 */
PIXI.DisplayObject.prototype.stopSounds = function() {
    if (this.overSound && this.overSound.isPlaying) {
        this.overSound.stop();
    }
    if (this.outSound && this.outSound.isPlaying) {
        this.outSound.stop();
    }
    if (this.downSound && this.downSound.isPlaying) {
        this.downSound.stop();
    }
};

Object.defineProperty(PIXI.DisplayObject.prototype, "scales", {
    get: function() {
        return this.scale.x;
    },

    set: function(value) {
        this.scale.set(value, value);
    }
});

PIXI.DisplayObject.prototype.roundPixel = function() {
    this.position.set(Math.round(this.x), Math.round(this.y));
};

Phaser.SoundManager.prototype.setTouchLock = function() {
    if (this.game.device.iOSVersion > 8) {
        this.game.input.touch.addTouchLockCallback(this.unlock, this, true);
    } else {
        this.game.input.touch.addTouchLockCallback(this.unlock, this);
    }
    this.touchLocked = true;
};

module.exports = Dijon;
