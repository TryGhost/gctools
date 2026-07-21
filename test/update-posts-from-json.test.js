import {describe, test, mock, beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';

// Path to the fixture Ghost export (read by the real fs-extra)
const fixturePath = fileURLToPath(new URL('./fixtures/update-posts-from-json.json', import.meta.url));

// Posts as they currently exist in Ghost. The real `discover` runs against this
// via the mocked `posts.browse`, so authorship here is what we diff the JSON against:
//   post-one   → [bob]          (JSON says [alice])        → change to [alice]
//   post-two   → [alice]        (JSON says [alice, bob])   → change to [alice, bob]
//   post-three → [bob]          (JSON says [bob])          → no change, skip
//   post-four  → [alice]        (JSON has no authors)      → leave untouched, skip
const ghostPosts = [
    {id: 'p1', slug: 'post-one', title: 'Post One', url: 'https://example.com/post-one/', updated_at: '2024-01-01T00:00:00.000Z', tags: [], authors: [{id: 'gb', slug: 'bob', email: 'bob@example.com', name: 'Bob'}]},
    {id: 'p2', slug: 'post-two', title: 'Post Two', url: 'https://example.com/post-two/', updated_at: '2024-01-01T00:00:00.000Z', tags: [], authors: [{id: 'ga', slug: 'alice', email: 'alice@example.com', name: 'Alice'}]},
    {id: 'p3', slug: 'post-three', title: 'Post Three', url: 'https://example.com/post-three/', updated_at: '2024-01-01T00:00:00.000Z', tags: [], authors: [{id: 'gb', slug: 'bob', email: 'bob@example.com', name: 'Bob'}]},
    {id: 'p4', slug: 'post-four', title: 'Post Four', url: 'https://example.com/post-four/', updated_at: '2024-01-01T00:00:00.000Z', tags: [], authors: [{id: 'ga', slug: 'alice', email: 'alice@example.com', name: 'Alice'}]}
];

const mockEdit = mock.fn(data => Promise.resolve({...data, url: `https://example.com/${data.id}/`}));
const mockBrowse = mock.fn(() => {
    // Return a fresh copy each call, shaped like a discover page (array + pagination meta)
    const page = ghostPosts.map(p => ({...p, tags: [...p.tags], authors: p.authors.map(a => ({...a}))}));
    page.meta = {pagination: {next: null}};
    return Promise.resolve(page);
});

const mockApi = {
    posts: {
        browse: mockBrowse,
        edit: mockEdit
    }
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
    const p = new NativePromise(resolve => setTimeout(resolve, ms));
    p.return = value => p.then(() => value);
    return p;
};
mock.module('bluebird', {defaultExport: NativePromise});

mock.module('@tryghost/admin-api', {
    defaultExport: function GhostAdminAPI() {
        return mockApi;
    }
});

const baseOptions = () => ({
    apiURL: 'https://example.com',
    adminAPIKey: 'key',
    jsonFile: fixturePath,
    fields: ['authors'],
    delayBetweenCalls: 0,
    verbose: false
});

const editCallFor = id => mockEdit.mock.calls.find(c => c.arguments[0].id === id);

describe('update-posts-from-json', function () {
    beforeEach(() => {
        mockEdit.mock.resetCalls();
        mockBrowse.mock.resetCalls();
    });

    test('exposes Authors as an updatable field', async function () {
        const {default: updatePostsFromJson} = await import('../tasks/update-posts-from-json.js');
        assert.ok(updatePostsFromJson.UPDATABLE_FIELDS.some(f => f.name === 'Authors' && f.value === 'authors'));
    });

    test('requests authors from Ghost so current authorship can be compared', async function () {
        const {default: updatePostsFromJson} = await import('../tasks/update-posts-from-json.js');
        const runner = updatePostsFromJson.getTaskRunner(baseOptions());
        await runner.run({errors: []});

        assert.ok(mockBrowse.mock.callCount() >= 1);
        assert.strictEqual(mockBrowse.mock.calls[0].arguments[0].include, 'tags,authors');
    });

    test('updates authors by email, only when they differ from Ghost', async function () {
        const {default: updatePostsFromJson} = await import('../tasks/update-posts-from-json.js');
        const context = {errors: []};
        const runner = updatePostsFromJson.getTaskRunner(baseOptions());
        await runner.run(context);

        // Only the two posts whose authors actually differ get edited
        assert.strictEqual(mockEdit.mock.callCount(), 2);
        assert.strictEqual(context.updated.length, 2);
        assert.strictEqual(context.errors.length, 0);

        // post-one: [bob] → [alice]
        assert.deepStrictEqual(editCallFor('p1').arguments[0].authors, [{email: 'alice@example.com'}]);

        // post-two: [alice] → [alice, bob], order preserved from the posts_authors join
        assert.deepStrictEqual(editCallFor('p2').arguments[0].authors, [
            {email: 'alice@example.com'},
            {email: 'bob@example.com'}
        ]);

        // post-three already matches → skipped, post-four has no JSON authors → never blanked
        assert.strictEqual(editCallFor('p3'), undefined);
        assert.strictEqual(editCallFor('p4'), undefined);
        assert.ok(context.skipped.includes('Post Three'));
        assert.ok(context.skipped.includes('Post Four'));
    });

    test('dry run reports author changes without calling the API', async function () {
        const {default: updatePostsFromJson} = await import('../tasks/update-posts-from-json.js');
        const context = {errors: []};
        const runner = updatePostsFromJson.getTaskRunner({...baseOptions(), dryRun: true});
        await runner.run(context);

        assert.strictEqual(mockEdit.mock.callCount(), 0);
        assert.strictEqual(context.updated.length, 2);
        assert.ok(context.skipped.includes('Post Three'));
        assert.ok(context.skipped.includes('Post Four'));
    });
});
