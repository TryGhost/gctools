import {describe, test} from 'node:test';
import assert from 'node:assert/strict';
import cleanStaffSlugs, {
    getSlugCleanupPlan,
    idSuffixRegex
} from '../tasks/clean-staff-slugs.js';

describe('Clean Staff Slugs', function () {
    test('identifies staff users with Ghost ID suffixes', function () {
        const users = [
            {
                id: 'user-1',
                name: 'First Last',
                slug: 'first-last-6a32d1c818627a48420e689d'
            },
            {
                id: 'user-2',
                name: 'Clean User',
                slug: 'clean-user'
            },
            {
                id: 'user-3',
                name: 'Short Suffix',
                slug: 'short-suffix-123'
            }
        ];

        const plan = getSlugCleanupPlan(users);

        assert.strictEqual(plan.candidates.length, 1);
        assert.strictEqual(plan.updateable.length, 1);
        assert.strictEqual(plan.skipped.length, 0);
        assert.strictEqual(plan.updateable[0].slug, 'first-last-6a32d1c818627a48420e689d');
        assert.strictEqual(plan.updateable[0].cleanSlug, 'first-last');
        assert.strictEqual(plan.updateable[0].extractedId, '6a32d1c818627a48420e689d');
    });

    test('does not match non-Ghost-ID suffixes', function () {
        assert.strictEqual(idSuffixRegex.test('first-last-6a32d1c818627a48420e689d'), true);
        assert.strictEqual(idSuffixRegex.test('first-last-6A32D1C818627A48420E689D'), true);
        assert.strictEqual(idSuffixRegex.test('first-last-6a32d1c818627a48420e689'), false);
        assert.strictEqual(idSuffixRegex.test('first-last-6a32d1c818627a48420e689dd'), false);
        assert.strictEqual(idSuffixRegex.test('first-last-6a32d1c818627a48420e689g'), false);
        assert.strictEqual(idSuffixRegex.test('first-last'), false);
    });

    test('skips users when the clean slug already exists', function () {
        const users = [
            {
                id: 'user-1',
                name: 'First Last',
                slug: 'first-last-6a32d1c818627a48420e689d'
            },
            {
                id: 'user-2',
                name: 'Existing First Last',
                slug: 'first-last'
            }
        ];

        const plan = getSlugCleanupPlan(users);

        assert.strictEqual(plan.candidates.length, 1);
        assert.strictEqual(plan.updateable.length, 0);
        assert.strictEqual(plan.skipped.length, 1);
        assert.strictEqual(plan.skipped[0].reason, 'duplicate-clean-slug');
        assert.strictEqual(plan.skipped[0].duplicateUsers[0].id, 'user-2');
    });

    test('skips all users that would resolve to the same clean slug', function () {
        const users = [
            {
                id: 'user-1',
                name: 'First Last One',
                slug: 'first-last-6a32d1c818627a48420e689d'
            },
            {
                id: 'user-2',
                name: 'First Last Two',
                slug: 'first-last-507f1f77bcf86cd799439011'
            }
        ];

        const plan = getSlugCleanupPlan(users);

        assert.strictEqual(plan.candidates.length, 2);
        assert.strictEqual(plan.updateable.length, 0);
        assert.strictEqual(plan.skipped.length, 2);
        assert.deepStrictEqual(plan.skipped.map(candidate => candidate.reason), [
            'multiple-id-suffixed-users',
            'multiple-id-suffixed-users'
        ]);
    });

    test('initialise function sets up context correctly', function () {
        const options = {
            apiURL: 'https://test.ghost.io',
            adminAPIKey: '507f1f77bcf86cd799439011:507f1f77bcf86cd7994390117bcf86cd7994390117bcf86cd7994390117bcf86cd',
            verbose: true,
            dryRun: true,
            delayBetweenCalls: 100
        };

        const initTask = cleanStaffSlugs.initialise(options);
        const ctx = {};
        const task = {output: ''};

        initTask.task(ctx, task);

        assert.strictEqual(typeof ctx.args, 'object');
        assert.strictEqual(typeof ctx.api, 'object');
        assert.ok(Array.isArray(ctx.users));
        assert.ok(Array.isArray(ctx.usersWithIdSuffix));
        assert.ok(Array.isArray(ctx.usersToUpdate));
        assert.ok(Array.isArray(ctx.updated));
        assert.ok(Array.isArray(ctx.skipped));
        assert.ok(ctx.idRegex instanceof RegExp);
        assert.strictEqual(ctx.idRegex.source, '-([a-f0-9]{24})$');
        assert.strictEqual(ctx.idRegex.flags, 'i');
        assert.strictEqual(task.output, 'Initialised API connection for https://test.ghost.io');
    });
});
