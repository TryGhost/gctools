import {jest} from '@jest/globals';

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

const mockApi = {
    posts: {
        browse: jest.fn(), // not used in test, but required for API shape
        edit: jest.fn().mockImplementation((data) => {
            return Promise.resolve(data);
        })
    }
};

jest.unstable_mockModule('@tryghost/admin-api', () => ({
    default: jest.fn().mockImplementation(() => mockApi)
}));
jest.unstable_mockModule('../lib/batch-ghost-discover.js', () => ({
    discover: jest.fn().mockResolvedValue(mockPosts)
}));

describe('Set featured images', function () {
    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();
        // Reset mockPosts to initial state
        mockPosts.length = 0;
        mockPosts.push(
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
        );
    });

    test('can extract images from Lexical content', async function () {
        const {extractFirstImageFromLexical} = await import('../tasks/set-featured-images.js');
        const image = extractFirstImageFromLexical(mockPosts[0].lexical);
        expect(image).toBe('https://example.com/image1.jpg');
    });

    test('can extract images from Mobiledoc content', async function () {
        const {extractFirstImageFromMobiledoc} = await import('../tasks/set-featured-images.js');
        const image = extractFirstImageFromMobiledoc(mockPosts[1].mobiledoc);
        expect(image).toBe('https://example.com/image2.jpg');
    });

    test('can extract images from HTML content', async function () {
        const {extractFirstImage} = await import('../tasks/set-featured-images.js');
        const image = extractFirstImage(mockPosts[2].html);
        expect(image).toBe('https://example.com/image3.jpg');
    });

    test('returns null when no image is found', async function () {
        const {extractFirstImage} = await import('../tasks/set-featured-images.js');
        const image = extractFirstImage(mockPosts[3].html);
        expect(image).toBeNull();
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
        expect(context.processed).toBe(4);
        // Should have updated 3 posts (the one with no images should be skipped)
        expect(context.updated).toBe(3);
        // Should have no errors
        expect(context.errors).toHaveLength(0);

        // Verify edit calls for each post with an image
        expect(mockApi.posts.edit).toHaveBeenCalledTimes(3);
        expect(mockApi.posts.edit).toHaveBeenCalledWith({
            id: '1',
            feature_image: 'https://example.com/image1.jpg',
            title: 'Post with Lexical',
            status: 'published',
            updated_at: '2024-03-20T12:00:00.000Z',
            tags: [{name: '#feature-image-set'}]
        });
    });

    test('adds feature-image-set tag when setting featured image', async function () {
        const setFeaturedImagesModule = await import('../tasks/set-featured-images.js');
        const runner = setFeaturedImagesModule.default.getTaskRunner({
            apiURL: 'https://example.com',
            adminAPIKey: 'key',
            verbose: true
        });

        const context = {errors: []};
        await runner.run(context);

        // Verify that the #feature-image-set tag is added
        expect(mockApi.posts.edit).toHaveBeenCalledWith(expect.objectContaining({
            tags: expect.arrayContaining([
                expect.objectContaining({
                    name: '#feature-image-set'
                })
            ])
        }));
    });

    test('preserves existing tags when adding feature-image-set tag', async function () {
        // Add a post with existing tags
        const postWithTags = {
            id: '5',
            title: 'Post with existing tags',
            status: 'published',
            updated_at: '2024-03-20T12:00:00.000Z',
            tags: [{name: 'existing-tag'}],
            html: '<img src="https://example.com/image5.jpg">'
        };
        
        mockPosts.push(postWithTags);

        const setFeaturedImagesModule = await import('../tasks/set-featured-images.js');
        const runner = setFeaturedImagesModule.default.getTaskRunner({
            apiURL: 'https://example.com',
            adminAPIKey: 'key',
            verbose: true
        });

        const context = {errors: []};
        await runner.run(context);

        // Verify that existing tags are preserved and #feature-image-set is added
        expect(mockApi.posts.edit).toHaveBeenCalledWith(expect.objectContaining({
            id: '5',
            tags: expect.arrayContaining([
                {name: 'existing-tag'},
                {name: '#feature-image-set'}
            ])
        }));
    });

    test('handles API errors gracefully', async function () {
        // Make the edit call fail for one post
        mockApi.posts.edit.mockRejectedValueOnce({message: 'API Error'});

        const setFeaturedImagesModule = await import('../tasks/set-featured-images.js');
        const runner = setFeaturedImagesModule.default.getTaskRunner({
            apiURL: 'https://example.com',
            adminAPIKey: 'key',
            verbose: true
        });

        const context = {errors: []};
        await runner.run(context);

        // Should still process the remaining posts after the error
        expect(context.processed).toBe(3);
        // Should have one error
        expect(context.errors).toHaveLength(1);
        expect(context.errors[0]).toContain('API Error');
    });
}); 