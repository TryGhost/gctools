import _ from 'lodash';

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

const maybeStringToArray = (input) => {
    if (typeof input === 'string') {
        return input.split(',').map(function (item) {
            return item.trim();
        });
    } else if (typeof input === 'object') {
        return input;
    }
};

const maybeArrayToString = (input) => {
    if (typeof input === 'object') {
        return input.join(',');
    } else {
        return input;
    }
};

const SlugFromStringArrayOrObject = (input) => {
    if (typeof input === 'string') {
        return maybeStringToArray(input);
    } else if (input[0].slug) {
        return maybeObjectToArray(input, 'slug');
    } else {
        return input;
    }
};

const sleep = (ms = 0) => {
    return new Promise((r) => setTimeout(r, ms));
};

const escapeCSVField = (value) => {
    const str = String(value ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
};

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
