import { describe, test, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { silentRenderer } from './helpers/silent-renderer.js';

let capturedApiOptions = [];
let discoveredPosts = [];
let deleteErrors = new Map();
let discoverError = null;

const mockDelete = mock.fn(({ id }) => {
    if (deleteErrors.has(id)) {
        return Promise.reject(deleteErrors.get(id));
    }
    return Promise.resolve({ url: `https://example.com/posts/${id}/` });
});

const mockApi = {
    posts: {
        delete: mockDelete,
    },
};

const mockDiscover = mock.fn(() => {
    if (discoverError) {
        return Promise.reject(discoverError);
    }
    return Promise.resolve(discoveredPosts);
});

// Mock bluebird to native Promise, adding mapSeries and delay().return()
const NativePromise = Promise;
NativePromise.mapSeries = async (arr, fn) => {
    const results = [];
    for (let i = 0; i < arr.length; i++) {
        results.push(await fn(arr[i], i));
    }
    return results;
};
NativePromise.delay = (ms) => {
    const p = new NativePromise((resolve) => setTimeout(resolve, ms));
    p.return = (value) => p.then(() => value);
    return p;
};
mock.module('bluebird', { defaultExport: NativePromise });

mock.module('@tryghost/admin-api', {
    defaultExport: function GhostAdminAPI(options) {
        capturedApiOptions.push(options);
        return mockApi;
    },
});

mock.module('../lib/batch-ghost-discover.js', {
    namedExports: { discover: mockDiscover },
});

const { default: deletePosts } = await import('../tasks/delete-posts.js');

const baseOptions = (overrides = {}) => ({
    ...silentRenderer,
    apiURL: 'https://example.com',
    adminAPIKey:
        '0123456789abcdef01234567:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    delayBetweenCalls: 0,
    verbose: false,
    ...overrides,
});

describe('tasks/delete-posts', function () {
    beforeEach(() => {
        capturedApiOptions = [];
        discoveredPosts = [];
        deleteErrors = new Map();
        discoverError = null;
        mockDelete.mock.resetCalls();
        mockDiscover.mock.resetCalls();
    });

    test('exports expected task interfaces', function () {
        assert.strictEqual(typeof deletePosts.initialise, 'function');
        assert.strictEqual(typeof deletePosts.getFullTaskList, 'function');
        assert.strictEqual(typeof deletePosts.getTaskRunner, 'function');
    });

    test('initializes GhostAdminAPI with version: false by default (no hardcoded constraint)', async function () {
        const context = { errors: [] };
        const runner = deletePosts.getTaskRunner(baseOptions());
        await runner.run(context);

        assert.strictEqual(capturedApiOptions.length, 1);
        assert.strictEqual(capturedApiOptions[0].version, false);
        assert.strictEqual(capturedApiOptions[0].url, 'https://example.com');
        assert.strictEqual(
            capturedApiOptions[0].key,
            '0123456789abcdef01234567:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
        );
    });

    test('initializes GhostAdminAPI with explicit apiVersion when specified', async function () {
        const context = { errors: [] };
        const runner = deletePosts.getTaskRunner(baseOptions({ apiVersion: 'v5.120' }));
        await runner.run(context);

        assert.strictEqual(capturedApiOptions.length, 1);
        assert.strictEqual(capturedApiOptions[0].version, 'v5.120');
    });

    test('initializes GhostAdminAPI with explicit version option when specified', async function () {
        const context = { errors: [] };
        const runner = deletePosts.getTaskRunner(baseOptions({ version: 'v5.100' }));
        await runner.run(context);

        assert.strictEqual(capturedApiOptions.length, 1);
        assert.strictEqual(capturedApiOptions[0].version, 'v5.100');
    });

    test('replaces localhost with 127.0.0.1 and strips trailing slash in url', async function () {
        const context = { errors: [] };
        const runner = deletePosts.getTaskRunner(baseOptions({ apiURL: 'http://localhost:2368/' }));
        await runner.run(context);

        assert.strictEqual(capturedApiOptions.length, 1);
        assert.strictEqual(capturedApiOptions[0].url, 'http://127.0.0.1:2368');
    });

    test('passes tag, author, and status filters to discover', async function () {
        const context = { errors: [] };
        const runner = deletePosts.getTaskRunner(
            baseOptions({
                tag: 'technology',
                author: 'john-doe',
                status: 'draft',
            }),
        );
        await runner.run(context);

        assert.strictEqual(mockDiscover.mock.callCount(), 1);
        const discoverArg = mockDiscover.mock.calls[0].arguments[0];
        assert.strictEqual(discoverArg.type, 'posts');
        assert.strictEqual(discoverArg.limit, 100);
        assert.strictEqual(
            discoverArg.filter,
            'status:[draft]+tags:[technology]+author:[john-doe]',
        );
    });

    test('supports array of tag objects and handles status: all', async function () {
        const context = { errors: [] };
        const runner = deletePosts.getTaskRunner(
            baseOptions({
                tag: [{ slug: 'news' }, { slug: 'updates' }],
                status: 'all',
            }),
        );
        await runner.run(context);

        assert.strictEqual(mockDiscover.mock.callCount(), 1);
        const discoverArg = mockDiscover.mock.calls[0].arguments[0];
        assert.strictEqual(discoverArg.filter, 'tags:[news,updates]');
    });

    test('only deletes posts returned by discover and preserves non-matching posts', async function () {
        // Discovered posts representing posts matching the tag/filter criteria
        discoveredPosts = [
            { id: 'post-1', title: 'Target Post 1' },
            { id: 'post-2', title: 'Target Post 2' },
        ];

        const context = { errors: [] };
        const runner = deletePosts.getTaskRunner(baseOptions({ tag: 'target-tag' }));
        await runner.run(context);

        assert.strictEqual(mockDelete.mock.callCount(), 2);
        assert.strictEqual(mockDelete.mock.calls[0].arguments[0].id, 'post-1');
        assert.strictEqual(mockDelete.mock.calls[1].arguments[0].id, 'post-2');

        assert.deepStrictEqual(context.deleted, [
            'https://example.com/posts/post-1/',
            'https://example.com/posts/post-2/',
        ]);
        assert.strictEqual(context.errors.length, 0);
    });

    test('records discovery errors into context.errors and rejects runner', async function () {
        discoverError = new Error('Ghost API timeout during discovery');
        const context = { errors: [] };
        const runner = deletePosts.getTaskRunner(baseOptions());

        await assert.rejects(runner.run(context), /Ghost API timeout/);
        assert.strictEqual(context.errors.length, 1);
        assert.strictEqual(context.errors[0].message, 'Ghost API timeout during discovery');
    });

    test('annotates post deletion failure with resource title and records error in context', async function () {
        discoveredPosts = [{ id: 'fail-post', title: 'Failing Post' }];
        deleteErrors.set('fail-post', new Error('Deletion forbidden'));

        const context = { errors: [] };
        const runner = deletePosts.getTaskRunner(baseOptions());

        await runner.run(context);
        assert.strictEqual(context.errors.length, 1);
        assert.strictEqual(context.errors[0].message, 'Deletion forbidden');
        assert.deepStrictEqual(context.errors[0].resource, { title: 'Failing Post' });
    });
});
