import { afterEach, beforeEach, describe, mock, test } from 'node:test';
import assert from 'node:assert/strict';

const mockRun = mock.fn();
const logOk = mock.fn();
const logError = mock.fn();
let previousExitCode;

mock.module('../tasks/update-staff-bio.js', {
    defaultExport: { getTaskRunner: () => ({ run: mockRun }) },
});
mock.module('@tryghost/pretty-cli', {
    namedExports: { ui: { log: { ok: logOk, error: logError } } },
});

const { default: command } = await import('../commands/update-staff-bio.js');

describe('Update staff bio command', () => {
    beforeEach(() => {
        previousExitCode = process.exitCode;
        process.exitCode = undefined;
        mockRun.mock.resetCalls();
        logOk.mock.resetCalls();
        logError.mock.resetCalls();
        mockRun.mock.mockImplementation(async () => {});
    });

    afterEach(() => {
        process.exitCode = previousExitCode;
    });

    test('reports success when CSV processing completes', async () => {
        await command.run({});

        assert.strictEqual(command.group, 'Staff:');
        assert.strictEqual(logOk.mock.callCount(), 1);
        assert.match(logOk.mock.calls[0].arguments[0], /Successfully processed CSV/);
        assert.strictEqual(logError.mock.callCount(), 0);
        assert.strictEqual(process.exitCode, undefined);
    });

    test('reports initialization failures without printing success', async () => {
        const error = new Error('CSV not found');
        mockRun.mock.mockImplementation(async () => {
            throw error;
        });

        await command.run({});

        assert.strictEqual(logOk.mock.callCount(), 0);
        assert.deepStrictEqual(logError.mock.calls[0].arguments[1], [error]);
        assert.strictEqual(process.exitCode, 1);
    });

    test('reports collected row errors and exits unsuccessfully', async () => {
        mockRun.mock.mockImplementation(async (context) => {
            context.errors.push('Row 2: API unavailable (slug: staff)');
            throw new Error('Failed to process some rows');
        });

        await command.run({});

        assert.strictEqual(logOk.mock.callCount(), 0);
        assert.deepStrictEqual(logError.mock.calls[0].arguments[1], [
            'Row 2: API unavailable (slug: staff)',
        ]);
        assert.strictEqual(process.exitCode, 1);
    });
});
