/**
 * generic mediator class for communication between the Model and View
 * @param {Phaser.Game} game          reference to the current Phaser.Game instance
 * @param {String} mediatorName  the name of this mediator
 * @param {Object} viewComponent the view component this mediator will control
 * @param {Class} [modelClass = undefined] model class, will instantiate the class if provided
 * @param {Boolean} [autoReg = true]       whether to auto register the mediator using its name (this.game[mediatorName] = mediatorName)
 * @constructor
 */
Dijon.BaseMediator = function(game, mediatorName, viewComponent, modelClass, autoReg) {
    this.game = game;
    this.name = mediatorName;
    this._mediatorName = mediatorName;

    if (autoReg !== false)
        this.game[mediatorName] = this;

    if (viewComponent && typeof viewComponent !== 'undefined') {
        this.setViewComponent(viewComponent);
    }

    if (modelClass && typeof modelClass !== 'undefined') {
        this._createModel(modelClass);
    }
};

// private methods
/**
 * creates a model class - calls the [setModel method]{@link Dijon.BaseMediator#setModel}
 * @param  {Class} ModelClass the model to create
 */
Dijon.BaseMediator.prototype._createModel = function(ModelClass) {
    this.setModel(new ModelClass(this.game));
};

/**
 * adds a signal by name
 * @param {String} signalName the name of the signal to add
 */
Dijon.BaseMediator.prototype._addSignal = function(signalName) {
    this[signalName] = new Phaser.Signal();
};

// public methods
/**
 * creates a signal for each argument passed
 */
Dijon.BaseMediator.prototype.createSignals = function() {
    _.each(arguments, this._addSignal, this);
};

/**
 * sets the view component of this mediator
 * called from the constructor, but may need to be called again, as the mediator may persist, but the view component may not
 * @param {Object} viewComponent the view component to be used by this mediator
 */
Dijon.BaseMediator.prototype.setViewComponent = function(viewComponent) {
    this.viewComponent = viewComponent;
};

/**
 * sets a model to communicate with
 * @param {Object} model the model this mediator will communicate with
 */
Dijon.BaseMediator.prototype.setModel = function(model) {
    this._model = model;
};

/**
 * interfaces with the game's [copy model]{@link CopyModel} and wraps the [CopyModel getCopy method]{@link CopyModel#getCopy}
 * @param  {String} group the id of the group
 * @param  {String} id    the id of the item in the group
 * @return {String}       the copy
 */
Dijon.BaseMediator.prototype.getCopy = function(group, id) {
    if (typeof this.game.copy !== 'undefined')
        return this.game.copy.getCopy(group, id);
};

/**
 * releases the mediator from the game and the view component
 */
Dijon.BaseMediator.prototype.release = function() {
    if (typeof this.viewComponent.mediator === 'undefined') {
        this.viewComponent.mediator = null;
        delete this.viewComponent.mediator;
    }

    this.game[this.mediatorName] = null;
    delete this.game[this.mediatorName];
};

Dijon.BaseMediator.prototype.constructor = Dijon.BaseMediator;
