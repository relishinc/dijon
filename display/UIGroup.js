var UIGroup = function(game, parent, name, addToStage) {
    this.game = game;
    if (typeof name === 'undefined') {
        name = 'UIGroup';
    }
    Phaser.Group.call(this, game, parent, name, addToStage);

    this.init();
    this.buildInterface();
};

UIGroup.prototype = Object.create(Phaser.Group.prototype);
UIGroup.prototype.constructor = UIGroup;

// public methods
UIGroup.prototype.init = function() {
    // initialize variables
};

UIGroup.prototype.buildInterface = function() {
    // add visual elements
};

module.exports = UIGroup;
