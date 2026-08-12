import {describe, test, mock, beforeEach, afterEach} from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'fs-extra';
import fsUtils from '@tryghost/mg-fs-utils';
import errors from '@tryghost/errors';

// Tags as they exist in Ghost. `hash-internal` is an internal tag and must survive every run,
// `Hello, "World"` exercises CSV escaping in the report, and `How To` / `Hello, "World"` both
// have names that don't normalise to their slug, so slug and name matching are distinguishable
const ghostTags = [
    {id: 't1', name: 'News', slug: 'news', visibility: 'public', count: {posts: 2}},
    {id: 't2', name: 'Sport', slug: 'sport', visibility: 'public', count: {posts: 5}},
    {id: 't3', name: 'How To', slug: 'how-to', visibility: 'public', count: {posts: 0}},
    {id: 't4', name: '#internal', slug: 'hash-internal', visibility: 'internal', count: {posts: 3}},
    {id: 't5', name: 'Hello, "World"', slug: 'quoted', visibility: 'public', count: {posts: 1}}
];

// Tag ids that `tags.delete` should reject for, set per test
let failingDeleteIds = new Set();

const mockDelete = mock.fn(({id}) => {
    if (failingDeleteIds.has(id)) {
        return Promise.reject(new errors.InternalServerError({message: 'Tag is in use, so cannot be deleted'}));
    }
    // The real Admin API responds 204 with an empty body
    return Promise.resolve(undefined);
});

const mockBrowse = mock.fn(() => {
    // Return a fresh copy each call, shaped like a discover page (array + pagination meta)
    const page = ghostTags.map(t => ({...t, count: {...t.count}}));
    page.meta = {pagination: {next: null}};
    return Promise.resolve(page);
});

const mockApi = {
    tags: {
        browse: mockBrowse,
        delete: mockDelete
    }
};

mock.module('@tryghost/admin-api', {
    defaultExport: function GhostAdminAPI() {
        return mockApi;
    }
});

let tmpDir;

// The report filename embeds a timestamp, so tests work in a throwaway directory
// rather than cleaning up by name
const writeCSV = (contents, name = 'keep.csv') => {
    const filePath = path.join(tmpDir, name);
    fs.writeFileSync(filePath, contents);
    return filePath;
};

const baseOptions = overrides => ({
    apiURL: 'https://example.com',
    adminAPIKey: 'key',
    delayBetweenCalls: 0,
    verbose: false,
    ...overrides
});

const readReport = async context => fsUtils.csv.parseCSV(context.reportPath);

const deletedIds = () => mockDelete.mock.calls.map(c => c.arguments[0].id);

describe('keep-tags', function () {
    beforeEach(() => {
        mockDelete.mock.resetCalls();
        mockBrowse.mock.resetCalls();
        failingDeleteIds = new Set();
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gctools-keep-tags-'));
    });

    afterEach(() => {
        fs.removeSync(tmpDir);
    });

    describe('partitionTags', function () {
        test('splits tags on slug by default', async function () {
            const {partitionTags, getKeepValues} = await import('../tasks/keep-tags.js');
            const keepValues = getKeepValues([{tag: 'news'}, {tag: 'sport'}]);
            const plan = partitionTags(ghostTags, keepValues);

            assert.deepStrictEqual(plan.toKeep.map(k => k.tag.slug), ['news', 'sport']);
            assert.deepStrictEqual(plan.toDelete.map(t => t.slug), ['how-to', 'quoted']);
            assert.deepStrictEqual(plan.toKeepInternal.map(k => k.tag.slug), ['hash-internal']);
            assert.deepStrictEqual(plan.unmatched, []);
        });

        test('matches on name when asked', async function () {
            const {partitionTags, getKeepValues} = await import('../tasks/keep-tags.js');
            const keepValues = getKeepValues([{tag: 'News'}, {tag: 'How To'}]);
            const plan = partitionTags(ghostTags, keepValues, 'name');

            assert.deepStrictEqual(plan.toKeep.map(k => k.tag.slug), ['news', 'how-to']);
            assert.deepStrictEqual(plan.toKeep.map(k => k.matchedBy), ['name', 'name']);
            assert.deepStrictEqual(plan.toDelete.map(t => t.slug), ['sport', 'quoted']);
        });

        test('matches a mix of slugs and names when matchBy is either', async function () {
            const {partitionTags, getKeepValues} = await import('../tasks/keep-tags.js');
            const keepValues = getKeepValues([{tag: 'news'}, {tag: 'How To'}]);
            const plan = partitionTags(ghostTags, keepValues, 'either');

            assert.deepStrictEqual(plan.toKeep.map(k => [k.tag.slug, k.matchedBy]), [['news', 'slug'], ['how-to', 'name']]);
            assert.deepStrictEqual(plan.unmatched, []);
        });

        test('does not match a name when matching by slug only', async function () {
            const {partitionTags, getKeepValues} = await import('../tasks/keep-tags.js');
            const keepValues = getKeepValues([{tag: 'How To'}]);
            const plan = partitionTags(ghostTags, keepValues, 'slug');

            assert.deepStrictEqual(plan.toKeep, []);
            assert.deepStrictEqual(plan.unmatched, ['How To']);
        });

        test('ignores case and surrounding whitespace', async function () {
            const {partitionTags, getKeepValues} = await import('../tasks/keep-tags.js');
            const keepValues = getKeepValues([{tag: '  NEWS  '}]);
            const plan = partitionTags(ghostTags, keepValues);

            assert.deepStrictEqual(plan.toKeep.map(k => k.tag.slug), ['news']);
        });

        test('reports CSV values that match no tag, but not ones matching an internal tag', async function () {
            const {partitionTags, getKeepValues} = await import('../tasks/keep-tags.js');
            const keepValues = getKeepValues([{tag: 'news'}, {tag: 'hash-internal'}, {tag: 'does-not-exist'}]);
            const plan = partitionTags(ghostTags, keepValues);

            assert.deepStrictEqual(plan.unmatched, ['does-not-exist']);
        });
    });

    describe('isInternalTag', function () {
        test('recognises every form of internal tag', async function () {
            const {isInternalTag} = await import('../tasks/keep-tags.js');

            assert.strictEqual(isInternalTag({name: '#internal', slug: 'something'}), true);
            assert.strictEqual(isInternalTag({name: 'Internal', slug: 'hash-internal'}), true);
            assert.strictEqual(isInternalTag({name: 'Internal', slug: 'internal', visibility: 'internal'}), true);
            assert.strictEqual(isInternalTag({name: 'News', slug: 'news', visibility: 'public'}), false);
        });
    });

    describe('getKeepValues', function () {
        test('takes the first column, drops blanks and dedupes case-insensitively', async function () {
            const {getKeepValues} = await import('../tasks/keep-tags.js');
            const values = getKeepValues([
                {tag: 'News', other: 'ignored'},
                {tag: 'news', other: 'ignored'},
                {tag: '  ', other: 'ignored'},
                {tag: 'Sport', other: 'ignored'}
            ]);

            assert.deepStrictEqual(values, [
                {raw: 'News', normalised: 'news'},
                {raw: 'Sport', normalised: 'sport'}
            ]);
        });
    });

    test('deletes only the tags absent from the CSV, never internal ones', async function () {
        const {default: keepTags} = await import('../tasks/keep-tags.js');
        const csvFile = writeCSV('tag\nnews\nsport\n');
        const context = {errors: []};

        await keepTags.getTaskRunner(baseOptions({csvFile})).run(context);

        assert.deepStrictEqual(deletedIds().sort(), ['t3', 't5']);
        assert.strictEqual(context.deleted.length, 2);
        assert.strictEqual(context.toKeep.length, 2);
        assert.strictEqual(context.errors.length, 0);
        assert.ok(!deletedIds().includes('t4'), 'the internal tag must never be deleted');
    });

    test('records the internal tag as kept in the report', async function () {
        const {default: keepTags} = await import('../tasks/keep-tags.js');
        const csvFile = writeCSV('tag\nnews\nsport\n');
        const context = {errors: []};

        await keepTags.getTaskRunner(baseOptions({csvFile})).run(context);

        const report = await readReport(context);
        const internalRows = report.filter(row => row.action === 'kept_internal');

        assert.strictEqual(internalRows.length, 1);
        assert.strictEqual(internalRows[0].slug, 'hash-internal');
    });

    test('deletes nothing on a dry run, but still reports', async function () {
        const {default: keepTags} = await import('../tasks/keep-tags.js');
        const csvFile = writeCSV('tag\nnews\nsport\n');
        const context = {errors: []};

        await keepTags.getTaskRunner(baseOptions({csvFile, dryRun: true})).run(context);

        assert.strictEqual(mockDelete.mock.callCount(), 0);
        assert.strictEqual(context.toDelete.length, 2);
        assert.strictEqual(context.deleted.length, 0);

        const report = await readReport(context);
        assert.deepStrictEqual(report.filter(row => row.action === 'would_delete').map(row => row.slug), ['how-to', 'quoted']);
    });

    test('writes the report next to the input CSV, named for the run type', async function () {
        const {default: keepTags} = await import('../tasks/keep-tags.js');
        const csvFile = writeCSV('tag\nnews\nsport\n');

        const dryContext = {errors: []};
        await keepTags.getTaskRunner(baseOptions({csvFile, dryRun: true})).run(dryContext);

        assert.strictEqual(path.dirname(dryContext.reportPath), path.dirname(csvFile));
        assert.ok(path.basename(dryContext.reportPath).startsWith('keep-tags-report-dry-run-'));

        const runContext = {errors: []};
        await keepTags.getTaskRunner(baseOptions({csvFile})).run(runContext);

        assert.ok(path.basename(runContext.reportPath).startsWith('keep-tags-report-run-'));
    });

    test('escapes commas and quotes in the report', async function () {
        const {default: keepTags} = await import('../tasks/keep-tags.js');
        const csvFile = writeCSV('tag\nquoted\n');
        const context = {errors: []};

        await keepTags.getTaskRunner(baseOptions({csvFile})).run(context);

        const report = await readReport(context);
        const quotedRow = report.find(row => row.slug === 'quoted');

        assert.ok(quotedRow, 'the row must survive a CSV round trip');
        assert.strictEqual(quotedRow.name, 'Hello, "World"');
    });

    test('records per-tag delete failures without aborting the run', async function () {
        const {default: keepTags} = await import('../tasks/keep-tags.js');
        failingDeleteIds = new Set(['t5']);
        const csvFile = writeCSV('tag\nnews\nsport\n');
        const context = {errors: []};

        await keepTags.getTaskRunner(baseOptions({csvFile})).run(context);

        assert.strictEqual(context.deleted.length, 1);
        assert.strictEqual(context.failed.length, 1);
        assert.strictEqual(context.errors.length, 1);

        const report = await readReport(context);
        const failedRow = report.find(row => row.action === 'delete_failed');

        assert.strictEqual(failedRow.slug, 'quoted');
        assert.match(failedRow.error, /cannot be deleted/);
        assert.strictEqual(report.find(row => row.slug === 'how-to').action, 'deleted');
    });

    test('refuses to run when the CSV has no values', async function () {
        const {default: keepTags} = await import('../tasks/keep-tags.js');
        const csvFile = writeCSV('tag\n');

        await assert.rejects(
            keepTags.getTaskRunner(baseOptions({csvFile})).run({errors: []}),
            /no tag values/i
        );
        assert.strictEqual(mockDelete.mock.callCount(), 0);
    });

    test('refuses to run when nothing matches, and succeeds with the right matchBy', async function () {
        const {default: keepTags} = await import('../tasks/keep-tags.js');
        // Both are display names, so neither matches a slug. The second is CSV-quoted,
        // so it also proves quoted input round-trips through the reader
        const csvFile = writeCSV('tag\nHow To\n"Hello, ""World"""\n');

        await assert.rejects(
            keepTags.getTaskRunner(baseOptions({csvFile})).run({errors: []}),
            /matched any Ghost tag using --matchBy slug/
        );
        assert.strictEqual(mockDelete.mock.callCount(), 0);

        const context = {errors: []};
        await keepTags.getTaskRunner(baseOptions({csvFile, matchBy: 'name'})).run(context);

        assert.deepStrictEqual(deletedIds().sort(), ['t1', 't2']);
        assert.strictEqual(context.toKeep.length, 2);
    });

    test('--force bypasses the nothing-matched check, but not internal tag protection', async function () {
        const {default: keepTags} = await import('../tasks/keep-tags.js');
        const csvFile = writeCSV('tag\nHow To\n');
        const context = {errors: []};

        await keepTags.getTaskRunner(baseOptions({csvFile, force: true})).run(context);

        assert.deepStrictEqual(deletedIds().sort(), ['t1', 't2', 't3', 't5']);
        assert.ok(!deletedIds().includes('t4'), 'the internal tag must never be deleted');
    });

    test('errors when the CSV does not exist', async function () {
        const {default: keepTags} = await import('../tasks/keep-tags.js');

        await assert.rejects(
            keepTags.getTaskRunner(baseOptions({csvFile: path.join(tmpDir, 'nope.csv')})).run({errors: []}),
            /not found/i
        );
        assert.strictEqual(mockDelete.mock.callCount(), 0);
    });

    test('surfaces unmatched CSV values without blocking the run', async function () {
        const {default: keepTags} = await import('../tasks/keep-tags.js');
        const csvFile = writeCSV('tag\nnews\nsport\ndoes-not-exist\n');
        const context = {errors: []};

        await keepTags.getTaskRunner(baseOptions({csvFile})).run(context);

        assert.deepStrictEqual(context.unmatched, ['does-not-exist']);
        assert.deepStrictEqual(deletedIds().sort(), ['t3', 't5']);

        const report = await readReport(context);
        const missingRow = report.find(row => row.action === 'not_in_ghost');

        assert.strictEqual(missingRow.csv_value, 'does-not-exist');
        assert.strictEqual(missingRow.id, '');
    });
});
