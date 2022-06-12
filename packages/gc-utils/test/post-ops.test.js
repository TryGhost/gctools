import {createPostsFilter} from '../lib/post-ops.js';
import tagsObject from './fixtures/tags.json';
import authorsObject from './fixtures/authors.json';

describe('Posts filter builder', function () {
    test('Builds a filter string from asingle item', async function () {
        const filter = createPostsFilter({
            tag: ['newsletter']
        });

        expect(filter).toEqual('tag:newsletter');
    });

    test('Builds a filter string from single-element arrays', async function () {
        const filter = createPostsFilter({
            author: ['harry'],
            tag: ['newsletter'],
            visibility: ['member']
        });

        expect(filter).toEqual('visibility:member+tag:newsletter+author:harry');
    });

    test('Builds a filter string from multi-element arrays', async function () {
        const filter = createPostsFilter({
            author: ['harry', 'ron'],
            tag: ['newsletter', 'blog'],
            visibility: ['member', ' paid']
        });

        expect(filter).toEqual('visibility:member+visibility:paid+tag:newsletter+tag:blog+author:harry+author:ron');
    });

    test('Builds filter from objects & arrays', async function () {
        const filter = createPostsFilter({
            author: authorsObject,
            tag: tagsObject,
            visibility: ['members', 'paid']
        });

        expect(filter).toEqual('visibility:members+visibility:paid+tag:lorem-ipsum+tag:dolor-simet+author:ghost-user+author:sample-user');
    });

    test('Throws an error if arrays are not supplied', async function () {
        expect(() => {createPostsFilter({
            author: 'harry',
            tag: 'newsletter',
            visibility: 'members'
        })}).toThrow(Error);
    });
});
