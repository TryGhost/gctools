import { describe, test, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { silentRenderer } from './helpers/silent-renderer.js';

const lexicalDoc = (children) => JSON.stringify({ root: { children, type: 'root', version: 1 } });

const paragraph = (text) => ({ type: 'paragraph', version: 1, text });

// Posts as they currently exist in Ghost. The real `discover` runs against this via the
// mocked `posts.browse`.
//   post-one → no paywall card, so a preview gets added
//   post-two → already has a paywall card, so it's skipped unless `overwrite` is set
const ghostPosts = [
    {
        id: 'p1',
        slug: 'post-one',
        title: 'Post One',
        url: 'https://example.com/post-one/',
        updated_at: '2024-01-01T00:00:00.000Z',
        tags: [{ id: 't1', name: 'News', slug: 'news' }],
        lexical: lexicalDoc([paragraph('One'), paragraph('Two'), paragraph('Three')]),
    },
    {
        id: 'p2',
        slug: 'post-two',
        title: 'Post Two',
        url: 'https://example.com/post-two/',
        updated_at: '2024-01-01T00:00:00.000Z',
        tags: [{ id: 't2', name: 'Sport', slug: 'sport' }],
        lexical: lexicalDoc([paragraph('One'), { type: 'paywall', version: 1 }, paragraph('Two')]),
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

const baseOptions = (overrides) => ({
    ...silentRenderer,
    apiURL: 'https://example.com',
    adminAPIKey: 'key',
    previewPosition: '1',
    overwrite: false,
    delayBetweenCalls: 0,
    verbose: false,
    ...overrides,
});

const editCallFor = (id) => mockEdit.mock.calls.find((c) => c.arguments[0].id === id);

const tagNames = (id) => editCallFor(id).arguments[0].tags.map((t) => t.name ?? t);

const previewAddedTagPattern = /^#preview-added-\d{4}-\d{2}-\d{2}-\d{2}-\d{2}$/;

describe('add-preview', function () {
    beforeEach(() => {
        mockEdit.mock.resetCalls();
        mockBrowse.mock.resetCalls();
    });

    test('stamps the tag name with the given date, zero padded', async function () {
        const { default: addPreview } = await import('../tasks/add-preview.js');

        assert.strictEqual(
            addPreview.previewAddedTagName(new Date(2026, 7, 18, 10, 52)),
            '#preview-added-2026-08-18-10-52',
        );
        assert.strictEqual(
            addPreview.previewAddedTagName(new Date(2026, 0, 1, 9, 5)),
            '#preview-added-2026-01-01-09-05',
        );
    });

    test('adds an internal tag alongside the existing tags when a preview is added', async function () {
        const { default: addPreview } = await import('../tasks/add-preview.js');
        const context = { errors: [] };

        await addPreview.getTaskRunner(baseOptions()).run(context);

        const [existingTag, addedTag] = tagNames('p1');
        assert.strictEqual(existingTag, 'News');
        assert.match(addedTag, previewAddedTagPattern);

        const lexical = JSON.parse(editCallFor('p1').arguments[0].lexical);
        assert.strictEqual(lexical.root.children[1].type, 'paywall');
        assert.strictEqual(context.errors.length, 0);
    });

    test('does not tag a post that is skipped because it already has a paywall card', async function () {
        const { default: addPreview } = await import('../tasks/add-preview.js');
        const context = { errors: [] };

        await addPreview.getTaskRunner(baseOptions()).run(context);

        assert.strictEqual(mockEdit.mock.callCount(), 1);
        assert.strictEqual(editCallFor('p2'), undefined);
    });

    test('tags a post whose existing preview is overwritten', async function () {
        const { default: addPreview } = await import('../tasks/add-preview.js');
        const context = { errors: [] };

        await addPreview.getTaskRunner(baseOptions({ overwrite: true })).run(context);

        const [existingTag, addedTag] = tagNames('p2');
        assert.strictEqual(existingTag, 'Sport');
        assert.match(addedTag, previewAddedTagPattern);
    });

    test('requests tags from the API so existing tags are not wiped', async function () {
        const { default: addPreview } = await import('../tasks/add-preview.js');
        const context = { errors: [] };

        await addPreview.getTaskRunner(baseOptions()).run(context);

        assert.strictEqual(mockBrowse.mock.calls[0].arguments[0].include, 'tags');
    });
});
