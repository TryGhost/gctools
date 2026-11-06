import { afterEach, beforeEach, describe, mock, test } from 'node:test';
import assert from 'node:assert/strict';
import { stripVTControlCharacters } from 'node:util';
import { silentRenderer } from './helpers/silent-renderer.js';

const tag = (id, posts, name = `Tag ${id}`, slug = id) => ({ id, name, slug, count: { posts } });
let pages;
let answers;
let originalExitCode;
let originalColumns;

const browse = mock.fn(async ({ page }) => {
    const pageNumber = page || 1;
    const response = [...pages[pageNumber - 1]];
    response.meta = { pagination: { next: pageNumber < pages.length ? pageNumber + 1 : null } };
    return response;
});
const deleteTag = mock.fn(async ({ id }) => pages.flat().find((item) => item.id === id));
const prompt = mock.fn(async () => answers);
const log = Object.assign(mock.fn(), { ok: mock.fn(), error: mock.fn() });

mock.module('@tryghost/admin-api', {
    defaultExport: class {
        constructor() {
            this.tags = { browse, delete: deleteTag };
        }
    },
});
mock.module('@tryghost/pretty-cli', { namedExports: { ui: { log } } });
mock.module('inquirer', { defaultExport: { prompt } });
mock.module('../lib/ghost-api-creds.js', { defaultExport: [] });

const { default: command } = await import('../commands/delete-unused-tags.js');
const { default: interactive } = await import('../prompts/delete-unused-tags.js');

const options = (overrides = {}) => ({
    ...silentRenderer,
    apiURL: 'https://example.com',
    adminAPIKey: 'test-key',
    delayBetweenCalls: 0,
    ...overrides,
});
const preview = () => stripVTControlCharacters(log.mock.calls[0].arguments[0]);
const summary = () => log.ok.mock.calls[0].arguments[0];
const tableRows = () => {
    const lines = preview().split('\n');
    return lines
        .slice(lines.findIndex((line) => line.includes('├')) + 1)
        .filter((line) => line.includes('│'))
        .map((line) =>
            line
                .split('│')
                .slice(1, -1)
                .map((value) => value.trim()),
        );
};

describe('delete-empty-tags', () => {
    beforeEach(() => {
        pages = [[tag('empty', 0), tag('low', 2), tag('boundary', 3), tag('used', 4)]];
        originalExitCode = process.exitCode;
        originalColumns = process.env.COLUMNS;
        process.exitCode = undefined;
        process.env.COLUMNS = '80';
        for (const fn of [browse, deleteTag, prompt, log, log.ok, log.error]) {
            fn.mock.resetCalls();
        }
    });

    afterEach(() => {
        process.exitCode = originalExitCode;
        if (originalColumns === undefined) {
            delete process.env.COLUMNS;
        } else {
            process.env.COLUMNS = originalColumns;
        }
    });

    for (const flag of ['dry-run', 'dryRun']) {
        test(`${flag} lists tag names, slugs and counts without deleting anything`, async () => {
            await command.run(options({ [flag]: true, maxPostCount: 3 }));

            assert.deepStrictEqual(tableRows(), [
                ['Tag empty', 'empty', '0'],
                ['Tag low', 'low', '2'],
                ['Tag boundary', 'boundary', '3'],
            ]);
            assert.match(preview(), /Tag\s+│ Slug\s+│ Post count/);
            assert.match(summary(), /3 tags would be deleted/);
            assert.match(summary(), /No tags were deleted/);
            assert.strictEqual(deleteTag.mock.callCount(), 0);
            assert.strictEqual(log.error.mock.callCount(), 0);
            assert.strictEqual(process.exitCode, undefined);
        });
    }

    test('defaults to previewing only tags with no posts', async () => {
        await command.run(options({ 'dry-run': true }));

        assert.deepStrictEqual(tableRows(), [['Tag empty', 'empty', '0']]);
        assert.strictEqual(browse.mock.calls[0].arguments[0].include, 'count.posts');
        assert.strictEqual(deleteTag.mock.callCount(), 0);
    });

    test('lists every matching tag across API pages without limiting the rows', async () => {
        const tags = Array.from({ length: 55 }, (_, index) => tag(`empty-${index}`, 0));
        pages = [tags.slice(0, 50), [...tags.slice(50), tag('used', 1)]];

        await command.run(options({ 'dry-run': true }));

        assert.strictEqual(browse.mock.callCount(), 2);
        assert.deepStrictEqual(
            tableRows(),
            tags.map((item) => [item.name, item.slug, '0']),
        );
        assert.match(summary(), /55 tags would be deleted/);
        assert.strictEqual(deleteTag.mock.callCount(), 0);
    });

    test('preserves long names, slugs and post counts when the terminal is narrow', async () => {
        process.env.COLUMNS = '40';
        const longName = `${'A long tag name '.repeat(12)}完整标签 END`;
        const longSlug = `${'a-long-tag-slug-'.repeat(12)}end`;
        pages = [[tag('long', 12345, longName, longSlug)]];

        await command.run(options({ dryRun: true, maxPostCount: 12345 }));

        const cells = tableRows();
        assert.strictEqual(
            cells
                .map(([name]) => name)
                .join('')
                .replace(/\s/g, ''),
            longName.replace(/\s/g, ''),
        );
        assert.strictEqual(cells.map(([, slug]) => slug).join(''), longSlug);
        assert.strictEqual(cells.map(([, , count]) => count).join(''), '12345');
        assert.doesNotMatch(preview(), /…|\.\.\./);
        assert.strictEqual(deleteTag.mock.callCount(), 0);
    });

    test('reports an empty preview when no tags match', async () => {
        pages = [[tag('used', 1)]];

        await command.run(options({ dryRun: true }));

        assert.deepStrictEqual(tableRows(), []);
        assert.match(summary(), /0 tags would be deleted/);
        assert.strictEqual(deleteTag.mock.callCount(), 0);
    });

    test('reports an empty preview when the site has no tags', async () => {
        pages = [[]];

        await command.run(options({ dryRun: true }));

        assert.deepStrictEqual(tableRows(), []);
        assert.match(summary(), /0 tags would be deleted/);
        assert.strictEqual(deleteTag.mock.callCount(), 0);
    });

    test('still deletes matching tags when dry run is disabled', async () => {
        await command.run(options({ maxPostCount: 3 }));

        assert.deepStrictEqual(
            deleteTag.mock.calls.map(({ arguments: [item] }) => item.id).sort(),
            ['boundary', 'empty', 'low'],
        );
        assert.strictEqual(log.mock.callCount(), 0);
        assert.match(summary(), /Successfully deleted 3 tags/);
    });

    test('reports API failures without printing a preview or success', async () => {
        const error = new Error('Ghost is unavailable');
        browse.mock.mockImplementationOnce(async () => {
            throw error;
        });

        await command.run(options({ dryRun: true }));

        assert.strictEqual(log.mock.callCount(), 0);
        assert.strictEqual(log.ok.mock.callCount(), 0);
        assert.strictEqual(deleteTag.mock.callCount(), 0);
        assert.deepStrictEqual(log.error.mock.calls[0].arguments[1], [error]);
        assert.strictEqual(process.exitCode, 1);
    });

    test('interactive preview uses the same table without deleting tags', async () => {
        answers = options({ dryRun: true, maxPostCount: 3 });

        await interactive.run();

        assert.ok(prompt.mock.calls[0].arguments[0].some((item) => item.name === 'dryRun'));
        assert.deepStrictEqual(tableRows(), [
            ['Tag empty', 'empty', '0'],
            ['Tag low', 'low', '2'],
            ['Tag boundary', 'boundary', '3'],
        ]);
        assert.match(summary(), /3 tags would be deleted/);
        assert.strictEqual(deleteTag.mock.callCount(), 0);
    });
});
