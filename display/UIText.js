/**
 *
 * @param game
 * @param x
 * @param y
 * @param text
 * @param fontName
 * @param fontSize
 * @param fontColor
 * @param fontAlign alignment of the text (default:'left')
 * @param wordWrap whether the text wraps at the supplied width (default:false)
 * @param width the width to wrap at (default:100)
 * @param autoAdd whether the object is added to the game world (default:true)
 * @param settings additional settings appended to the style object
 * @constructor
 */
var UIText = function(game, x, y, text, fontName, fontSize, fontColor, fontAlign, wordWrap, width, lineSpacing, autoAdd, settings) {
    if (typeof fontName === 'undefined') {
        fontName = UIText.DEFAULT_FONT;
    }

    if (typeof fontSize === 'undefined') {
        fontSize = UIText.DEFAULT_SIZE;
    }

    if (typeof fontColor === 'undefined') {
        fontColor = UIText.DEFAULT_COLOR;
    }

    if (typeof fontAlign === 'undefined') {
        fontAlign = 'left';
    }

    if (typeof width === 'undefined') {
        width = 100;
    }

    var style = {
        font: fontSize + 'px ' + fontName,
        fill: fontColor,
        align: fontAlign,
        wordWrap: wordWrap || false,
        wordWrapWidth: width
    };

    if (typeof settings !== 'undefined') {
        for (var prop in settings) {
            if (settings.hasOwnProperty(prop)) {
                style[prop] = settings[prop];
            }
        }
    }

    text.replace(/'/g, "\'");

    Phaser.Text.call(this, game, x, y, text, style);

    this.lineSpacing = lineSpacing || 0;
    this.onAnimationComplete = new Phaser.Signal();
    this.lowercaseText = this.text.toLowerCase();

    if (autoAdd !== false) {
        game.add.existing(this);
    }
};

UIText.prototype = Object.create(Phaser.Text.prototype);
UIText.prototype.constructor = UIText;

// private methods
UIText.prototype._startTextAnimation = function() {
    this._canUpdate = true;
    this._repeatTimer = this.game.time.events.repeat(this._letterTime * 100, this._textLength, this._updateTextAnimation, this);
};

UIText.prototype._updateTextAnimation = function() {
    if (!this._canUpdate || !this._textToAnimate) {
        return false;
    }
    var index = this._textLength - this._textToAnimate.length;
    this.addColor(this.style.fill, index);
    this.addColor('rgba(0,0,0,0)', index + 1);
    this._textToAnimate.shift();

    if (this._textToAnimate.length === 0) {
        this.onAnimationComplete.dispatch();
    }
};

// public methods
UIText.prototype.setColor = function(color) {
    return this.highlightPhrase(this.text, color, false);
};

UIText.prototype.resetColor = function() {
    return this.highlightPhrase(this.text, this.style.fill, false);
};

UIText.prototype.highlightPhrase = function(phrase, color, caseSensitive) {
    caseSensitive = caseSensitive === true;

    var text = caseSensitive ? this.text : this.lowercaseText;

    phrase = caseSensitive ? phrase : phrase.toLowerCase();

    var len = phrase.length;

    var startIndex = text.indexOf(phrase);
    var endIndex = startIndex + len;

    while (startIndex <= endIndex) {
        this.addColor(color, startIndex);
        startIndex++;
    }

    this.addColor(this.style.fill, endIndex);
};

UIText.prototype.animate = function(letterTime, delay) {
    this.game.time.events.remove(this._delayTimer);
    this.game.time.events.remove(this._repeatTimer);

    if (typeof _letterTime === 'undefined') {
        letterTime = 0.1;
    }
    if (typeof delay === 'undefined' || isNaN(delay)) {
        delay = 0;
    }
    this._letterTime = letterTime;

    this._textLength = this.text.length;
    this._textToAnimate = this.text.split('');

    var startIndex = 0;
    var endIndex = this._textLength;

    while (startIndex <= endIndex) {
        this.addColor('rgba(0,0,0,0)', startIndex);
        startIndex++;
    }

    this._delayTimer = this.game.time.events.add(delay * Phaser.Timer.SECOND, this._startTextAnimation, this);
};

UIText.prototype.stopAnimating = function() {
    this._canUpdate = false;
    this._textToAnimate = null;
    this.game.time.events.remove(this._delayTimer);
    this.game.time.events.remove(this._repeatTimer);
};

// STATIC VARIABLES
UIText.DEFAULT_FONT = 'Helvetica Neue, Arial';
UIText.DEFAULT_SIZE = 12;
UIText.DEFAULT_COLOR = '#ffffff';

module.exports = UIText;
