const testUtils = require('./utils');

import {transformToCommaString, maybeStringToArray, maybeArrayToString, SlugFromStringArrayOrObject, maybeObjectToArray} from '../lib/utils.js';

const tagsObject = testUtils.fixtures.readSync('tags.json');

describe('Utils (transformToCommaString)', function () {
    it('can extract `name` values from object', function () {
        let tagNames = transformToCommaString(tagsObject, 'name');
        tagNames.should.eql('Lorem Ipsum,Dolor Simet');
    });

    it('can extract `slug` values from object', function () {
        let tagSlugs = transformToCommaString(tagsObject, 'slug');
        tagSlugs.should.eql('lorem-ipsum,dolor-simet');
    });

    it('can extract `url` values from object', function () {
        let tagURLs = transformToCommaString(tagsObject, 'url');
        tagURLs.should.eql('http://localhost:2368/tag/lorem-ipsum/,http://localhost:2368/tag/dolor-simet/');
    });

    it('will not transform a string', function () {
        let tagNames = transformToCommaString('Lorem Ipsum,Dolor Simet');
        tagNames.should.eql('Lorem Ipsum,Dolor Simet');
    });
});

describe('Utils (maybeObjectToArray)', function () {
    it('can extract `name` values from object', function () {
        let tagNames = maybeObjectToArray(tagsObject, 'name');
        tagNames.should.be.an.Array().with.lengthOf(2);
        tagNames[0].should.eql('Lorem Ipsum');
        tagNames[1].should.eql('Dolor Simet');
    });

    it('can extract `slug` values from object', function () {
        let tagSlugs = maybeObjectToArray(tagsObject, 'slug');
        tagSlugs.should.be.an.Array().with.lengthOf(2);
        tagSlugs[0].should.eql('lorem-ipsum');
        tagSlugs[1].should.eql('dolor-simet');
    });

    it('can extract `url` values from object', function () {
        let tagURLs = maybeObjectToArray(tagsObject, 'url');
        tagURLs.should.be.an.Array().with.lengthOf(2);
        tagURLs[0].should.eql('http://localhost:2368/tag/lorem-ipsum/');
        tagURLs[1].should.eql('http://localhost:2368/tag/dolor-simet/');
    });
});

describe('Utils (maybeStringToArray)', function () {
    it('can convert comma-separated string to an array', function () {
        let stringToArray = maybeStringToArray('lorem-ipsum,  dolor-simet');
        stringToArray.should.be.an.Array().with.lengthOf(2);
        stringToArray[0].should.eql('lorem-ipsum');
        stringToArray[1].should.eql('dolor-simet');
    });

    it('will not transform an array', function () {
        let stringToArray = maybeStringToArray(['lorem-ipsum', 'dolor-simet']);
        stringToArray.should.be.an.Array().with.lengthOf(2);
        stringToArray[0].should.eql('lorem-ipsum');
        stringToArray[1].should.eql('dolor-simet');
    });
});

describe('Utils (maybeArrayToString)', function () {
    it('can convert an array to a comma-separated string', function () {
        let arrayToString = maybeArrayToString(['lorem-ipsum', 'dolor-simet']);
        arrayToString.should.eql('lorem-ipsum,dolor-simet');
    });

    it('wil not convert string', function () {
        let arrayToString = maybeArrayToString('lorem-ipsum,dolor-simet');
        arrayToString.should.eql('lorem-ipsum,dolor-simet');
    });
});

describe('Utils (SlugFromStringArrayOrObject)', function () {
    it('can convert an object to list array', function () {
        let tagSlugs = SlugFromStringArrayOrObject(tagsObject);
        tagSlugs.should.be.an.Array().with.lengthOf(2);
        tagSlugs[0].should.eql('lorem-ipsum');
        tagSlugs[1].should.eql('dolor-simet');
    });

    it('can convert an string to list array', function () {
        let tagSlugs = SlugFromStringArrayOrObject('lorem-ipsum, dolor-simet');
        tagSlugs.should.be.an.Array().with.lengthOf(2);
        tagSlugs[0].should.eql('lorem-ipsum');
        tagSlugs[1].should.eql('dolor-simet');
    });

    it('wil not convert list to list', function () {
        let tagSlugs = SlugFromStringArrayOrObject(['lorem-ipsum', 'dolor-simet']);
        tagSlugs.should.be.an.Array().with.lengthOf(2);
        tagSlugs[0].should.eql('lorem-ipsum');
        tagSlugs[1].should.eql('dolor-simet');
    });
});
