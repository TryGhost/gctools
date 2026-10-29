import { beforeEach, describe, mock, test } from 'node:test';
import assert from 'node:assert/strict';

// Pages the stubbed Ghost Admin API serves per resource type, e.g.
// {posts: [[post, post], [post]]} serves two pages of posts
let pages;
let browseCalls;
let constructedWith;
let progressEvents;

// A GhostAdminAPI browse() resolves to an array of resources with a non-index
// `meta` property attached; the stub answers the same shape from `pages`
const browse = (type) => async (options) => {
    browseCalls.push({ type, options: { ...options } });
    const typePages = pages[type];
    const pageNumber = options.page > 0 ? options.page : 1;
    const response = [...typePages[pageNumber - 1]];
    response.meta = {
        pagination: {
            page: pageNumber,
            next: pageNumber < typePages.length ? pageNumber + 1 : null,
            total: typePages.flat().length,
        },
    };
    return response;
};

class MockGhostAdminAPI {
    constructor(options) {
        constructedWith.push(options);
        this.posts = { browse: browse('posts') };
        this.tags = { browse: browse('tags') };
    }
}

class MockSingleBar {
    constructor() {
        progressEvents.push('create');
    }
    start(total, value) {
        progressEvents.push(`start ${value}/${total}`);
    }
    update(value) {
        progressEvents.push(`update ${value}`);
    }
    stop() {
        progressEvents.push('stop');
    }
}

mock.module('@tryghost/admin-api', { defaultExport: MockGhostAdminAPI });
mock.module('cli-progress', { defaultExport: { SingleBar: MockSingleBar } });

const { requestOptions, discover, discoverInfo } = await import('../lib/batch-ghost-discover.js');

describe('Batch Ghost Discover', function () {
    test('Builds the default query', async function () {
        const opts = requestOptions();

        assert.strictEqual(typeof opts, 'object');
        assert.ok('page' in opts);
        assert.ok('limit' in opts);
        assert.strictEqual(typeof opts.page, 'number');
        assert.strictEqual(typeof opts.limit, 'number');
    });

    test('Has different defaults for specific types: tags', async function () {
        const opts = requestOptions({
            type: 'tags',
        });

        assert.strictEqual(typeof opts, 'object');
        assert.ok('page' in opts);
        assert.ok('limit' in opts);
        assert.ok('include' in opts);
        assert.strictEqual(typeof opts.page, 'number');
        assert.strictEqual(typeof opts.limit, 'number');
        assert.deepStrictEqual(opts.include, 'count.posts');
    });

    test('Has different defaults for specific types: users', async function () {
        const opts = requestOptions({
            type: 'users',
        });

        assert.strictEqual(typeof opts, 'object');
        assert.ok('page' in opts);
        assert.ok('limit' in opts);
        assert.ok('include' in opts);
        assert.strictEqual(typeof opts.page, 'number');
        assert.strictEqual(typeof opts.limit, 'number');
        assert.deepStrictEqual(opts.include, 'count.posts,roles');
    });

    test('Has different defaults for specific types, with a custom limit', async function () {
        const opts = requestOptions({
            type: 'users',
            limit: 100,
        });

        assert.deepStrictEqual(opts.limit, 100);
        assert.deepStrictEqual(opts.include, 'count.posts,roles');
    });

    test('Accepts a specific limit (supplied as int)', async function () {
        const opts = requestOptions({
            limit: 55,
        });

        assert.deepStrictEqual(opts.limit, 55);
    });

    test('Accepts a specific limit (supplied as string)', async function () {
        const opts = requestOptions({
            limit: '45',
        });

        assert.deepStrictEqual(opts.limit, 45);
    });

    test('Accepts a specific include', async function () {
        const opts = requestOptions({
            include: 'monthly_price,yearly_price,benefits',
        });

        assert.deepStrictEqual(opts.include, 'monthly_price,yearly_price,benefits');
    });

    test('Accepts a specific filter', async function () {
        const opts = requestOptions({
            filter: 'tag:getting-started',
        });

        assert.deepStrictEqual(opts.filter, 'tag:getting-started');
    });

    test('Accepts a specific fields', async function () {
        const opts = requestOptions({
            fields: 'title,url',
        });

        assert.deepStrictEqual(opts.fields, 'title,url');
    });

    test('Accepts a specific formats', async function () {
        const opts = requestOptions({
            formats: 'html,plaintext',
        });

        assert.deepStrictEqual(opts.formats, 'html,plaintext');
    });

    test('Accepts a specific order', async function () {
        const opts = requestOptions({
            order: 'monthly_price ASC',
        });

        assert.deepStrictEqual(opts.order, 'monthly_price ASC');
    });

    test('Accepts a combination of parameters', async function () {
        const opts = requestOptions({
            type: 'posts',
            limit: '35',
            include: 'authors, tags',
            order: 'title DESC',
        });

        assert.strictEqual(typeof opts, 'object');
        assert.ok('page' in opts);
        assert.ok('limit' in opts);
        assert.ok('include' in opts);
        assert.ok('order' in opts);
        assert.strictEqual(typeof opts.page, 'number');
        assert.strictEqual(typeof opts.limit, 'number');
        assert.deepStrictEqual(opts.include, 'authors, tags');
        assert.deepStrictEqual(opts.order, 'title DESC');
    });
});

describe('Batch Ghost Discover: discover', function () {
    const post = (id) => ({ id, title: `Post ${id}` });

    beforeEach(function () {
        pages = { posts: [[]], tags: [[]] };
        browseCalls = [];
        constructedWith = [];
        progressEvents = [];
    });

    test('fetches every page of a supplied api client and concatenates the results', async function () {
        pages.posts = [[post('1'), post('2')], [post('3'), post('4')], [post('5')]];

        const results = await discover({ api: new MockGhostAdminAPI({}), type: 'posts' });

        assert.deepStrictEqual(
            results.map(({ id }) => id),
            ['1', '2', '3', '4', '5'],
        );
        assert.strictEqual(browseCalls.length, 3);
        // The next loop iteration requests the page the previous response pointed at
        assert.deepStrictEqual(
            browseCalls.map(({ options }) => options.page),
            [0, 2, 3],
        );
    });

    test('stops after a single page when there is no next page', async function () {
        pages.posts = [[post('1')]];

        const results = await discover({ api: new MockGhostAdminAPI({}), type: 'posts' });

        assert.deepStrictEqual(
            results.map(({ id }) => id),
            ['1'],
        );
        assert.strictEqual(browseCalls.length, 1);
    });

    test('builds an api client from url and key, pointing localhost at 127.0.0.1', async function () {
        pages.posts = [[post('1')]];

        const results = await discover({
            url: 'http://localhost:2368',
            key: '1234:abcd',
            type: 'posts',
        });

        assert.deepStrictEqual(
            results.map(({ id }) => id),
            ['1'],
        );
        assert.deepStrictEqual(constructedWith, [
            { url: 'http://127.0.0.1:2368', key: '1234:abcd', version: 'v5.0' },
        ]);
    });

    test('passes type, order and filter through to the browse request', async function () {
        pages.tags = [[{ id: 'tag-1' }]];

        const results = await discover({
            api: new MockGhostAdminAPI({}),
            type: 'tags',
            order: 'name ASC',
            filter: 'visibility:public',
        });

        assert.deepStrictEqual(
            results.map(({ id }) => id),
            ['tag-1'],
        );
        assert.strictEqual(browseCalls[0].type, 'tags');
        assert.strictEqual(browseCalls[0].options.order, 'name ASC');
        assert.strictEqual(browseCalls[0].options.filter, 'visibility:public');
        assert.strictEqual(browseCalls[0].options.include, 'count.posts');
    });

    test('returns only the pagination total when info is requested', async function () {
        pages.posts = [[post('1'), post('2')], [post('3')]];

        const total = await discover({ api: new MockGhostAdminAPI({}), type: 'posts', info: true });

        assert.strictEqual(total, 3);
        assert.strictEqual(browseCalls.length, 1);
    });

    test('discoverInfo fetches the total with a limit of 1', async function () {
        pages.posts = [[post('1'), post('2')]];

        const total = await discoverInfo({ api: new MockGhostAdminAPI({}), type: 'posts' });

        assert.strictEqual(total, 2);
        assert.strictEqual(browseCalls.length, 1);
        assert.strictEqual(browseCalls[0].options.limit, 1);
    });

    test('drives a progress bar across the pages when progress is requested', async function () {
        pages.posts = [[post('1'), post('2')], [post('3')]];

        const results = await discover({
            api: new MockGhostAdminAPI({}),
            type: 'posts',
            progress: true,
        });

        assert.strictEqual(results.length, 3);
        assert.deepStrictEqual(progressEvents, [
            'create',
            'start 0/3',
            'update 2',
            'update 3',
            'stop',
        ]);
    });
});
