import { describe, test, mock, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'fs-extra';
import { silentRenderer } from './helpers/silent-renderer.js';

// Posts as they currently exist in Ghost. The real `discover` runs against this via the
// mocked `posts.browse`, so the tags here are what the CSV instructions are applied to.
//   post-one → already carries `News`, so it exercises re-adding a tag the post has
//   post-two → carries none of the tags in play
const ghostPosts = [
    {
        id: 'p1',
        slug: 'post-one',
        title: 'Post One',
        url: 'https://example.com/post-one/',
        updated_at: '2024-01-01T00:00:00.000Z',
        tags: [
            { id: 't1', name: 'News', slug: 'news' },
            { id: 't2', name: 'Sport', slug: 'sport' },
            { id: 't3', name: 'Old', slug: 'old' },
        ],
    },
    {
        id: 'p2',
        slug: 'post-two',
        title: 'Post Two',
        url: 'https://example.com/post-two/',
        updated_at: '2024-01-01T00:00:00.000Z',
        tags: [{ id: 't2', name: 'Sport', slug: 'sport' }],
    },
];

const mockEdit = mock.fn((data) =>
    Promise.resolve({ ...data, url: `https://example.com/${data.id}/` }),
);
const mockBrowse = mock.fn(() => {
    // Return a fresh copy each call, shaped like a discover page (array + pagination meta)
    const page = ghostPosts.map((p) => ({ ...p, tags: p.tags.map((t) => ({ ...t })) }));
    page.meta = { pagination: { next: null } };
    return Promise.resolve(page);
});

const mockApi = {
    posts: {
        browse: mockBrowse,
        edit: mockEdit,
    },
};

// Mock bluebird to native Promise, adding the `mapSeries` and `delay().return()`
// helpers the task relies on — avoids V8 structured-clone issues with bluebird in node:test IPC
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
    defaultExport: function GhostAdminAPI() {
        return mockApi;
    },
});

let tmpDir;

const writeCSV = (contents, name = 'change-tags.csv') => {
    const filePath = path.join(tmpDir, name);
    fs.writeFileSync(filePath, contents);
    return filePath;
};

const baseOptions = (overrides) => ({
    ...silentRenderer,
    apiURL: 'https://example.com',
    adminAPIKey: 'key',
    delayBetweenCalls: 0,
    verbose: false,
    ...overrides,
});

const editCallFor = (id) => mockEdit.mock.calls.find((c) => c.arguments[0].id === id);

// The task sends a mix of existing tag objects and new tag name strings
const tagNames = (id) => editCallFor(id).arguments[0].tags.map((t) => t.name ?? t);

describe('change-tags', function () {
    beforeEach(() => {
        mockEdit.mock.resetCalls();
        mockBrowse.mock.resetCalls();
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gctools-change-tags-'));
    });

    afterEach(() => {
        fs.removeSync(tmpDir);
    });

    test('deletes and appends tags, leaving the primary tag alone', async function () {
        const { default: changeTags } = await import('../tasks/change-tags.js');
        const csvFile = writeCSV(
            'url,delete_tags,add_tags\nhttps://example.com/post-one/,Old,"Fresh, Extra"\n',
        );
        const context = { errors: [] };

        await changeTags.getTaskRunner(baseOptions({ csvFile })).run(context);

        assert.deepStrictEqual(tagNames('p1'), ['News', 'Sport', 'Extra', 'Fresh']);
        assert.strictEqual(context.updated.length, 1);
        assert.strictEqual(context.errors.length, 0);
    });

    test('adds tags as the primary tag in CSV order', async function () {
        const { default: changeTags } = await import('../tasks/change-tags.js');
        const csvFile = writeCSV(
            'url,delete_tags,add_tags\nhttps://example.com/post-two/,,"Fresh, Extra"\n',
        );
        const context = { errors: [] };

        await changeTags
            .getTaskRunner(baseOptions({ csvFile, addAsPrimaryTag: true }))
            .run(context);

        assert.deepStrictEqual(tagNames('p2'), ['Fresh', 'Extra', 'Sport']);
    });

    // Regression: the `addAsPrimaryTag` filter used to be overwritten by the unconditional
    // `delete_tags` filter, so a tag the post already had survived and was then re-added,
    // leaving it in the list twice and not necessarily as the primary tag
    test('does not duplicate a tag the post already has when adding it as primary', async function () {
        const { default: changeTags } = await import('../tasks/change-tags.js');
        const csvFile = writeCSV(
            'url,delete_tags,add_tags\nhttps://example.com/post-one/,Old,News\n',
        );
        const context = { errors: [] };

        await changeTags
            .getTaskRunner(baseOptions({ csvFile, addAsPrimaryTag: true }))
            .run(context);

        assert.deepStrictEqual(tagNames('p1'), ['News', 'Sport']);
    });

    test('still deletes tags when adding as primary', async function () {
        const { default: changeTags } = await import('../tasks/change-tags.js');
        const csvFile = writeCSV(
            'url,delete_tags,add_tags\nhttps://example.com/post-one/,"Old, Sport",Fresh\n',
        );
        const context = { errors: [] };

        await changeTags
            .getTaskRunner(baseOptions({ csvFile, addAsPrimaryTag: true }))
            .run(context);

        assert.deepStrictEqual(tagNames('p1'), ['Fresh', 'News']);
    });

    test('records an error for a CSV row with no matching Ghost post', async function () {
        const { default: changeTags } = await import('../tasks/change-tags.js');
        const csvFile = writeCSV(
            'url,delete_tags,add_tags\nhttps://example.com/nope/,,Fresh\nhttps://example.com/post-two/,,Fresh\n',
        );
        const context = { errors: [] };

        await changeTags.getTaskRunner(baseOptions({ csvFile })).run(context);

        assert.strictEqual(mockEdit.mock.callCount(), 1);
        assert.strictEqual(context.errors.length, 1);
        assert.match(context.errors[0].message, /No live post found/);
    });
});
