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
        expect(postsWithIds).toBeArrayOfSize(3);

        // Check first post
        expect(postsWithIds[0].slug).toEqual('my-great-post-684a32da145d7d001be71b4f');
        expect(postsWithIds[0].extractedId).toEqual('684a32da145d7d001be71b4f');
        expect(postsWithIds[0].cleanSlug).toEqual('my-great-post');

        // Check second post
        expect(postsWithIds[1].slug).toEqual('another-post-123abc456def789012345678');
        expect(postsWithIds[1].extractedId).toEqual('123abc456def789012345678');
        expect(postsWithIds[1].cleanSlug).toEqual('another-post');

        // Check third post (mixed case)
        expect(postsWithIds[2].slug).toEqual('mixed-case-507f1f77bcf86cd799439011');
        expect(postsWithIds[2].extractedId).toEqual('507f1f77bcf86cd799439011');
        expect(postsWithIds[2].cleanSlug).toEqual('mixed-case');
    });

    test('regex correctly identifies valid alphanumeric IDs', function () {
        const idRegex = /-([a-f0-9]{24,})$/i;

        // Should match these
        expect(idRegex.test('post-684a32da145d7d001be71b4f')).toBe(true);
        expect(idRegex.test('test-123abc456def789012345678')).toBe(true);
        expect(idRegex.test('mixed-507F1F77BCF86CD799439011')).toBe(true); // uppercase
        expect(idRegex.test('long-507f1f77bcf86cd799439011abcdef123456')).toBe(true); // longer than 24

        // Should NOT match these
        expect(idRegex.test('post-without-id')).toBe(false);
        expect(idRegex.test('post-123')).toBe(false); // too short
        expect(idRegex.test('post-123xyz')).toBe(false); // contains invalid chars
        expect(idRegex.test('post-123-456-789')).toBe(false); // contains dashes
        expect(idRegex.test('post-GHIJKLMNOPQRSTUVWXYZ123456')).toBe(false); // contains G-Z
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
            expect(match).not.toBeNull();
            expect(match[1]).toEqual(testCase.expectedId);
            
            const cleanSlug = testCase.input.replace(idRegex, '');
            expect(cleanSlug).toEqual(testCase.expectedClean);
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
            expect(idRegex.test(edgeCase)).toBe(false);
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
        
        expect(initTask).toBeObject();
        expect(initTask.title).toEqual('Initialising API connection');
        expect(initTask.task).toBeFunction();

        // Mock task context
        const ctx = {};
        const task = {output: ''};
        
        // Run the initialization
        initTask.task(ctx, task);

        // Check that context is set up correctly
        expect(ctx.args).toBeObject();
        expect(ctx.api).toBeObject();
        expect(ctx.posts).toBeArray();
        expect(ctx.postsWithIds).toBeArray();
        expect(ctx.updated).toBeArray();
        expect(ctx.idRegex).toBeInstanceOf(RegExp);
        
        // Check that the regex pattern is correct
        expect(ctx.idRegex.source).toEqual('-([a-f0-9]{24,})$');
        expect(ctx.idRegex.flags).toEqual('i');
        
        expect(task.output).toEqual('Initialised API connection for https://test.ghost.io');
    });
}); 