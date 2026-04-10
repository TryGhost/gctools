import {describe, test} from 'node:test';
import assert from 'node:assert/strict';
import cleanSlugs from '../tasks/clean-slugs.js';

describe('Clean Slugs', function () {
    test('can identify posts with alphanumeric IDs at the end of slugs', function () {
        // Test data with various slug formats
        const testPosts = [
            {
                id: 1,
                title: 'Test Post 1',
                slug: 'my-great-post-684a32da145d7d001be71b4f',
                updated_at: '2023-01-01T12:00:00.000Z'
            },
            {
                id: 2,
                title: 'Test Post 2',
                slug: 'another-post-123abc456def789012345678',
                updated_at: '2023-01-01T12:00:00.000Z'
            },
            {
                id: 3,
                title: 'Clean Post',
                slug: 'clean-post-without-id',
                updated_at: '2023-01-01T12:00:00.000Z'
            },
            {
                id: 4,
                title: 'Short ID Post',
                slug: 'post-with-short-id-123',
                updated_at: '2023-01-01T12:00:00.000Z'
            },
            {
                id: 5,
                title: 'Mixed Case ID',
                slug: 'mixed-case-507f1f77bcf86cd799439011',
                updated_at: '2023-01-01T12:00:00.000Z'
            }
        ];

        // The regex used in the actual code
        const idRegex = /-([a-f0-9]{24,})$/i;

        const postsWithIds = testPosts.filter((post) => {
            if (post.slug && idRegex.test(post.slug)) {
                const match = post.slug.match(idRegex);
                post.extractedId = match[1];
                post.cleanSlug = post.slug.replace(idRegex, '');
                return true;
            }
            return false;
        });

        // Should identify 3 posts with IDs (24+ character alphanumeric strings)
        assert.strictEqual(postsWithIds.length, 3);

        // Check first post
        assert.deepStrictEqual(postsWithIds[0].slug, 'my-great-post-684a32da145d7d001be71b4f');
        assert.deepStrictEqual(postsWithIds[0].extractedId, '684a32da145d7d001be71b4f');
        assert.deepStrictEqual(postsWithIds[0].cleanSlug, 'my-great-post');

        // Check second post
        assert.deepStrictEqual(postsWithIds[1].slug, 'another-post-123abc456def789012345678');
        assert.deepStrictEqual(postsWithIds[1].extractedId, '123abc456def789012345678');
        assert.deepStrictEqual(postsWithIds[1].cleanSlug, 'another-post');

        // Check third post (mixed case)
        assert.deepStrictEqual(postsWithIds[2].slug, 'mixed-case-507f1f77bcf86cd799439011');
        assert.deepStrictEqual(postsWithIds[2].extractedId, '507f1f77bcf86cd799439011');
        assert.deepStrictEqual(postsWithIds[2].cleanSlug, 'mixed-case');
    });

    test('regex correctly identifies valid alphanumeric IDs', function () {
        const idRegex = /-([a-f0-9]{24,})$/i;

        // Should match these
        assert.strictEqual(idRegex.test('post-684a32da145d7d001be71b4f'), true);
        assert.strictEqual(idRegex.test('test-123abc456def789012345678'), true);
        assert.strictEqual(idRegex.test('mixed-507F1F77BCF86CD799439011'), true); // uppercase
        assert.strictEqual(idRegex.test('long-507f1f77bcf86cd799439011abcdef123456'), true); // longer than 24

        // Should NOT match these
        assert.strictEqual(idRegex.test('post-without-id'), false);
        assert.strictEqual(idRegex.test('post-123'), false); // too short
        assert.strictEqual(idRegex.test('post-123xyz'), false); // contains invalid chars
        assert.strictEqual(idRegex.test('post-123-456-789'), false); // contains dashes
        assert.strictEqual(idRegex.test('post-GHIJKLMNOPQRSTUVWXYZ123456'), false); // contains G-Z
    });

    test('regex extracts correct ID and produces clean slug', function () {
        const idRegex = /-([a-f0-9]{24,})$/i;

        const testCases = [
            {
                input: 'my-awesome-post-684a32da145d7d001be71b4f',
                expectedId: '684a32da145d7d001be71b4f',
                expectedClean: 'my-awesome-post'
            },
            {
                input: 'single-word-507f1f77bcf86cd799439011',
                expectedId: '507f1f77bcf86cd799439011',
                expectedClean: 'single-word'
            },
            {
                input: 'a-b-c-d-e-f-123abc456def789012345678',
                expectedId: '123abc456def789012345678',
                expectedClean: 'a-b-c-d-e-f'
            }
        ];

        testCases.forEach((testCase) => {
            const match = testCase.input.match(idRegex);
            assert.notStrictEqual(match, null);
            assert.deepStrictEqual(match[1], testCase.expectedId);

            const cleanSlug = testCase.input.replace(idRegex, '');
            assert.deepStrictEqual(cleanSlug, testCase.expectedClean);
        });
    });

    test('handles edge cases correctly', function () {
        const idRegex = /-([a-f0-9]{24,})$/i;

        // Edge cases that should NOT match
        const edgeCases = [
            '', // empty string
            'no-dashes', // no dash at all
            'ends-with-dash-', // ends with dash but no ID
            'has-g-in-id-684a32da145d7d001be71b4g', // contains 'g'
            'too-short-684a32da145d7d001be71b', // 23 chars (too short)
            'invalid-chars-684a32da145d7d001be71xyz' // contains 'x', 'y', 'z'
        ];

        edgeCases.forEach((edgeCase) => {
            assert.strictEqual(idRegex.test(edgeCase), false);
        });
    });

    test('initialise function sets up context correctly', function () {
        // Use a valid Ghost API key format: {24 hex chars}:{64 hex chars}
        const options = {
            apiURL: 'https://test.ghost.io',
            adminAPIKey: '507f1f77bcf86cd799439011:507f1f77bcf86cd7994390117bcf86cd7994390117bcf86cd7994390117bcf86cd',
            verbose: true,
            'dry-run': false,
            delayBetweenCalls: 100
        };

        const initTask = cleanSlugs.initialise(options);

        assert.strictEqual(typeof initTask, 'object');
        assert.deepStrictEqual(initTask.title, 'Initialising API connection');
        assert.strictEqual(typeof initTask.task, 'function');

        // Mock task context
        const ctx = {};
        const task = {output: ''};

        // Run the initialization
        initTask.task(ctx, task);

        // Check that context is set up correctly
        assert.strictEqual(typeof ctx.args, 'object');
        assert.strictEqual(typeof ctx.api, 'object');
        assert.ok(Array.isArray(ctx.posts));
        assert.ok(Array.isArray(ctx.postsWithIds));
        assert.ok(Array.isArray(ctx.updated));
        assert.ok(ctx.idRegex instanceof RegExp);

        // Check that the regex pattern is correct
        assert.deepStrictEqual(ctx.idRegex.source, '-([a-f0-9]{24,})$');
        assert.deepStrictEqual(ctx.idRegex.flags, 'i');

        assert.deepStrictEqual(task.output, 'Initialised API connection for https://test.ghost.io');
    });
});
