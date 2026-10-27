import { afterEach, beforeEach, describe, mock, test } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'fs-extra';
import fsUtils from '@tryghost/mg-fs-utils';
import { silentRenderer } from './helpers/silent-renderer.js';

const label = (id, count, name = `Label ${id}`) => ({
    id,
    name,
    slug: id,
    count: { members: count },
});
let pages;
let filterPageSize;
let failingFilter;
let freshLabels;
let pageErrors;
let readErrors;
let deleteErrors;
let confirmation;
let onConfirm;
let events;
let originalExitCode;
let originalCwd;
let tmpDir;

// The quoted values of a filter built by `nameFilter`: names, then as many slugs. Names with
// quotes or backslashes are never put in a filter, so the values need no unescaping
const filterValues = (filter) => {
    const values = [...filter.matchAll(/'([^']*)'/g)].map(([, value]) => value);
    return { names: values.slice(0, values.length / 2), slugs: values.slice(values.length / 2) };
};

// Answers a filtered browse like Ghost on MySQL: names match ignoring case, slugs exactly
const filteredPage = ({ filter, page }) => {
    if (failingFilter && filter.includes(failingFilter)) {
        throw new Error('Ghost is unavailable');
    }
    const { names, slugs } = filterValues(filter);
    const lowerNames = names.map((name) => name.toLowerCase());
    const matching = pages
        .flat()
        .filter(
            (item) => lowerNames.includes(item.name.toLowerCase()) || slugs.includes(item.slug),
        );
    const start = (page - 1) * filterPageSize;
    return {
        data: {
            labels: matching.slice(start, start + filterPageSize),
            meta: {
                pagination: { next: start + filterPageSize < matching.length ? page + 1 : null },
            },
        },
    };
};

const mockGet = mock.fn(async (url, { params }) => {
    events.push(`GET ${url}`);
    if (url.endsWith('/labels/') && params.filter) {
        return filteredPage(params);
    }
    if (url.endsWith('/labels/')) {
        if (pageErrors.has(params.page)) {
            throw pageErrors.get(params.page);
        }
        return {
            data: {
                labels: pages[params.page - 1],
                meta: { pagination: { next: params.page < pages.length ? params.page + 1 : null } },
            },
        };
    }
    const id = decodeURIComponent(url.split('/').at(-2));
    if (readErrors.has(id)) {
        throw readErrors.get(id);
    }
    return { data: { labels: freshLabels.has(id) ? [freshLabels.get(id)] : [] } };
});
const mockDelete = mock.fn(async (url) => {
    events.push(`DELETE ${url}`);
    const id = decodeURIComponent(url.split('/').at(-2));
    if (deleteErrors.has(id)) {
        throw deleteErrors.get(id);
    }
    return { status: 204 };
});
const mockConfirm = mock.fn(async () => {
    events.push('CONFIRM');
    onConfirm?.();
    return confirmation;
});
const logs = { info: mock.fn(), ok: mock.fn(), warn: mock.fn(), error: mock.fn() };

mock.module('axios', { defaultExport: { get: mockGet, delete: mockDelete } });
mock.module('@inquirer/confirm', { defaultExport: mockConfirm });
mock.module('@tryghost/pretty-cli', { namedExports: { ui: { log: logs } } });
mock.module('../lib/admin-api-call.js', {
    namedExports: { apiAuthTokenHeaders: () => ({ Authorization: 'Ghost test-token' }) },
});

const { default: deleteLabels, getMemberCount } = await import('../tasks/delete-labels.js');
const { default: command } = await import('../commands/delete-labels.js');
const { keepValuesFrom } = await import('../lib/keep-list.js');

const options = (overrides = {}) => ({
    ...silentRenderer,
    apiURL: 'https://example.com/subdir///',
    adminAPIKey: 'test-key',
    delayBetweenCalls: 0,
    ...overrides,
});
const deletedIds = () => mockDelete.mock.calls.map(({ arguments: [url] }) => url.split('/').at(-2));
const labelBrowses = () =>
    mockGet.mock.calls
        .filter(({ arguments: [url] }) => url.endsWith('/labels/'))
        .map(({ arguments: [, config] }) => config.params);
const labelReads = () =>
    mockGet.mock.calls.filter(({ arguments: [url] }) => !url.endsWith('/labels/')).length;
const messages = (fn) => fn.mock.calls.map(({ arguments: [message] }) => message).join('\n');
const writeCSV = (contents, name = 'keep.csv') => {
    const filePath = path.join(tmpDir, name);
    fs.writeFileSync(filePath, contents);
    return filePath;
};
const readReport = async (directory = tmpDir) => {
    const [fileName] = (await fs.readdir(directory)).filter((file) =>
        file.startsWith('delete-labels-report-'),
    );
    assert.ok(fileName, 'expected a report to be written');
    return { fileName, rows: await fsUtils.csv.parseCSV(path.join(directory, fileName)) };
};
const reportExists = async () =>
    (await fs.readdir(tmpDir)).some((file) => file.startsWith('delete-labels-report-'));

describe('delete-labels', () => {
    beforeEach(() => {
        pages = [[label('used', 3), label('empty-a', 0)], [label('empty-b', 0)]];
        filterPageSize = 100;
        failingFilter = undefined;
        freshLabels = new Map(pages.flat().map((item) => [item.id, item]));
        pageErrors = new Map();
        readErrors = new Map();
        deleteErrors = new Map();
        confirmation = false;
        onConfirm = undefined;
        events = [];
        originalExitCode = process.exitCode;
        for (const fn of [mockGet, mockDelete, mockConfirm, ...Object.values(logs)]) {
            fn.mock.resetCalls();
        }
        // Reports without --keepFile go to the working directory, so run in a throwaway one
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gctools-delete-labels-'));
        originalCwd = process.cwd();
        process.chdir(tmpDir);
    });

    afterEach(() => {
        process.exitCode = originalExitCode;
        process.chdir(originalCwd);
        fs.removeSync(tmpDir);
    });

    describe('validateSelection', () => {
        test('requires exactly one of --labels, --all or --unused', () => {
            for (const args of [
                {},
                { labels: [] },
                { all: true, unused: true, force: true },
                // Blank names are dropped before matching, so they select nothing
                { labels: [''] },
                { labels: ['  ', ''] },
            ]) {
                assert.throws(
                    () => deleteLabels.validateSelection(args),
                    /exactly one of --labels, --all or --unused/,
                );
            }
        });

        test('rejects a keep list with --labels', () => {
            assert.throws(
                () => deleteLabels.validateSelection({ labels: ['A'], keep: ['B'] }),
                /only apply to --all and --unused/,
            );
            assert.throws(
                () => deleteLabels.validateSelection({ labels: ['A'], keepFile: 'keep.csv' }),
                /only apply to --all and --unused/,
            );
        });

        test('refuses --all without a keep list unless forced', () => {
            assert.throws(
                () => deleteLabels.validateSelection({ all: true }),
                /without a keep list/,
            );
            assert.doesNotThrow(() => deleteLabels.validateSelection({ all: true, force: true }));
            assert.doesNotThrow(() => deleteLabels.validateSelection({ all: true, keep: ['A'] }));
            assert.doesNotThrow(() =>
                deleteLabels.validateSelection({ all: true, keepFile: 'keep.csv' }),
            );
        });

        test('accepts --labels and --unused on their own', () => {
            assert.doesNotThrow(() => deleteLabels.validateSelection({ labels: ['A'] }));
            assert.doesNotThrow(() => deleteLabels.validateSelection({ unused: true }));
        });
    });

    describe('selectLabels', () => {
        const labels = [
            label('members-vip', 4, 'VIP'),
            label('paid-members', 0, 'Paid'),
            label('import-1', 0, 'Import 1'),
            label('import-2', 2, 'Import 2'),
        ];

        test('selects named labels by name or slug, ignoring case, and reports unknown names', () => {
            const plan = deleteLabels.selectLabels(labels, {
                names: keepValuesFrom(['vip', 'IMPORT-1', 'Missing']),
            });

            assert.deepStrictEqual(
                plan.toDelete.map(({ id }) => id),
                ['members-vip', 'import-1'],
            );
            assert.deepStrictEqual(plan.toKeep, []);
            assert.deepStrictEqual(plan.unmatched, ['Missing']);
        });

        test('selects every label except the ones to keep', () => {
            const plan = deleteLabels.selectLabels(labels, {
                keepValues: keepValuesFrom(['vip', 'paid-members', 'Nope']),
            });

            assert.deepStrictEqual(
                plan.toDelete.map(({ id }) => id),
                ['import-1', 'import-2'],
            );
            assert.deepStrictEqual(
                plan.toKeep.map(({ label: { id }, keptBy, value }) => ({ id, keptBy, value })),
                [
                    { id: 'members-vip', keptBy: 'name', value: 'vip' },
                    { id: 'paid-members', keptBy: 'slug', value: 'paid-members' },
                ],
            );
            assert.deepStrictEqual(plan.unmatched, ['Nope']);
        });

        test('with unused, keeps labels that have members and the ones to keep', () => {
            const plan = deleteLabels.selectLabels(labels, {
                unused: true,
                keepValues: keepValuesFrom(['Paid']),
            });

            assert.deepStrictEqual(
                plan.toDelete.map(({ id }) => id),
                ['import-1'],
            );
            assert.deepStrictEqual(
                plan.toKeep.map(({ label: { id }, keptBy }) => ({ id, keptBy })),
                [
                    { id: 'members-vip', keptBy: 'in_use' },
                    { id: 'paid-members', keptBy: 'name' },
                    { id: 'import-2', keptBy: 'in_use' },
                ],
            );
        });

        test('counts every keep value that names a kept label as matched', () => {
            const plan = deleteLabels.selectLabels([label('arger', 9, 'Ärger')], {
                keepValues: keepValuesFrom(['ÄRGER', 'arger']),
            });

            assert.deepStrictEqual(plan.toDelete, []);
            assert.strictEqual(plan.toKeep[0].keptBy, 'name');
            assert.deepStrictEqual(plan.unmatched, []);
        });

        test('counts every name that selects a label as matched', () => {
            const plan = deleteLabels.selectLabels([label('arger', 9, 'Ärger')], {
                names: keepValuesFrom(['ärger', 'ARGER']),
            });

            assert.deepStrictEqual(
                plan.toDelete.map(({ id }) => id),
                ['arger'],
            );
            assert.deepStrictEqual(plan.unmatched, []);
        });

        test('deletes nothing when the list of names to delete is empty', () => {
            const plan = deleteLabels.selectLabels(labels, { names: [] });

            assert.deepStrictEqual(plan.toDelete, []);
            assert.deepStrictEqual(plan.toKeep, []);
        });

        test('selects nothing when called without a selection', () => {
            assert.deepStrictEqual(deleteLabels.selectLabels([]), {
                toDelete: [],
                toKeep: [],
                unmatched: [],
            });
        });
    });

    describe('getMemberCount', () => {
        test('returns a valid count and names the label when the count is unusable', () => {
            assert.strictEqual(getMemberCount(label('a', 2)), 2);
            assert.throws(
                () => getMemberCount({ id: 'only-id', count: { members: -1 } }),
                /"only-id"/,
            );
        });
    });

    describe('errorMessage', () => {
        test("prefers Ghost's message from the response body", () => {
            const error = new Error('Request failed with status code 422');
            error.response = { data: { errors: [{ message: 'Label is protected' }] } };

            assert.strictEqual(deleteLabels.errorMessage(error), 'Label is protected');
            assert.strictEqual(deleteLabels.errorMessage(new Error('Plain')), 'Plain');
        });
    });

    describe('--unused', () => {
        test('scans all label pages with member counts and only selects zero counts', async () => {
            const context = {};
            await deleteLabels.getScanTaskRunner(options({ unused: true })).run(context);

            assert.deepStrictEqual(
                context.toDelete.map(({ id }) => id),
                ['empty-a', 'empty-b'],
            );
            assert.strictEqual(context.labels.length, 3);
            assert.strictEqual(context.scanComplete, true);
            assert.strictEqual(context.confirmed, false);
            assert.strictEqual(mockDelete.mock.callCount(), 0);
            assert.deepStrictEqual(
                mockGet.mock.calls.map(({ arguments: [url, config] }) => ({
                    url,
                    params: config.params,
                })),
                [1, 2].map((page) => ({
                    url: 'https://example.com/subdir/ghost/api/admin/labels/',
                    params: { include: 'count.members', limit: 100, page, order: 'id asc' },
                })),
            );
        });

        test('refuses deletion without explicit confirmation even after scanning', async () => {
            const context = {};
            await deleteLabels.getScanTaskRunner(options({ unused: true })).run(context);
            await assert.rejects(
                deleteLabels.getDeleteTaskRunner(options({ unused: true })).run(context),
                /explicit confirmation/,
            );
            assert.strictEqual(mockDelete.mock.callCount(), 0);
        });

        test('does not prompt or delete when every label is in use', async () => {
            pages = [[label('used', 1)]];
            await command.run(options({ unused: true }));
            assert.strictEqual(mockConfirm.mock.callCount(), 0);
            assert.strictEqual(mockDelete.mock.callCount(), 0);
            assert.match(logs.ok.mock.calls[0].arguments[0], /No labels to delete among 1 label\./);
        });

        test('handles a site with no labels', async () => {
            pages = [[]];
            await command.run(options({ unused: true }));
            assert.strictEqual(mockConfirm.mock.callCount(), 0);
            assert.strictEqual(mockDelete.mock.callCount(), 0);
            assert.match(logs.ok.mock.calls[0].arguments[0], /among 0 labels/);
        });

        test('lists candidates before prompting, defaults to No, and cancels without deletion', async () => {
            mockConfirm.mock.mockImplementationOnce(async (config) => {
                assert.strictEqual(config.default, false);
                assert.match(config.message, /2 labels .* 0 label assignments/);
                const output = messages(logs.info);
                assert.match(output, /Label empty-a \(empty-a\) - 0 members/);
                assert.match(output, /Label empty-b \(empty-b\)/);
                assert.doesNotMatch(output, /Label used/);
                return false;
            });
            await command.run(options({ unused: true }));
            assert.strictEqual(mockConfirm.mock.callCount(), 1);
            assert.strictEqual(mockGet.mock.callCount(), 2);
            assert.strictEqual(mockDelete.mock.callCount(), 0);
            assert.strictEqual(logs.ok.mock.callCount(), 0);
            assert.match(logs.info.mock.calls.at(-1).arguments[0], /Cancelled/);
            assert.strictEqual(await reportExists(), false);
        });

        test('dry run lists unused labels and reports, without prompting or deleting', async () => {
            await command.run(options({ unused: true, dryRun: true }));
            assert.strictEqual(mockConfirm.mock.callCount(), 0);
            assert.strictEqual(mockDelete.mock.callCount(), 0);
            assert.match(messages(logs.ok), /Dry run complete/);

            const { fileName, rows } = await readReport();
            assert.match(fileName, /^delete-labels-report-dry-run-\d+\.csv$/);
            assert.deepStrictEqual(
                rows.map(({ action, id, member_count, kept_by }) => ({
                    action,
                    id,
                    member_count,
                    kept_by,
                })),
                [
                    { action: 'would_delete', id: 'empty-a', member_count: '0', kept_by: '' },
                    { action: 'would_delete', id: 'empty-b', member_count: '0', kept_by: '' },
                    { action: 'kept', id: 'used', member_count: '3', kept_by: 'in_use' },
                ],
            );
        });

        test('deletes only confirmed unused labels and handles empty 204 responses', async () => {
            confirmation = true;
            await command.run(options({ unused: true }));
            assert.deepStrictEqual(deletedIds(), ['empty-a', 'empty-b']);
            assert.ok(
                events.indexOf('CONFIRM') < events.findIndex((event) => event.startsWith('DELETE')),
            );
            assert.strictEqual(mockGet.mock.callCount(), 4);
            assert.match(logs.ok.mock.calls[0].arguments[0], /Deleted 2 labels; skipped 0/);
            assert.strictEqual(logs.error.mock.callCount(), 0);

            const { fileName, rows } = await readReport();
            assert.match(fileName, /^delete-labels-report-run-\d+\.csv$/);
            assert.deepStrictEqual(
                rows.map(({ action }) => action),
                ['deleted', 'deleted', 'kept'],
            );
        });

        test('skips a label that gains members while confirmation is pending', async () => {
            confirmation = true;
            onConfirm = () => freshLabels.set('empty-a', label('empty-a', 1));
            await command.run(options({ unused: true }));
            assert.deepStrictEqual(deletedIds(), ['empty-b']);
            assert.match(logs.ok.mock.calls[0].arguments[0], /Deleted 1 label; skipped 1/);

            const { rows } = await readReport();
            assert.strictEqual(rows[0].action, 'skipped_now_in_use');
        });

        test('stops without prompting or deleting when a later scan page fails', async () => {
            pageErrors.set(2, new Error('Ghost is unavailable'));
            await command.run(options({ unused: true }));
            assert.strictEqual(mockConfirm.mock.callCount(), 0);
            assert.strictEqual(mockDelete.mock.callCount(), 0);
            assert.strictEqual(logs.ok.mock.callCount(), 0);
            assert.strictEqual(logs.error.mock.calls[0].arguments[0], 'Ghost is unavailable');
            assert.strictEqual(process.exitCode, 1);
            assert.strictEqual(await reportExists(), false);
        });

        test('gives every request a timeout, so an unanswered request cannot hang the run', async () => {
            confirmation = true;
            await command.run(options({ unused: true }));

            const calls = [...mockGet.mock.calls, ...mockDelete.mock.calls];
            assert.strictEqual(calls.length, 6);
            for (const { arguments: args } of calls) {
                assert.strictEqual(args.at(-1).timeout, 60000);
            }
        });

        test('uses the --timeout given', async () => {
            confirmation = true;
            await command.run(options({ unused: true, timeout: 300000 }));

            const calls = [...mockGet.mock.calls, ...mockDelete.mock.calls];
            assert.ok(calls.every(({ arguments: args }) => args.at(-1).timeout === 300000));
        });

        test('stops without prompting or deleting when a page times out', async () => {
            // What axios throws once `timeout` passes without a response
            const timeout = new Error('timeout of 60000ms exceeded');
            timeout.code = 'ECONNABORTED';
            pageErrors.set(2, timeout);

            await command.run(options({ unused: true }));

            assert.strictEqual(mockConfirm.mock.callCount(), 0);
            assert.strictEqual(mockDelete.mock.callCount(), 0);
            assert.strictEqual(
                logs.error.mock.calls[0].arguments[0],
                'timeout of 60000ms exceeded',
            );
            assert.strictEqual(process.exitCode, 1);
        });

        test('stops on a malformed labels page', async () => {
            pages = [{ not: 'an array' }];
            await command.run(options({ unused: true }));
            assert.strictEqual(mockConfirm.mock.callCount(), 0);
            assert.match(logs.error.mock.calls[0].arguments[0], /invalid labels page/);
        });

        test('stops on a malformed label', async () => {
            pages = [[{ id: 'nameless', count: { members: 0 } }]];
            await command.run(options({ unused: true }));
            assert.strictEqual(mockConfirm.mock.callCount(), 0);
            assert.match(logs.error.mock.calls[0].arguments[0], /invalid label\./);
        });

        test('stops if Ghost does not provide usable member counts', async () => {
            pages = [[{ id: 'unknown', name: 'Unknown count' }]];
            await command.run(options({ unused: true }));
            assert.strictEqual(mockConfirm.mock.callCount(), 0);
            assert.strictEqual(mockDelete.mock.callCount(), 0);
            assert.match(logs.error.mock.calls[0].arguments[0], /Cannot verify the member count/);
        });

        test('does not interpret an invalid count as zero', async () => {
            pages = [[label('invalid', null)]];
            await command.run(options({ unused: true }));
            assert.strictEqual(mockConfirm.mock.callCount(), 0);
            assert.strictEqual(mockDelete.mock.callCount(), 0);
            assert.match(logs.error.mock.calls[0].arguments[0], /Cannot verify the member count/);
        });

        test('an incomplete scan cannot be used to delete even with confirmation set', async () => {
            pageErrors.set(2, new Error('Page failed'));
            const context = {};
            await assert.rejects(
                deleteLabels.getScanTaskRunner(options({ unused: true })).run(context),
                /Page failed/,
            );
            context.confirmed = true;
            await assert.rejects(
                deleteLabels.getDeleteTaskRunner(options({ unused: true })).run(context),
                /completed scan/,
            );
            assert.strictEqual(mockDelete.mock.callCount(), 0);
        });

        test('a dry run cannot be used to delete even with confirmation set', async () => {
            const context = {};
            await deleteLabels
                .getScanTaskRunner(options({ unused: true, dryRun: true }))
                .run(context);
            context.confirmed = true;
            await assert.rejects(
                deleteLabels.getDeleteTaskRunner(options({ unused: true })).run(context),
                /explicit confirmation/,
            );
            assert.strictEqual(mockDelete.mock.callCount(), 0);
        });

        test('refuses deletion when the fresh count is missing', async () => {
            confirmation = true;
            onConfirm = () => freshLabels.set('empty-a', { id: 'empty-a', name: 'Unknown count' });
            await command.run(options({ unused: true }));
            assert.strictEqual(mockDelete.mock.callCount(), 0);
            assert.strictEqual(logs.ok.mock.callCount(), 0);
            assert.match(logs.error.mock.calls[0].arguments[0], /Cannot verify the member count/);
        });

        test('stops if a label disappears before it is rechecked', async () => {
            confirmation = true;
            onConfirm = () => freshLabels.delete('empty-a');
            await command.run(options({ unused: true }));
            assert.strictEqual(mockDelete.mock.callCount(), 0);
            assert.match(logs.error.mock.calls[0].arguments[0], /member count for label "unknown"/);
        });

        test('stops if a usage recheck fails', async () => {
            confirmation = true;
            readErrors.set('empty-a', new Error('Permission denied'));
            await command.run(options({ unused: true }));
            assert.strictEqual(mockDelete.mock.callCount(), 0);
            assert.match(logs.error.mock.calls[0].arguments[0], /Permission denied/);
        });

        test('reports partial deletion accurately and stops on a deletion failure', async () => {
            confirmation = true;
            pages = [[label('empty-a', 0), label('empty-b', 0), label('empty-c', 0)]];
            freshLabels = new Map(pages.flat().map((item) => [item.id, item]));
            const error = new Error('Request failed with status code 500');
            error.response = { data: { errors: [{ message: 'Delete failed' }] } };
            deleteErrors.set('empty-b', error);

            await command.run(options({ unused: true }));

            assert.deepStrictEqual(deletedIds(), ['empty-a', 'empty-b']);
            assert.strictEqual(logs.ok.mock.callCount(), 0);
            assert.strictEqual(
                logs.error.mock.calls[0].arguments[0],
                'Stopped after deleting 1 label: Delete failed',
            );
            assert.strictEqual(process.exitCode, 1);

            const { rows } = await readReport();
            assert.deepStrictEqual(
                rows.map(({ action, error: message }) => ({ action, message })),
                [
                    { action: 'deleted', message: '' },
                    { action: 'delete_failed', message: 'Delete failed' },
                    { action: 'not_attempted', message: '' },
                ],
            );
        });

        test('interrupted confirmation cancels without deletion', async () => {
            mockConfirm.mock.mockImplementationOnce(async () => {
                const error = new Error('User interrupted prompt');
                error.name = 'ExitPromptError';
                throw error;
            });
            await command.run(options({ unused: true }));
            assert.strictEqual(mockDelete.mock.callCount(), 0);
            assert.strictEqual(logs.error.mock.callCount(), 0);
            assert.match(logs.info.mock.calls.at(-1).arguments[0], /Cancelled/);
        });
    });

    describe('--labels', () => {
        test('fetches only the named labels and deletes them without rechecking their members', async () => {
            confirmation = true;
            await command.run(options({ labels: ['label used', 'EMPTY-B', 'Missing'] }));

            assert.deepStrictEqual(labelBrowses(), [
                {
                    include: 'count.members',
                    limit: 100,
                    page: 1,
                    order: 'id asc',
                    filter: "name:['label used','EMPTY-B','Missing'],slug:['label used','empty-b','missing']",
                },
            ]);
            assert.deepStrictEqual(deletedIds(), ['used', 'empty-b']);
            assert.strictEqual(labelReads(), 0);
            assert.match(
                mockConfirm.mock.calls[0].arguments[0].message,
                /2 labels .* 3 label assignments/,
            );
            assert.match(messages(logs.warn), /1 label named .* matched nothing in Ghost: Missing/);
        });

        test('pages through the results of a filter, matching names ignoring case', async () => {
            filterPageSize = 1;
            pages = [[label('vip', 0, 'VIP'), label('paid', 0, 'Paid'), label('other', 0)]];
            const context = {};

            await deleteLabels
                .getScanTaskRunner(options({ labels: ['vip', 'Paid', 'PAID'] }))
                .run(context);

            assert.deepStrictEqual(
                labelBrowses().map(({ page }) => page),
                [1, 2],
            );
            assert.deepStrictEqual(
                context.labels.map(({ id }) => id),
                ['vip', 'paid'],
            );
            assert.deepStrictEqual(
                context.toDelete.map(({ id }) => id),
                ['vip', 'paid'],
            );
            assert.deepStrictEqual(context.unmatched, []);
        });

        test('splits many names into batches of 50 and dedupes labels across them', async () => {
            const names = Array.from({ length: 120 }, (_, idx) => `Label n${idx}`);
            pages = [names.map((name, idx) => label(`n${idx}`, 0, name))];
            const context = {};

            // The slug of the first label is also named in the last batch
            await deleteLabels
                .getScanTaskRunner(options({ labels: [...names, 'n0'] }))
                .run(context);

            const batches = labelBrowses().map(({ filter }) => filterValues(filter).names);
            assert.deepStrictEqual(
                batches.map((batch) => batch.length),
                [50, 50, 21],
            );
            assert.deepStrictEqual(batches.flat(), [...names, 'n0']);
            assert.strictEqual(context.labels.length, 120);
            assert.strictEqual(context.toDelete.length, 120);
        });

        test('starts a new batch before a filter gets too long for a URL', async () => {
            const names = Array.from({ length: 30 }, (_, idx) => `${idx}`.padEnd(191, 'é'));
            pages = [names.map((name, idx) => label(`long${idx}`, 0, name))];
            const context = {};

            await deleteLabels.getScanTaskRunner(options({ labels: names })).run(context);

            const filters = labelBrowses().map(({ filter }) => filter);
            assert.ok(filters.length > 1);
            for (const filter of filters) {
                assert.ok(encodeURIComponent(filter).length <= 4000);
            }
            assert.deepStrictEqual(
                filters.flatMap((filter) => filterValues(filter).names),
                names,
            );
            assert.strictEqual(context.toDelete.length, 30);
        });

        test('fetches every label when a name contains a quote or backslash', async () => {
            confirmation = true;
            pages = [
                [
                    label('bobs-vip', 0, `Bob's "VIP"`),
                    label('trailing', 0, 'Trailing\\'),
                    label('other', 0, 'Other'),
                    label('untouched', 0, 'Untouched'),
                ],
            ];

            await command.run(options({ labels: [`Bob's "VIP"`, 'Trailing\\', 'Other'] }));

            assert.deepStrictEqual(
                labelBrowses().map(({ filter }) => filter),
                [undefined],
            );
            assert.deepStrictEqual(deletedIds(), ['bobs-vip', 'trailing', 'other']);
        });

        test('stops without prompting or deleting when a later batch fails', async () => {
            confirmation = true;
            const names = Array.from({ length: 60 }, (_, idx) => `Label n${idx}`);
            pages = [names.map((name, idx) => label(`n${idx}`, 0, name))];
            failingFilter = 'Label n55';

            await command.run(options({ labels: names }));

            assert.strictEqual(labelBrowses().length, 2);
            assert.strictEqual(mockConfirm.mock.callCount(), 0);
            assert.strictEqual(mockDelete.mock.callCount(), 0);
            assert.strictEqual(logs.error.mock.calls[0].arguments[0], 'Ghost is unavailable');
            assert.strictEqual(process.exitCode, 1);
        });
    });

    describe('--all', () => {
        test('refuses to run without a keep list or --force', async () => {
            await command.run(options({ all: true }));
            assert.strictEqual(mockGet.mock.callCount(), 0);
            assert.match(logs.error.mock.calls[0].arguments[0], /without a keep list/);
            assert.strictEqual(process.exitCode, 1);
        });

        test('deletes every label with --force, including ones with members', async () => {
            confirmation = true;
            await command.run(options({ all: true, force: true }));
            assert.deepStrictEqual(deletedIds(), ['used', 'empty-a', 'empty-b']);
            assert.strictEqual(labelReads(), 0);
            // Every label is fetched, page by page, without a filter
            assert.deepStrictEqual(
                labelBrowses().map(({ filter, page }) => ({ filter, page })),
                [1, 2].map((page) => ({ filter: undefined, page })),
            );
        });

        test('keeps the labels listed in --keep', async () => {
            confirmation = true;
            await command.run(options({ all: true, keep: ['Label Used'] }));
            assert.deepStrictEqual(deletedIds(), ['empty-a', 'empty-b']);
        });

        test('combines --keep and --keepFile, and writes the report next to the keep file', async () => {
            confirmation = true;
            const keepDir = path.join(tmpDir, 'keep');
            fs.mkdirSync(keepDir);
            const keepFile = path.join(keepDir, 'keep.csv');
            fs.writeFileSync(keepFile, 'label\nempty-a\n');

            await command.run(options({ all: true, keep: ['used'], keepFile }));

            assert.deepStrictEqual(deletedIds(), ['empty-b']);
            const { rows } = await readReport(keepDir);
            assert.deepStrictEqual(
                rows.map(({ action, id, kept_by, value }) => ({ action, id, kept_by, value })),
                [
                    { action: 'deleted', id: 'empty-b', kept_by: '', value: '' },
                    { action: 'kept', id: 'used', kept_by: 'slug', value: 'used' },
                    { action: 'kept', id: 'empty-a', kept_by: 'slug', value: 'empty-a' },
                ],
            );
        });

        test('reports keep values that match no label, without blocking the run', async () => {
            await command.run(
                options({ all: true, keep: ['used', 'Gone, "really"'], dryRun: true }),
            );

            assert.match(messages(logs.warn), /matched nothing in Ghost: Gone, "really"/);
            const { rows } = await readReport();
            assert.deepStrictEqual(rows.at(-1), {
                action: 'not_in_ghost',
                id: '',
                name: '',
                slug: '',
                member_count: '',
                kept_by: '',
                value: 'Gone, "really"',
                error: '',
            });
        });

        test('refuses to run when nothing on the keep list matches, unless forced', async () => {
            await command.run(options({ all: true, keep: ['nope'] }));
            assert.strictEqual(mockConfirm.mock.callCount(), 0);
            assert.match(logs.error.mock.calls[0].arguments[0], /None of the 1 labels to keep/);

            confirmation = true;
            await command.run(options({ all: true, keep: ['nope'], force: true }));
            assert.deepStrictEqual(deletedIds(), ['used', 'empty-a', 'empty-b']);
        });

        test('refuses an empty keep file, unless forced', async () => {
            const keepFile = writeCSV('label\n');

            await command.run(options({ all: true, keepFile }));
            assert.strictEqual(mockGet.mock.callCount(), 0);
            assert.match(logs.error.mock.calls[0].arguments[0], /keep list is empty/);

            await command.run(options({ all: true, keepFile, force: true, dryRun: true }));
            assert.strictEqual(mockGet.mock.callCount(), 2);
            assert.match(messages(logs.ok), /Dry run complete/);
        });

        test('does not treat an unmatched keep list as an error on a site with no labels', async () => {
            pages = [[]];
            await command.run(options({ all: true, keep: ['VIP'] }));
            assert.strictEqual(logs.error.mock.callCount(), 0);
            assert.match(logs.ok.mock.calls[0].arguments[0], /No labels to delete among 0 labels/);
        });

        test('stops when the keep file does not exist', async () => {
            await command.run(options({ all: true, keepFile: path.join(tmpDir, 'missing.csv') }));
            assert.strictEqual(mockGet.mock.callCount(), 0);
            assert.match(logs.error.mock.calls[0].arguments[0], /CSV file not found/);
        });

        test('deletes with more than one label at a time when asked', async () => {
            confirmation = true;
            await command.run(options({ all: true, force: true, concurrency: 2 }));
            assert.deepStrictEqual(deletedIds().sort(), ['empty-a', 'empty-b', 'used']);
        });
    });

    describe('command setup', () => {
        test('registers every option, deleting one label at a time by default', () => {
            const registered = {};
            const sywac = new Proxy(
                {},
                {
                    get: (_, type) => (name, config) => {
                        registered[name] = { type, ...config };
                    },
                },
            );

            command.setup(sywac);

            assert.deepStrictEqual(Object.keys(registered), [
                '-V --verbose',
                '--labels',
                '--all',
                '--unused',
                '--keep',
                '--keepFile',
                '--dryRun',
                '--force',
                '--concurrency',
                '--timeout',
                '--delayBetweenCalls',
            ]);
            assert.strictEqual(registered['--timeout'].defaultValue, 60000);
            assert.strictEqual(registered['--concurrency'].defaultValue, 1);
            assert.strictEqual(registered['--keep'].type, 'array');
            assert.strictEqual(registered['--keepFile'].type, 'string');
        });
    });

    describe('output', () => {
        test('lists the first 20 labels, or all of them with --verbose', async () => {
            pages = [Array.from({ length: 25 }, (_, idx) => label(`l${idx}`, 0))];

            await command.run(options({ unused: true, dryRun: true }));
            assert.match(messages(logs.info), /\.\.\.and 5 more/);
            assert.doesNotMatch(messages(logs.info), /Label l24 /);

            logs.info.mock.resetCalls();
            await command.run(options({ unused: true, dryRun: true, verbose: true }));
            assert.doesNotMatch(messages(logs.info), /more\./);
            assert.match(messages(logs.info), /Label l24 /);
        });

        test('writes a header-only report when there is nothing to report', async () => {
            const context = { args: { dryRun: true }, toDelete: [], toKeep: [], unmatched: [] };
            Object.assign(context, { deleted: [], skipped: [], failed: [] });

            const reportPath = await deleteLabels.writeReport(context);

            assert.strictEqual(
                fs.readFileSync(reportPath, 'utf8'),
                'action,id,name,slug,member_count,kept_by,value,error',
            );
        });
    });
});
