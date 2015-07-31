/**
 * Used for saving data to / retrieving data from LocalStorage
 * @param {Phaser.Game} game the Phaser.Game instance
 * @constructor
 */
Dijon.SaveManager = function(game) {
    this.game = game;
    this._init();
};

Dijon.SaveManager.prototype = {
    constructor: Dijon.SaveManager,

    // private methods
    /**
     * checks whether LocalStorage is available
     * @return {void}
     * @private
     */
    _init: function() {
        this._localStorageAvailable = this._getIsLocalStorageAvailable();
        console.log('saving available', this._localStorageAvailable);
    },

    /**
     * converts object to a json string for saving
     * @param  {Object} data the json object to store
     * @return {String}      the stringified json
     * @private
     */
    _getString: function(data) {
        if (typeof data === 'string') {
            return data;
        }

        var jsonData;

        try {
            jsonData = JSON.stringify(data);
        } catch (e) {
            console.log('Could not convert' + data + ' to json');
            return null;
        }

        return jsonData;
    },

    /**
     * gets whether local storage is available
     * @return {Boolean}
     * @private
     */
    _getIsLocalStorageAvailable: function() {
        try {
            return 'localStorage' in window && window['localStorage'] !== null;
        } catch (e) {
            return false;
        }
    },

    // public methods
    /**
     * gets stored data with the specified key
     * @param  {String}  key    the LocalStorage key where the data is stored
     * @param  {Boolean} isJSON is the stored data just a string or is it stringified json (assumes it's JSON)
     * @return {String | Object
}         the retrieved data - if it's a JSON string, we parse the data and return the JSON object
     */
    getData: function(key, isJSON) {
        var data = localStorage.getItem(key);
        if (typeof data === 'undefined') {
            console.log('no data saved with the key', key);
            return null;
        }

        if (isJSON !== false) {
            data = JSON.parse(data);
        }
        return data;
    },

    /**
     * saves data to localstorage
     * @param  {String} key   the LocalStorage key the data will be saved to
     * @param  {String|Object} value the data to save (if it's an object, will be stringified before saving)
     * @return {void}
     */
    saveData: function(key, value) {
        if (!this._localStorageAvailable) {
            console.log('no local storage');
            return false;
        }
        try {
            localStorage.setItem(key, this._getString(value));
        } catch (e) {
            console.log('your data could not be saved');
        }
    },

    /**
     * clear stored data
     * @param  {String} key the LocalStorage key to clear
     * @return {void}
     */
    clearData: function(key) {
        if (!this._localStorageAvailable) {
            console.log('no local storage');
            return false;
        }

        try {
            localStorage.removeItem(key);
        } catch (e) {}

    }
};
