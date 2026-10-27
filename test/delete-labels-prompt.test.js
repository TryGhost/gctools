import { describe, test, mock } from 'node:test';
import assert from 'node:assert/strict';

let answers;
const mockPrompt = mock.fn(async () => answers);
const mockCommandRun = mock.fn(async () => {});
const mockGetLabels = mock.fn(async () => [{ name: 'VIP', value: 'VIP' }]);

mock.module('inquirer', {
    defaultExport: { prompt: mockPrompt, registerPrompt: () => {} },
});
mock.module('../commands/delete-labels.js', { defaultExport: { run: mockCommandRun } });
mock.module('../lib/ghost-api-choices.js', {
    namedExports: { getAPIMemberLabels: mockGetLabels },
});

const { default: prompt, toCommandOptions } = await import('../prompts/delete-labels.js');

const option = (name) => prompt.options.find((item) => item.name === name);

describe('Delete labels prompt', function () {
    test('asks for a mode, defaulting to unused labels, and previews by default', function () {
        assert.strictEqual(option('mode').default, 'unused');
        assert.deepStrictEqual(
            option('mode').choices.map(({ value }) => value),
            ['named', 'unused', 'allExcept', 'all'],
        );
        assert.strictEqual(option('dryRun').default, true);
    });

    test('only lists labels to pick in named mode, loading them by name', async function () {
        const labels = option('labels');

        assert.strictEqual(labels.when({ mode: 'named' }), true);
        assert.strictEqual(labels.when({ mode: 'unused' }), false);
        assert.deepStrictEqual(await labels.choices(), [{ name: 'VIP', value: 'VIP' }]);
        assert.deepStrictEqual(mockGetLabels.mock.calls[0].arguments, [{ returnKey: 'name' }]);
    });

    test('asks for labels to keep with unused and all-except, requiring one for all-except', function () {
        const keep = option('keep');

        assert.strictEqual(keep.when({ mode: 'unused' }), true);
        assert.strictEqual(keep.when({ mode: 'allExcept' }), true);
        assert.strictEqual(keep.when({ mode: 'all' }), false);
        assert.strictEqual(keep.validate('', { mode: 'unused' }), true);
        assert.match(keep.validate('  ', { mode: 'allExcept' }), /at least one/);
        assert.strictEqual(keep.validate('VIP', { mode: 'allExcept' }), true);
        assert.deepStrictEqual(keep.filter(' VIP, Paid '), ['VIP', 'Paid']);
        assert.strictEqual(keep.filter('  '), null);
    });

    test('maps each mode to the command flags', function () {
        const base = { apiURL: 'https://example.com', adminAPIKey: 'key', dryRun: true };

        assert.deepStrictEqual(toCommandOptions({ ...base, mode: 'named', labels: ['VIP'] }), {
            ...base,
            labels: ['VIP'],
            unused: false,
            all: false,
            force: false,
        });
        assert.deepStrictEqual(toCommandOptions({ ...base, mode: 'unused', keep: ['VIP'] }), {
            ...base,
            keep: ['VIP'],
            labels: null,
            unused: true,
            all: false,
            force: false,
        });
        assert.deepStrictEqual(toCommandOptions({ ...base, mode: 'allExcept', keep: ['VIP'] }), {
            ...base,
            keep: ['VIP'],
            labels: null,
            unused: false,
            all: true,
            force: false,
        });
        assert.deepStrictEqual(toCommandOptions({ ...base, mode: 'all' }), {
            ...base,
            labels: null,
            unused: false,
            all: true,
            force: true,
        });
    });

    test('runs the command with the mapped answers', async function () {
        answers = { apiURL: 'https://example.com', adminAPIKey: 'key', mode: 'unused' };

        await prompt.run();

        assert.deepStrictEqual(mockCommandRun.mock.calls[0].arguments[0], {
            apiURL: 'https://example.com',
            adminAPIKey: 'key',
            labels: null,
            unused: true,
            all: false,
            force: false,
        });
    });
});
