import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import {
    transformToCommaString,
    maybeStringToArray,
    maybeArrayToString,
    SlugFromStringArrayOrObject,
    maybeObjectToArray,
    validateApiUrl,
    normalizeApiUrl,
} from '../lib/utils.js';

const require = createRequire(import.meta.url);
const tagsObject = require('./fixtures/tags.json');

describe('Utils (transformToCommaString)', function () {
    test('can extract `name` values from object', function () {
        let tagNames = transformToCommaString(tagsObject, 'name');
        assert.deepStrictEqual(tagNames, 'Lorem Ipsum,Dolor Simet');
    });

    test('can extract `slug` values from object', function () {
        let tagSlugs = transformToCommaString(tagsObject, 'slug');
        assert.deepStrictEqual(tagSlugs, 'lorem-ipsum,dolor-simet');
    });

    test('can extract `url` values from object', function () {
        let tagURLs = transformToCommaString(tagsObject, 'url');
        assert.deepStrictEqual(
            tagURLs,
            'http://localhost:2368/tag/lorem-ipsum/,http://localhost:2368/tag/dolor-simet/',
        );
    });

    test('will not transform a string', function () {
        let tagNames = transformToCommaString('Lorem Ipsum,Dolor Simet');
        assert.deepStrictEqual(tagNames, 'Lorem Ipsum,Dolor Simet');
    });

    test('will use supplied seperator', function () {
        let tagSlugs = transformToCommaString(tagsObject, 'slug', ' - ');
        assert.deepStrictEqual(tagSlugs, 'lorem-ipsum - dolor-simet');
    });
});

describe('Utils (maybeObjectToArray)', function () {
    test('can extract `name` values from object', function () {
        let tagNames = maybeObjectToArray(tagsObject, 'name');
        assert.strictEqual(tagNames.length, 2);
        assert.deepStrictEqual(tagNames[0], 'Lorem Ipsum');
        assert.deepStrictEqual(tagNames[1], 'Dolor Simet');
    });

    test('can extract `slug` values from object', function () {
        let tagSlugs = maybeObjectToArray(tagsObject, 'slug');
        assert.strictEqual(tagSlugs.length, 2);
        assert.deepStrictEqual(tagSlugs[0], 'lorem-ipsum');
        assert.deepStrictEqual(tagSlugs[1], 'dolor-simet');
    });

    test('can extract `url` values from object', function () {
        let tagURLs = maybeObjectToArray(tagsObject, 'url');
        assert.strictEqual(tagURLs.length, 2);
        assert.deepStrictEqual(tagURLs[0], 'http://localhost:2368/tag/lorem-ipsum/');
        assert.deepStrictEqual(tagURLs[1], 'http://localhost:2368/tag/dolor-simet/');
    });
});

describe('Utils (maybeStringToArray)', function () {
    test('can convert comma-separated string to an array', function () {
        let stringToArray = maybeStringToArray('lorem-ipsum,  dolor-simet');
        assert.strictEqual(stringToArray.length, 2);
        assert.deepStrictEqual(stringToArray[0], 'lorem-ipsum');
        assert.deepStrictEqual(stringToArray[1], 'dolor-simet');
    });

    test('will not transform an array', function () {
        let stringToArray = maybeStringToArray(['lorem-ipsum', 'dolor-simet']);
        assert.strictEqual(stringToArray.length, 2);
        assert.deepStrictEqual(stringToArray[0], 'lorem-ipsum');
        assert.deepStrictEqual(stringToArray[1], 'dolor-simet');
    });
});

describe('Utils (maybeArrayToString)', function () {
    test('can convert an array to a comma-separated string', function () {
        let arrayToString = maybeArrayToString(['lorem-ipsum', 'dolor-simet']);
        assert.deepStrictEqual(arrayToString, 'lorem-ipsum,dolor-simet');
    });

    test('wil not convert string', function () {
        let arrayToString = maybeArrayToString('lorem-ipsum,dolor-simet');
        assert.deepStrictEqual(arrayToString, 'lorem-ipsum,dolor-simet');
    });
});

describe('Utils (SlugFromStringArrayOrObject)', function () {
    test('can convert an object to list array', function () {
        let tagSlugs = SlugFromStringArrayOrObject(tagsObject);
        assert.strictEqual(tagSlugs.length, 2);
        assert.deepStrictEqual(tagSlugs[0], 'lorem-ipsum');
        assert.deepStrictEqual(tagSlugs[1], 'dolor-simet');
    });

    test('can convert an string to list array', function () {
        let tagSlugs = SlugFromStringArrayOrObject('lorem-ipsum, dolor-simet');
        assert.strictEqual(tagSlugs.length, 2);
        assert.deepStrictEqual(tagSlugs[0], 'lorem-ipsum');
        assert.deepStrictEqual(tagSlugs[1], 'dolor-simet');
    });

    test('wil not convert list to list', function () {
        let tagSlugs = SlugFromStringArrayOrObject(['lorem-ipsum', 'dolor-simet']);
        assert.strictEqual(tagSlugs.length, 2);
        assert.deepStrictEqual(tagSlugs[0], 'lorem-ipsum');
        assert.deepStrictEqual(tagSlugs[1], 'dolor-simet');
    });
});

describe('Utils (normalizeApiUrl)', function () {
    test('normalizes URL by removing trailing slashes', function () {
        assert.strictEqual(normalizeApiUrl('https://demo.ghost.io/'), 'https://demo.ghost.io');
        assert.strictEqual(normalizeApiUrl('https://demo.ghost.io///'), 'https://demo.ghost.io');
        assert.strictEqual(normalizeApiUrl('http://localhost:2368/'), 'http://localhost:2368');
    });

    test('returns null for invalid inputs', function () {
        assert.strictEqual(normalizeApiUrl(''), null);
        assert.strictEqual(normalizeApiUrl(null), null);
        assert.strictEqual(normalizeApiUrl('ftp://example.com'), null);
    });
});

describe('Utils (validateApiUrl)', function () {
    test('accepts valid https URL', function () {
        assert.strictEqual(validateApiUrl('https://demo.ghost.io'), true);
    });

    test('accepts valid http URL with port', function () {
        assert.strictEqual(validateApiUrl('http://localhost:2368'), true);
    });

    test('accepts valid URL with trailing slash', function () {
        assert.strictEqual(validateApiUrl('https://my-blog.com/'), true);
    });

    test('accepts valid subpaths containing ghost in segment name', function () {
        assert.strictEqual(validateApiUrl('https://example.com/ghost-blog'), true);
        assert.strictEqual(validateApiUrl('https://example.com/ghostly'), true);
        assert.strictEqual(validateApiUrl('https://example.com/my-ghost/site'), true);
    });

    test('rejects empty input', function () {
        assert.strictEqual(typeof validateApiUrl(''), 'string');
        assert.strictEqual(typeof validateApiUrl(null), 'string');
    });

    test('rejects invalid URL without protocol', function () {
        const result = validateApiUrl('not-a-valid-url');
        assert.strictEqual(typeof result, 'string');
        assert.match(result, /Invalid URL/);
    });

    test('rejects non-http/https protocol', function () {
        const result = validateApiUrl('ftp://example.com');
        assert.strictEqual(typeof result, 'string');
        assert.match(result, /protocol/);
    });

    test('rejects URL containing /ghost path', function () {
        const result = validateApiUrl('https://demo.ghost.io/ghost');
        assert.strictEqual(typeof result, 'string');
        assert.match(result, /base site URL/);
    });

    test('rejects URL containing /ghost/api/admin', function () {
        const result = validateApiUrl('https://demo.ghost.io/ghost/api/admin');
        assert.strictEqual(typeof result, 'string');
        assert.match(result, /base site URL/);
    });
});
