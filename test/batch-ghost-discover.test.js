import {requestOptions} from '../lib/batch-ghost-discover.js';

describe('Batch Ghost Discover', function () {
    test('Builds the default query', async function () {
        const opts = requestOptions();

        expect(opts).toBeObject();
        expect(opts).toContainAllKeys(['page', 'limit']);
        expect(opts.page).toBeNumber();
        expect(opts.limit).toBeNumber();
    });

    test('Has different defaults for specific types: tags', async function () {
        const opts = requestOptions({
            type: 'tags'
        });

        expect(opts).toBeObject();
        expect(opts).toContainAllKeys(['page', 'limit', 'include']);
        expect(opts.page).toBeNumber();
        expect(opts.limit).toBeNumber();
        expect(opts.include).toEqual('count.posts');
    });

    test('Has different defaults for specific types: users', async function () {
        const opts = requestOptions({
            type: 'users'
        });

        expect(opts).toBeObject();
        expect(opts).toContainAllKeys(['page', 'limit', 'include']);
        expect(opts.page).toBeNumber();
        expect(opts.limit).toBeNumber();
        expect(opts.include).toEqual('count.posts,roles');
    });

    test('Has different defaults for specific types, with a custom limit', async function () {
        const opts = requestOptions({
            type: 'users',
            limit: 100
        });

        expect(opts.limit).toEqual(100);
        expect(opts.include).toEqual('count.posts,roles');
    });

    test('Accepts a specific limit (supplied as int)', async function () {
        const opts = requestOptions({
            limit: 55
        });

        expect(opts.limit).toEqual(55);
    });

    test('Accepts a specific limit (supplied as string)', async function () {
        const opts = requestOptions({
            limit: '45'
        });

        expect(opts.limit).toEqual(45);
    });

    test('Accepts a specific include', async function () {
        const opts = requestOptions({
            include: 'monthly_price,yearly_price,benefits'
        });

        expect(opts.include).toEqual('monthly_price,yearly_price,benefits');
    });

    test('Accepts a specific filter', async function () {
        const opts = requestOptions({
            filter: 'tag:getting-started'
        });

        expect(opts.filter).toEqual('tag:getting-started');
    });

    test('Accepts a specific fields', async function () {
        const opts = requestOptions({
            fields: 'title,url'
        });

        expect(opts.fields).toEqual('title,url');
    });

    test('Accepts a specific formats', async function () {
        const opts = requestOptions({
            formats: 'html,plaintext'
        });

        expect(opts.formats).toEqual('html,plaintext');
    });

    test('Accepts a specific order', async function () {
        const opts = requestOptions({
            order: 'monthly_price ASC'
        });

        expect(opts.order).toEqual('monthly_price ASC');
    });

    test('Accepts a combination of parameters', async function () {
        const opts = requestOptions({
            type: 'posts',
            limit: '35',
            include: 'authors, tags',
            order: 'title DESC'
        });

        expect(opts).toBeObject();
        expect(opts).toContainAllKeys(['page', 'limit', 'include', 'order']);
        expect(opts.page).toBeNumber();
        expect(opts.limit).toBeNumber();
        expect(opts.include).toEqual('authors, tags');
        expect(opts.order).toEqual('title DESC');
    });
});
