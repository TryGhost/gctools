import _ from 'lodash';

// Converts an array of objects from Ghost API responses to a comma
// separated string that the Ghost API can take as input
const transformToCommaString = (input, type = null) => {
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
        return input.split(',').map((item) => {
            return item.trim();
        });
    } else if (typeof input === 'object') {
        return input;
    }
};

// Converts an array to a string, if it isn't already
const maybeArrayToString = (input) => {
    if (typeof input === 'object') {
        const trimmed = input.map((item) => {
            return item.trim();
        });
        return trimmed.join(',');
    } else {
        const split = input.split(',');
        const trimmed = split.map((item) => {
            return item.trim();
        });
        return trimmed.join(',');
    }
};

const getSlugFromObject = (input) => {
    if (typeof input === 'string') {
        return input.trim();
    } else if (typeof input === 'object') {
        return input.slug.trim();
    }
};

export {
    transformToCommaString,
    maybeObjectToArray,
    maybeStringToArray,
    maybeArrayToString,
    getSlugFromObject
};
