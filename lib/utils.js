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
    return new Promise((r) => setTimeout(r, ms));
};

// Quote & escape a single CSV field, so commas, quotes and newlines survive a round trip.
// `fsUtils.csv.jsonToCSV` only quotes fields containing a comma and never doubles embedded
// quotes, which silently corrupts values like `Hello, "World"`
const escapeCSVField = (value) => {
    const str = String(value ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
};

// Converts an array of flat objects to a CSV string, using the first object's keys as the header
const jsonToCSV = (data) => {
    if (data.length === 0) {
        return '';
    }
    const headers = Object.keys(data[0]);
    const lines = [headers.join(',')];
    for (const row of data) {
        lines.push(headers.map((h) => escapeCSVField(row[h])).join(','));
    }
    return lines.join('\n');
};

/**
 * Normalizes a Ghost API URL by trimming, ensuring valid protocol, and removing trailing slashes.
 * @param {string} url - The URL to normalize
 * @returns {string|null} Normalized URL or null if invalid
 */
const normalizeApiUrl = (url) => {
    if (!url || typeof url !== 'string' || !url.trim()) {
        return null;
    }
    try {
        const parsed = new URL(url.trim());
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
            return null;
        }
        if (!parsed.hostname) {
            return null;
        }
        const cleanPath = parsed.pathname.replace(/\/+$/, '');
        return `${parsed.origin}${cleanPath}`;
    } catch {
        return null;
    }
};

/**
 * Validates a Ghost API URL ensuring it uses http/https and represents the base site URL without /ghost or /ghost/api.
 * @param {string} url - The input URL from interactive prompt or CLI
 * @returns {true|string} True if valid, or an error message string
 */
const validateApiUrl = (url) => {
    if (!url || typeof url !== 'string' || !url.trim()) {
        return 'Please enter a valid URL';
    }

    let parsed;
    try {
        parsed = new URL(url.trim());
    } catch {
        return 'Invalid URL. Please enter a full URL including protocol (e.g. https://my-site.com)';
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return 'URL must use http:// or https:// protocol';
    }

    const segments = parsed.pathname
        .split('/')
        .filter(Boolean)
        .map((segment) => {
            try {
                return decodeURIComponent(segment).toLowerCase();
            } catch {
                return segment.toLowerCase();
            }
        });

    const hasGhostSegment = segments.some((seg) => seg === 'ghost');
    const hasApiAdmin = segments.some((seg, idx) => seg === 'api' && segments[idx + 1] === 'admin');

    if (hasGhostSegment || hasApiAdmin) {
        return 'API URL must be the base site URL (e.g. https://my-site.com), without /ghost or /ghost/api';
    }

    return true;
};

export {
    validateApiUrl,
    normalizeApiUrl,
    transformToCommaString,
    maybeObjectToArray,
    maybeStringToArray,
    maybeArrayToString,
    SlugFromStringArrayOrObject,
    sleep,
    escapeCSVField,
    jsonToCSV,
};
