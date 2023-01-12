import _ from 'lodash';

// Converts an array of objects from Ghost API responses to a comma
// separated string that the Ghost API can take as input
const transformToCommaString = (input, type = null, joinWith = ',') => {
    if (typeof input === 'object') {
        let smallArray = new Array();
        input.forEach((item) => {
            let toAdd = _.get(item, type);
            smallArray.push(toAdd);
        });
        return smallArray.join(joinWith);
    } else {
        return input;
    }
};

const maybeObjectToArray = (input, type = null) => {
    if (typeof input === 'object') {
        let smallArray = new Array();
        input.forEach((item) => {
            let toAdd = _.get(item, type);
            smallArray.push(toAdd);
        });
        return smallArray;
    } else {
        return input;
    }
};

// Converts a string to an array, if it isn't already
const maybeStringToArray = (input) => {
    if (typeof input === 'string') {
        return input.split(',').map(function (item) {
            return item.trim();
        });
    } else if (typeof input === 'object') {
        return input;
    }
};

// Converts an array to a string, if it isn't already
const maybeArrayToString = (input) => {
    if (typeof input === 'object') {
        return input.join(',');
    } else {
        return input;
    }
};

const SlugFromStringArrayOrObject = (input) => {
    if (typeof input === 'string') {
        // If is string, convert to array/list
        return maybeStringToArray(input);
    } else if (input[0].slug) {
        // If is Ghost object
        return maybeObjectToArray(input, 'slug');
    } else {
        // Else, is an array/list — no change needed
        return input;
    }
};

const sleep = (ms = 0) => {
    return new Promise(r => setTimeout(r, ms)); // eslint-disable-line no-promise-executor-return
};

export {
    transformToCommaString,
    maybeObjectToArray,
    maybeStringToArray,
    maybeArrayToString,
    SlugFromStringArrayOrObject,
    sleep
};
