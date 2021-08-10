const _ = require('lodash');

module.exports = {
    // Converts an array of objects from Ghost API responses to a comma
    //   separated string that the Ghost API can take as input
    transformToCommaString: (input, type = null) => {
        if (typeof input === 'object') {
            let smallArray = new Array();
            input.forEach((item) => {
                let toAdd = _.get(item, type);
                smallArray.push(toAdd);
            });
            return smallArray.join(',');
        } else {
            return input;
        }
    },
    // Converts a string to an array, if it isn't already
    maybeStringToArray: (input) => {
        if (typeof input === 'string') {
            return input.split(',').map(function (item) {
                return item.trim();
            });
        } else if (typeof input === 'object') {
            return input;
        }
    },
    // Converts an array to a string, if it isn't already
    maybeArrayToString: (input) => {
        if (typeof input === 'object') {
            return input.join(',');
        } else {
            return input;
        }
    }
};
