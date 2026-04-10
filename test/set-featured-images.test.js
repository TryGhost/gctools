import {describe, test, mock, beforeEach} from 'node:test';
import assert from 'node:assert/strict';

// Mock the Ghost Admin API
const mockPosts = [
    {
        id: '1',
        title: 'Post with Lexical',
        status: 'published',
        updated_at: '2024-03-20T12:00:00.000Z',
        lexical: JSON.stringify({
            root: {
                children: [
                    {
                        type: 'image',
                        src: 'https://example.com/image1.jpg'
                    }
                ]
            }
        })
    },
    {
        id: '2',
        title: 'Post with Mobiledoc',
        status: 'published',
        updated_at: '2024-03-20T12:00:00.000Z',
        mobiledoc: JSON.stringify({
            cards: [
                ['image', {src: 'https://example.com/image2.jpg'}]
            ]
        })
    },
    {
        id: '3',
        title: 'Post with HTML',
        status: 'published',
        updated_at: '2024-03-20T12:00:00.000Z',
        html: '<img src="https://example.com/image3.jpg">'
    },
    {
        id: '4',
        title: 'Post with no images',
        status: 'published',
        updated_at: '2024-03-20T12:00:00.000Z',
        html: '<p>No images here</p>'
    }
];

const mockEdit = mock.fn(data => Promise.resolve(data));
const mockBrowse = mock.fn();

const mockApi = {
    posts: {
        browse: mockBrowse,
        edit: mockEdit
    }
};

mock.module('@tryghost/admin-api', {
    defaultExport: function GhostAdminAPI() {
        return mockApi;
    }
});
mock.module('../lib/batch-ghost-discover.js', {
    namedExports: {discover: mock.fn(() => Promise.resolve(mockPosts))}
});

describe('Set featured images', function () {
    beforeEach(() => {
        mockEdit.mock.resetCalls();
        mockBrowse.mock.resetCalls();
    });

    test('can extract images from Lexical content', async function () {
        const {extractFirstImageFromLexical} = await import('../tasks/set-featured-images.js');
        const image = extractFirstImageFromLexical(mockPosts[0].lexical);
        assert.strictEqual(image, 'https://example.com/image1.jpg');
    });

    test('can extract images from Mobiledoc content', async function () {
        const {extractFirstImageFromMobiledoc} = await import('../tasks/set-featured-images.js');
        const image = extractFirstImageFromMobiledoc(mockPosts[1].mobiledoc);
        assert.strictEqual(image, 'https://example.com/image2.jpg');
    });

    test('can extract images from HTML content', async function () {
        const {extractFirstImage} = await import('../tasks/set-featured-images.js');
        const image = extractFirstImage(mockPosts[2].html);
        assert.strictEqual(image, 'https://example.com/image3.jpg');
    });

    test('returns null when no image is found', async function () {
        const {extractFirstImage} = await import('../tasks/set-featured-images.js');
        const image = extractFirstImage(mockPosts[3].html);
        assert.strictEqual(image, null);
    });

    test('can process posts and set featured images', async function () {
        const setFeaturedImagesModule = await import('../tasks/set-featured-images.js');
        const runner = setFeaturedImagesModule.default.getTaskRunner({
            apiURL: 'https://example.com',
            adminAPIKey: 'key',
            verbose: true
        });

        const context = {errors: []};
        await runner.run(context);

        // Should have processed all posts
        assert.strictEqual(context.processed, 4);
        // Should have updated 3 posts (the one with no images should be skipped)
        assert.strictEqual(context.updated, 3);
        // Should have no errors
        assert.strictEqual(context.errors.length, 0);

        // Verify edit calls for each post with an image
        assert.strictEqual(mockApi.posts.edit.mock.callCount(), 3);
        assert.ok(mockApi.posts.edit.mock.calls.some((c) => {
            try {
                assert.deepStrictEqual(c.arguments, [{
                    id: '1',
                    feature_image: 'https://example.com/image1.jpg',
                    title: 'Post with Lexical',
                    status: 'published',
                    updated_at: '2024-03-20T12:00:00.000Z'
                }]);
                return true;
            } catch {
                return false;
            }
        }));
    });

    test('handles API errors gracefully', async function () {
        // Make the edit call fail for one post
        mockApi.posts.edit.mock.mockImplementationOnce(() => Promise.reject({message: 'API Error'}));

        const setFeaturedImagesModule = await import('../tasks/set-featured-images.js');
        const runner = setFeaturedImagesModule.default.getTaskRunner({
            apiURL: 'https://example.com',
            adminAPIKey: 'key',
            verbose: true
        });

        const context = {errors: []};
        await runner.run(context);

        // Should still process the remaining posts after the error
        assert.strictEqual(context.processed, 3);
        // Should have one error
        assert.strictEqual(context.errors.length, 1);
        assert.ok(context.errors[0].includes('API Error'));
    });
});
