import { afterEach, beforeEach, describe, mock, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import fsUtils from '@tryghost/mg-fs-utils';
import { silentRenderer } from './helpers/silent-renderer.js';

let discoveredUsers;
let directory;
let csvPath;
const mockEdit = mock.fn();
const mockDiscover = mock.fn();

mock.module('@tryghost/admin-api', {
    defaultExport: function GhostAdminAPI() {
        return { users: { edit: mockEdit } };
    },
});
mock.module('../lib/batch-ghost-discover.js', {
    namedExports: { discover: mockDiscover },
});

const { default: updateStaffBio } = await import('../tasks/update-staff-bio.js');

const user = (slug, bio = null) => ({
    id: `id-${slug}`,
    slug,
    name: slug,
    bio,
    updated_at: '2026-01-01T00:00:00.000Z',
});

const run = (context, overrides = {}) =>
    updateStaffBio
        .getTaskRunner({
            ...silentRenderer,
            apiURL: 'http://localhost:2368/',
            adminAPIKey: 'test-key',
            csvPath,
            delayBetweenCalls: 0,
            ...overrides,
        })
        .run(context);

const writeRows = (rows) => writeFile(csvPath, fsUtils.csv.jsonToCSV(rows));

describe('Update staff bios from CSV', () => {
    beforeEach(async () => {
        directory = await mkdtemp(join(tmpdir(), 'gctools-update-staff-bio-'));
        csvPath = join(directory, 'staff.csv');
        discoveredUsers = [];
        mockEdit.mock.resetCalls();
        mockDiscover.mock.resetCalls();
        mockDiscover.mock.mockImplementation(async () => discoveredUsers);
        mockEdit.mock.mockImplementation(async (update) => ({
            ...discoveredUsers.find((staff) => staff.id === update.id),
            ...update,
        }));
    });

    afterEach(async () => {
        await rm(directory, { recursive: true, force: true });
    });

    test('fills empty bios, parses quoted CSV values, and preserves existing bios', async () => {
        discoveredUsers = [user('empty'), user('whitespace', '  '), user('existing', 'Keep me')];
        await writeFile(
            csvPath,
            'slug,bio\nempty,"  Writer, editor\nand photographer.  "\nwhitespace,New bio\nexisting,Replacement\n',
        );
        const context = { errors: [] };

        await run(context, { verbose: true });

        assert.deepStrictEqual(
            mockEdit.mock.calls.map((call) => call.arguments[0]),
            [
                {
                    id: 'id-empty',
                    bio: 'Writer, editor\nand photographer.',
                    updated_at: discoveredUsers[0].updated_at,
                },
                { id: 'id-whitespace', bio: 'New bio', updated_at: discoveredUsers[1].updated_at },
            ],
        );
        assert.strictEqual(context.updated.length, 2);
        assert.deepStrictEqual(context.skipped, [
            { slug: 'existing', existingBio: 'Keep me', newBio: 'Replacement' },
        ]);
        assert.strictEqual(context.args.delayBetweenCalls, 0);
        assert.strictEqual(mockDiscover.mock.calls[0].arguments[0].type, 'users');
    });

    test('keeps the first successful bio when a slug appears more than once', async () => {
        discoveredUsers = [user('duplicate')];
        await writeRows([
            { slug: 'duplicate', bio: 'First bio' },
            { slug: 'duplicate', bio: 'Second bio' },
        ]);
        const context = { errors: [] };

        await run(context);

        assert.strictEqual(mockEdit.mock.callCount(), 1);
        assert.strictEqual(context.updated[0].bio, 'First bio');
        assert.strictEqual(context.skipped[0].existingBio, 'First bio');
    });

    test('ignores empty CSV bios without clearing staff bios', async () => {
        discoveredUsers = [user('empty'), user('whitespace')];
        await writeRows([
            { slug: 'empty', bio: '' },
            { slug: 'whitespace', bio: '   ' },
        ]);

        await run({ errors: [] }, { verbose: true });

        assert.strictEqual(mockEdit.mock.callCount(), 0);
    });

    test('accepts 250 characters and exports longer bios and unmatched slugs', async () => {
        discoveredUsers = [user('limit'), user('too-long')];
        await writeRows([
            { slug: 'limit', bio: `  ${'a'.repeat(250)}  ` },
            { slug: 'too-long', bio: 'b'.repeat(251) },
            { slug: 'missing', bio: 'Missing user bio' },
        ]);
        const context = { errors: [] };

        await run(context, { verbose: true });

        assert.strictEqual(mockEdit.mock.callCount(), 1);
        assert.strictEqual(context.updated[0].bio.length, 250);
        assert.deepStrictEqual(await fsUtils.csv.parseCSV(join(directory, 'bios-too-long.csv')), [
            { slug: 'too-long', bio: 'b'.repeat(251), length: '251' },
        ]);
        assert.deepStrictEqual(await fsUtils.csv.parseCSV(join(directory, 'bios-not-found.csv')), [
            { slug: 'missing', bio: 'Missing user bio' },
        ]);
        assert.strictEqual(
            await readFile(csvPath, 'utf8'),
            fsUtils.csv.jsonToCSV([
                { slug: 'limit', bio: `  ${'a'.repeat(250)}  ` },
                { slug: 'too-long', bio: 'b'.repeat(251) },
                { slug: 'missing', bio: 'Missing user bio' },
            ]),
        );
    });

    test('reports missing slugs and API failures while continuing with later rows', async () => {
        discoveredUsers = [user('failed'), user('valid')];
        await writeRows([
            { slug: '', bio: 'Missing slug' },
            { slug: 'failed', bio: 'Failed bio' },
            { slug: 'valid', bio: 'Valid bio' },
        ]);
        mockEdit.mock.mockImplementation(async (update) => {
            if (update.id === 'id-failed') {
                throw new Error('API unavailable');
            }
            return { slug: 'valid', name: 'Valid user', bio: update.bio };
        });
        const context = { errors: [] };

        await assert.rejects(run(context), /Failed to process some rows/);

        assert.strictEqual(mockEdit.mock.callCount(), 2);
        assert.strictEqual(context.updated.length, 1);
        assert.strictEqual(context.errors.length, 2);
        assert.match(context.errors[0], /Row 1: Missing required field/);
        assert.match(context.errors[1], /Row 2: API unavailable \(slug: failed\)/);
    });

    test('stops without updating users if staff discovery fails', async () => {
        await writeRows([{ slug: 'staff', bio: 'New bio' }]);
        mockDiscover.mock.mockImplementation(async () => {
            throw new Error('Discovery failed');
        });
        const context = { errors: [] };

        await assert.rejects(run(context), /Discovery failed/);

        assert.strictEqual(mockEdit.mock.callCount(), 0);
        assert.deepStrictEqual(context.errors, ['Discovery failed']);
    });

    test('rejects an unreadable CSV before fetching or updating users', async () => {
        await assert.rejects(run({ errors: [] }), /ENOENT/);

        assert.strictEqual(mockDiscover.mock.callCount(), 0);
        assert.strictEqual(mockEdit.mock.callCount(), 0);
    });
});
