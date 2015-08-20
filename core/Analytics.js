var Analytics = function (category) {
    if (!category) {
        throw new this.exception('No category defined');
    }

    this.active = (window.ga) ? true : false;
    this.category = category;
};

Analytics.prototype.constructor = Analytics;

Analytics.prototype = {
    trackEvent: function (action, label, value) {
        if (!this.active) {
            return;
        }

        if (!action) {
            throw new this.exception('No action defined');
        }

        if (value) {
            window.ga('send', 'event', this.category, action, label, value);
        }
        else if (label) {
            window.ga('send', 'event', this.category, action, label);
        }
        else {
            window.ga('send', 'event', this.category, action);
        }
    },

    exception: function (message) {
        this.message = message;
        this.name = 'AnalyticsException';
    }

};

module.exports = Analytics;
