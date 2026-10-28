import { describe, test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'fs-extra';
import errors from '@tryghost/errors';
import {
    normalise,
    keepValuesFrom,
    getKeepValues,
    findMatches,
    readKeepFile,
} from '../lib/keep-list.js';

describe('keep-list', function () {
    let tmpDir;

    beforeEach(() => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gctools-keep-list-'));
    });

    afterEach(() => {
        fs.removeSync(tmpDir);
    });

    test('normalise trims, lower-cases and treats missing values as empty', function () {
        assert.strictEqual(normalise('  VIP '), 'vip');
        assert.strictEqual(normalise(undefined), '');
        assert.strictEqual(normalise(42), '42');
    });

    test('keepValuesFrom drops blanks and dedupes case-insensitively, keeping the first raw value', function () {
        assert.deepStrictEqual(keepValuesFrom([' VIP ', 'vip', '', null, 'Paid']), [
            { raw: 'VIP', normalised: 'vip' },
            { raw: 'Paid', normalised: 'paid' },
        ]);
        assert.deepStrictEqual(keepValuesFrom(null), []);
    });

    test('getKeepValues reads the first column, and nothing from no rows', function () {
        assert.deepStrictEqual(getKeepValues([{ a: 'One', b: 'ignored' }]), [
            { raw: 'One', normalised: 'one' },
        ]);
        assert.deepStrictEqual(getKeepValues([]), []);
        assert.deepStrictEqual(getKeepValues(undefined), []);
    });

    test('findMatches returns every value naming the item, in keep list order', function () {
        const item = { name: 'VIP Members', slug: 'vip' };
        const values = keepValuesFrom(['vip members', 'VIP', 'other']);

        assert.deepStrictEqual(findMatches(item, values, 'either'), [
            { matchedBy: 'name', csvValue: { raw: 'vip members', normalised: 'vip members' } },
            { matchedBy: 'slug', csvValue: { raw: 'VIP', normalised: 'vip' } },
        ]);
        assert.deepStrictEqual(
            findMatches(item, values, 'slug').map(({ matchedBy }) => matchedBy),
            ['slug'],
        );
        assert.deepStrictEqual(findMatches(item, keepValuesFrom(['VIP']), 'name'), []);
    });

    test('findMatches prefers the slug when a value equals both slug and name', function () {
        const matches = findMatches(
            { name: 'news', slug: 'news' },
            keepValuesFrom(['News']),
            'either',
        );

        assert.deepStrictEqual(
            matches.map(({ matchedBy }) => matchedBy),
            ['slug'],
        );
    });

    test('readKeepFile returns the column and keep values', async function () {
        const csvFile = path.join(tmpDir, 'keep.csv');
        fs.writeFileSync(csvFile, 'label\nVIP\nvip\nPaid\n');

        assert.deepStrictEqual(await readKeepFile(csvFile), {
            column: 'label',
            keepValues: [
                { raw: 'VIP', normalised: 'vip' },
                { raw: 'Paid', normalised: 'paid' },
            ],
        });
    });

    test('readKeepFile rejects a missing file', async function () {
        await assert.rejects(readKeepFile(path.join(tmpDir, 'missing.csv')), (error) => {
            assert.ok(error instanceof errors.NotFoundError);
            assert.match(error.message, /CSV file not found/);
            return true;
        });
    });

    test('readKeepFile rejects a file it cannot parse', async function () {
        // A directory exists, but can't be read as a CSV
        await assert.rejects(readKeepFile(tmpDir), (error) => {
            assert.ok(error instanceof errors.ValidationError);
            assert.match(error.message, /Failed to parse CSV file/);
            return true;
        });
    });
});
