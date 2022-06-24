import {
    transformToCommaString,
    maybeStringToArray,
    maybeArrayToString,
    getSlugFromObject,
    maybeObjectToArray
} from '../lib/transform.js';
import tagsObject from './fixtures/tags.json';

describe('Transform (transformToCommaString)', function () {
    test('can extract `name` values from object', function () {
        let tagNames = transformToCommaString(tagsObject, 'name');
        expect(tagNames).toEqual('Lorem Ipsum,Dolor Simet');
    });

    test('can extract `slug` values from object', function () {
        let tagSlugs = transformToCommaString(tagsObject, 'slug');
        expect(tagSlugs).toEqual('lorem-ipsum,dolor-simet');
    });

    test('can extract `url` values from object', function () {
        let tagURLs = transformToCommaString(tagsObject, 'url');
        expect(tagURLs).toEqual('http://localhost:2368/tag/lorem-ipsum/,http://localhost:2368/tag/dolor-simet/');
    });

    test('will not transform a string', function () {
        let tagNames = transformToCommaString('Lorem Ipsum,Dolor Simet');
        expect(tagNames).toEqual('Lorem Ipsum,Dolor Simet');
    });
});

describe('Transform (maybeObjectToArray)', function () {
    test('can extract `name` values from object', function () {
        let tagNames = maybeObjectToArray(tagsObject, 'name');

        expect(tagNames).toBeArray();
        expect(tagNames).toHaveLength(2);
        expect(tagNames[0]).toEqual('Lorem Ipsum');
        expect(tagNames[1]).toEqual('Dolor Simet');
    });

    test('can extract `slug` values from object', function () {
        let tagSlugs = maybeObjectToArray(tagsObject, 'slug');
        expect(tagSlugs).toHaveLength(2);
        expect(tagSlugs).toBeArray(2);
        expect(tagSlugs[0]).toEqual('lorem-ipsum');
        expect(tagSlugs[1]).toEqual('dolor-simet');
    });

    test('can extract `url` values from object', function () {
        let tagURLs = maybeObjectToArray(tagsObject, 'url');
        expect(tagURLs).toHaveLength(2);
        expect(tagURLs).toBeArray(2);
        expect(tagURLs[0]).toEqual('http://localhost:2368/tag/lorem-ipsum/');
        expect(tagURLs[1]).toEqual('http://localhost:2368/tag/dolor-simet/');
    });
});

describe('Transform (maybeStringToArray)', function () {
    test('can convert comma-separated string to an array', function () {
        let stringToArray = maybeStringToArray('lorem-ipsum,  dolor-simet');
        expect(stringToArray).toHaveLength(2);
        expect(stringToArray).toBeArray(2);
        expect(stringToArray[0]).toEqual('lorem-ipsum');
        expect(stringToArray[1]).toEqual('dolor-simet');
    });

    test('will not transform an array', function () {
        let stringToArray = maybeStringToArray(['lorem-ipsum', 'dolor-simet']);
        expect(stringToArray).toHaveLength(2);
        expect(stringToArray).toBeArray(2);
        expect(stringToArray[0]).toEqual('lorem-ipsum');
        expect(stringToArray[1]).toEqual('dolor-simet');
    });
});

describe('Transform (maybeArrayToString)', function () {
    test('can convert an array to a comma-separated string', function () {
        let arrayToString = maybeArrayToString(['lorem-ipsum', 'dolor-simet']);
        expect(arrayToString).toEqual('lorem-ipsum,dolor-simet');
    });

    test('will trim space from the start & end of array items before joining', function () {
        let arrayToString = maybeArrayToString(['lorem-ipsum', ' dolor-simet ']);
        expect(arrayToString).toEqual('lorem-ipsum,dolor-simet');
    });

    test('will not convert list string', function () {
        let arrayToString = maybeArrayToString('lorem-ipsum,dolor-simet');
        expect(arrayToString).toEqual('lorem-ipsum,dolor-simet');
    });

    test('will trim spaces from a list string', function () {
        let arrayToString = maybeArrayToString('lorem-ipsum , dolor-simet ');
        expect(arrayToString).toEqual('lorem-ipsum,dolor-simet');
    });
});

describe('Transform (getSlugFromObject)', function () {
    test('will return a trimmed string, if a string is supplied', function () {
        let tagSlug = getSlugFromObject(' this-is-a-slug');
        expect(tagSlug).toEqual('this-is-a-slug');
    });

    test('will return a trimmed slug string, if an object is supplied', function () {
        let tagSlug = getSlugFromObject(tagsObject[0]);
        expect(tagSlug).toEqual('lorem-ipsum');
    });
});
