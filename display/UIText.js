/**
 * Wrapper for Phaser.Text exposing the parameters usually required in a separate style object
 * @param {Phaser.Game} game reference to the game instance
 * @param {Number} x the x position
 * @param {Number} y the y position
 * @param {String} text the text to use
 * @param {String} fontName the name of the font family to use
 * @param {int} fontSize the size
 * @param {String} fontColor the hexadecimal font color (any css syntax can be used here)
 * @param {String} [fontAlign = 'left'] alignment of the text
 * @param {Boolean} [wordWrap = false] whether the text wraps at the supplied width
 * @param {Number} [width = 100] the width to wrap at
 * @param {Object} [settings = null] additional settings appended to the style object
 * @constructor
 */
Dijon.UIText = function(game, x, y, text, fontName, fontSize, fontColor, fontAlign, wordWrap, width, lineSpacing, settings) {
    if (typeof fontName === 'undefined') {
        fontName = Dijon.UIText.DEFAULT_FONT;
    }

    if (typeof fontSize === 'undefined') {
        fontSize = Dijon.UIText.DEFAULT_SIZE;
    }

    if (typeof fontColor === 'undefined') {
        fontColor = Dijon.UIText.DEFAULT_COLOR;
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
    this.resolution = this.game.resolution;
    this.updateText();

    this.lineSpacing = lineSpacing || 0;
    this.onAnimationComplete = new Phaser.Signal();
    this.lowercaseText = this.text.toLowerCase();
};

Dijon.UIText.prototype = Object.create(Phaser.Text.prototype);

// private methods
/**
 * starts the text animation
 * @return {void}
 * @private
 */
Dijon.UIText.prototype._startTextAnimation = function() {
    this._canUpdate = true;
    this._repeatTimer = this.game.time.events.repeat(this._letterTime * 100, this._textLength, this._updateTextAnimation, this);
};

/**
 * updates the text animation
 * called at each repeatTimer step
 * dispatches the onAnimationComplete signal if it's the last step
 * @return {void}
 * @private
 */
Dijon.UIText.prototype._updateTextAnimation = function() {
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
/**
 * sets the color of the entire text
 * @param {String} color css color string (such as "#ff0000")
 * @return {Dijon.UIText.highlightPhrase} calls the highlightPhrase method and "highlights" the entire text string
 */
Dijon.UIText.prototype.setColor = function(color) {
    return this.highlightPhrase(this.text, color, false);
};

/**
 * resets the color to the original fill color
 * @return {Dijon.UIText.highlightPhrase} calls the highlightPhrase method and "highlights" the entire text string
 */
Dijon.UIText.prototype.resetColor = function() {
    return this.highlightPhrase(this.text, this.style.fill, false);
};

/**
 * changes the colour of a portion of the text
 * @param  {String} phrase        the phrase within the text to change
 * @param  {String} color         css color string (such as "#ff0000")
 * @param  {Boolean} [caseSensitive = false] whether the search for the phrase within this text should be case sensitive
 * @return {void}
 */
Dijon.UIText.prototype.highlightPhrase = function(phrase, color, caseSensitive) {
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

/**
 * animates the text in by revealing each character in sequence
 * @param  {Number} [letterTime = 0.1]  the time (in seconds) between each character
 * @param  {int} [delay = 0]            the delay before starting the animation
 */
Dijon.UIText.prototype.animate = function(letterTime, delay) {
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

Dijon.UIText.prototype.setText = function(text) {
    Phaser.Text.prototype.setText.call(this, text);
    this.lowercaseText = this.text.toLowerCase();
    if (this.game) {
        this.resolution = this.game.resolution;
        this.updateText();
    }
};

/**
 * stops the text animation and clears the timers
 * @return {void}
 */
Dijon.UIText.prototype.stopAnimating = function() {
    this._canUpdate = false;
    this._textToAnimate = null;
    this.game.time.events.remove(this._delayTimer);
    this.game.time.events.remove(this._repeatTimer);
};


/**
 * rounds the position
 * @return {void}
 */

Dijon.UIText.prototype.roundPixel = function() {
    this.position.set(Math.round(this.x), Math.round(this.y));
};

Object.defineProperty(Dijon.UIText.prototype, 'width', {
    get: function() {
        if (this.dirty) {
            this.updateText();
            this.dirty = false;
        }

        return this.scale.x * this.texture.frame.width / this.resolution;
    },
    set: function(value) {
        this.scale.x = value / this.texture.frame.width / this.resolution;
    }
});

Object.defineProperty(Dijon.UIText.prototype, 'height', {
    get: function() {
        if (this.dirty) {
            this.updateText();
            this.dirty = false;
        }
        return this.scale.y * this.texture.frame.height / this.resolution;
    },
    set: function(value) {
        this.scale.y = value / this.texture.frame.height / this.resolution;
    }
});

Dijon.UIText.prototype.updateText = function() {

    this.texture.baseTexture.resolution = this.resolution;

    this.context.font = this.style.font;

    var outputText = this.text;

    if (this.style.wordWrap) {
        outputText = this.runWordWrap(this.text);
    }

    //split text into lines
    var lines = outputText.split(/(?:\r\n|\r|\n)/);

    //calculate text width
    var lineWidths = [];
    var maxLineWidth = 0;
    var fontProperties = this.determineFontProperties(this.style.font);

    for (var i = 0; i < lines.length; i++) {
        var lineWidth = this.context.measureText(lines[i]).width + this.padding.x;
        lineWidths[i] = lineWidth;
        maxLineWidth = Math.max(maxLineWidth, lineWidth);
    }

    var width = maxLineWidth + this.style.strokeThickness;

    this.canvas.width = width * this.resolution + (Dijon.UIText.GLOBAL_PADDING_X * 2);

    //calculate text height
    var lineHeight = fontProperties.fontSize + this.style.strokeThickness + this.padding.y;
    var height = lineHeight * lines.length;
    var lineSpacing = this._lineSpacing;

    if (lineSpacing < 0 && Math.abs(lineSpacing) > lineHeight) {
        lineSpacing = -lineHeight;
    }

    //  Adjust for line spacing
    if (lineSpacing !== 0) {
        var diff = lineSpacing * (lines.length - 1);
        height += diff;
    }

    this.canvas.height = height * this.resolution + (Dijon.UIText.GLOBAL_PADDING_Y * 2);

    this.context.scale(this.resolution, this.resolution);

    if (navigator.isCocoonJS) {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    if (this.style.backgroundColor) {
        this.context.fillStyle = this.style.backgroundColor;
        this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    this.context.fillStyle = this.style.fill;
    this.context.font = this.style.font;
    this.context.strokeStyle = this.style.stroke;
    this.context.textBaseline = 'alphabetic';
    this.context.shadowOffsetX = this.style.shadowOffsetX;
    this.context.shadowOffsetY = this.style.shadowOffsetY;
    this.context.shadowColor = this.style.shadowColor;
    this.context.shadowBlur = this.style.shadowBlur;
    this.context.lineWidth = this.style.strokeThickness;
    this.context.lineCap = 'round';
    this.context.lineJoin = 'round';

    var linePositionX;
    var linePositionY;

    this._charCount = 0;

    //  Draw text line by line
    for (i = 0; i < lines.length; i++) {
        linePositionX = this.style.strokeThickness / 2 + Dijon.UIText.GLOBAL_PADDING_X;
        linePositionY = (this.style.strokeThickness / 2 + i * lineHeight) + fontProperties.ascent;

        if (i > 0) {
            linePositionY += (lineSpacing * i);
        }

        if (this.style.align === 'right') {
            linePositionX += maxLineWidth - lineWidths[i];
        } else if (this.style.align === 'center') {
            linePositionX += (maxLineWidth - lineWidths[i]) / 2;
        }

        if (this.colors.length > 0) {
            this.updateLine(lines[i], linePositionX, linePositionY);
        } else {
            if (this.style.stroke && this.style.strokeThickness) {
                this.context.strokeText(lines[i], linePositionX, linePositionY);
            }

            if (this.style.fill) {
                this.context.fillText(lines[i], linePositionX, linePositionY);
            }
        }

    }

    this.updateTexture();
};


/**
 * Updates texture size based on canvas size
 *
 * @private
 */
Dijon.UIText.prototype.updateTexture = function() {
    this.texture.baseTexture.resolution = this.resolution;

    this.texture.baseTexture.width = this.canvas.width;
    this.texture.baseTexture.height = this.canvas.height;

    this.texture.crop.width = this.texture.frame.width = this.canvas.width;
    this.texture.crop.height = this.texture.frame.height = this.canvas.height;

    this._width = this.canvas.width / this.resolution;
    this._height = this.canvas.height / this.resolution;

    // update the dirty base textures
    this.texture.baseTexture.dirty();
    this.dirty = false;
};

Dijon.UIText.prototype.getBounds = function(matrix) {
    if (this.dirty) {
        this.updateText();
    }
    var width = this._width;
    var height = this._height;

    var w0 = width * (1 - this.anchor.x);
    var w1 = width * -this.anchor.x;

    var h0 = height * (1 - this.anchor.y);
    var h1 = height * -this.anchor.y;

    var worldTransform = matrix || this.worldTransform;

    var a = worldTransform.a;
    var b = worldTransform.b;
    var c = worldTransform.c;
    var d = worldTransform.d;
    var tx = worldTransform.tx;
    var ty = worldTransform.ty;

    var maxX = -Infinity;
    var maxY = -Infinity;

    var minX = Infinity;
    var minY = Infinity;

    if (b === 0 && c === 0) {
        // scale may be negative!
        if (a < 0) a *= -1;
        if (d < 0) d *= -1;

        // this means there is no rotation going on right? RIGHT?
        // if thats the case then we can avoid checking the bound values! yay
        minX = a * w1 + tx;
        maxX = a * w0 + tx;
        minY = d * h1 + ty;
        maxY = d * h0 + ty;
    } else {
        var x1 = a * w1 + c * h1 + tx;
        var y1 = d * h1 + b * w1 + ty;

        var x2 = a * w0 + c * h1 + tx;
        var y2 = d * h1 + b * w0 + ty;

        var x3 = a * w0 + c * h0 + tx;
        var y3 = d * h0 + b * w0 + ty;

        var x4 = a * w1 + c * h0 + tx;
        var y4 = d * h0 + b * w1 + ty;

        minX = x1 < minX ? x1 : minX;
        minX = x2 < minX ? x2 : minX;
        minX = x3 < minX ? x3 : minX;
        minX = x4 < minX ? x4 : minX;

        minY = y1 < minY ? y1 : minY;
        minY = y2 < minY ? y2 : minY;
        minY = y3 < minY ? y3 : minY;
        minY = y4 < minY ? y4 : minY;

        maxX = x1 > maxX ? x1 : maxX;
        maxX = x2 > maxX ? x2 : maxX;
        maxX = x3 > maxX ? x3 : maxX;
        maxX = x4 > maxX ? x4 : maxX;

        maxY = y1 > maxY ? y1 : maxY;
        maxY = y2 > maxY ? y2 : maxY;
        maxY = y3 > maxY ? y3 : maxY;
        maxY = y4 > maxY ? y4 : maxY;
    }

    var bounds = this._bounds;

    bounds.x = minX;
    bounds.width = maxX - minX;

    bounds.y = minY;
    bounds.height = maxY - minY;

    // store a reference so that if this function gets called again in the render cycle we do not have to recalculate
    this._currentBounds = bounds;

    return bounds;
};

Dijon.UIText.prototype.setShadow = function(x, y, color, blur, shadowStroke, shadowFill) {
    var divisor = this.game.resolution == 1 ? 2 : this.game.resolution;

    if (x === undefined) {
        x = 0;
    }
    if (y === undefined) {
        y = 0;
    }
    if (color === undefined) {
        color = 'rgba(0, 0, 0, 1)';
    }
    if (blur === undefined) {
        blur = 0;
    }
    if (shadowStroke === undefined) {
        shadowStroke = true;
    }
    if (shadowFill === undefined) {
        shadowFill = true;
    }



    x = x / divisor;
    y = y / divisor;
    blur = blur / divisor;

    this.style.shadowOffsetX = x;
    this.style.shadowOffsetY = y;
    this.style.shadowColor = color;
    this.style.shadowBlur = blur;
    this.style.shadowStroke = shadowStroke;
    this.style.shadowFill = shadowFill;
    this.dirty = true;

    return this;
};


// STATIC VARIABLES
/**
 * the default font to use
 * @type {String}
 * @static
 */
Dijon.UIText.DEFAULT_FONT = 'Helvetica Neue, Arial';

/**
 * the default text size
 * @type {Number}
 * @static
 */
Dijon.UIText.DEFAULT_SIZE = 12;

/**
 * the default text colour
 * @type {String}
 */
Dijon.UIText.DEFAULT_COLOR = '#000000';

Dijon.UIText.prototype.constructor = Dijon.UIText;

// Phaser addons
Phaser.GameObjectCreator.prototype.uiText = function(x, y, text, fontName, fontSize, color, align, wordWrap, width, lineSpacing, settings) {
    return new Dijon.UIText(this.game, x, y, text, fontName, fontSize, color, align, wordWrap, width, lineSpacing, settings);
};

Phaser.GameObjectFactory.prototype.uiText = function(x, y, text, fontName, fontSize, color, align, wordWrap, width, lineSpacing, settings, group) {
    if (typeof group === 'undefined') {
        group = this.world;
    }
    return group.add(new Dijon.UIText(this.game, x, y, text, fontName, fontSize, color, align, wordWrap, width, lineSpacing, settings));
};

Dijon.UIText.GLOBAL_PADDING_X = 0;
Dijon.UIText.GLOBAL_PADDING_Y = 0;
