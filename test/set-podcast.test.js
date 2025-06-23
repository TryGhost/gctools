import {jest} from '@jest/globals';

// Mock the Ghost Admin API
const mockPosts = [
    {
        id: '1',
        title: 'Podcast with Lexical audio',
        status: 'published',
        updated_at: '2024-03-20T12:00:00.000Z',
        tags: [{name: 'podcast', slug: 'podcast'}],
        lexical: JSON.stringify({
            root: {
                children: [
                    {
                        type: 'audio',
                        src: 'https://example.com/podcast1.mp3'
                    }
                ]
            }
        })
    },
    {
        id: '2',
        title: 'Podcast with Lexical embed',
        status: 'published',
        updated_at: '2024-03-20T12:00:00.000Z',
        tags: [{name: 'podcast', slug: 'podcast'}],
        lexical: JSON.stringify({
            root: {
                children: [
                    {
                        type: 'embed',
                        url: 'https://soundcloud.com/example/podcast-episode'
                    }
                ]
            }
        })
    },
    {
        id: '3',
        title: 'Podcast with Mobiledoc audio',
        status: 'published',
        updated_at: '2024-03-20T12:00:00.000Z',
        tags: [{name: 'podcast', slug: 'podcast'}],
        mobiledoc: JSON.stringify({
            cards: [
                ['audio', {src: 'https://example.com/podcast2.mp3'}]
            ]
        })
    },
    {
        id: '4',
        title: 'Podcast with Mobiledoc embed',
        status: 'published',
        updated_at: '2024-03-20T12:00:00.000Z',
        tags: [{name: 'podcast', slug: 'podcast'}],
        mobiledoc: JSON.stringify({
            cards: [
                ['embed', {url: 'https://anchor.fm/example/episodes/episode-1'}]
            ]
        })
    },
    {
        id: '5',
        title: 'Podcast with HTML audio tag',
        status: 'published',
        updated_at: '2024-03-20T12:00:00.000Z',
        tags: [{name: 'podcast', slug: 'podcast'}],
        html: '<audio src="https://example.com/podcast3.mp3" controls></audio>'
    },
    {
        id: '6',
        title: 'Podcast with iframe embed',
        status: 'published',
        updated_at: '2024-03-20T12:00:00.000Z',
        tags: [{name: 'podcast', slug: 'podcast'}],
        html: '<iframe src="https://spotify.com/embed/episode/123" width="100%" height="152"></iframe>'
    },
    {
        id: '7',
        title: 'Podcast with no audio',
        status: 'published',
        updated_at: '2024-03-20T12:00:00.000Z',
        tags: [{name: 'podcast', slug: 'podcast'}],
        html: '<p>This podcast post has no audio content</p>'
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

describe('Set podcast', function () {
    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();
    });

    test('can extract audio from Lexical content with direct audio node', async function () {
        const {extractFirstAudioFromLexical} = await import('../tasks/set-podcast.js');
        const audio = extractFirstAudioFromLexical(mockPosts[0].lexical);
        expect(audio).toBe('https://example.com/podcast1.mp3');
    });

    test('can extract audio from Lexical content with embed node', async function () {
        const {extractFirstAudioFromLexical} = await import('../tasks/set-podcast.js');
        const audio = extractFirstAudioFromLexical(mockPosts[1].lexical);
        expect(audio).toBe('https://soundcloud.com/example/podcast-episode');
    });

    test('can extract audio from Mobiledoc content with audio card', async function () {
        const {extractFirstAudioFromMobiledoc} = await import('../tasks/set-podcast.js');
        const audio = extractFirstAudioFromMobiledoc(mockPosts[2].mobiledoc);
        expect(audio).toBe('https://example.com/podcast2.mp3');
    });

    test('can extract audio from Mobiledoc content with embed card', async function () {
        const {extractFirstAudioFromMobiledoc} = await import('../tasks/set-podcast.js');
        const audio = extractFirstAudioFromMobiledoc(mockPosts[3].mobiledoc);
        expect(audio).toBe('https://anchor.fm/example/episodes/episode-1');
    });

    test('can extract audio from HTML content with audio tag', async function () {
        const {extractFirstAudio} = await import('../tasks/set-podcast.js');
        const audio = extractFirstAudio(mockPosts[4].html);
        expect(audio).toBe('https://example.com/podcast3.mp3');
    });

    test('can extract audio from HTML content with iframe embed', async function () {
        const {extractFirstAudio} = await import('../tasks/set-podcast.js');
        const audio = extractFirstAudio(mockPosts[5].html);
        expect(audio).toBe('https://spotify.com/embed/episode/123');
    });

    test('returns null when no audio is found in HTML', async function () {
        const {extractFirstAudio} = await import('../tasks/set-podcast.js');
        const audio = extractFirstAudio(mockPosts[6].html);
        expect(audio).toBeNull();
    });

    test('returns null when no audio is found in Lexical', async function () {
        const {extractFirstAudioFromLexical} = await import('../tasks/set-podcast.js');
        const lexicalWithoutAudio = JSON.stringify({
            root: {
                children: [
                    {
                        type: 'paragraph',
                        children: [{type: 'text', text: 'No audio here'}]
                    }
                ]
            }
        });
        const audio = extractFirstAudioFromLexical(lexicalWithoutAudio);
        expect(audio).toBeNull();
    });

    test('returns null when no audio is found in Mobiledoc', async function () {
        const {extractFirstAudioFromMobiledoc} = await import('../tasks/set-podcast.js');
        const mobiledocWithoutAudio = JSON.stringify({
            cards: [
                ['paragraph', {text: 'No audio here'}]
            ]
        });
        const audio = extractFirstAudioFromMobiledoc(mobiledocWithoutAudio);
        expect(audio).toBeNull();
    });

    test('can process posts and set Facebook descriptions', async function () {
        const setPodcastModule = await import('../tasks/set-podcast.js');
        const runner = setPodcastModule.default.getTaskRunner({
            apiURL: 'https://example.com',
            adminAPIKey: 'key',
            verbose: true
        });

        const context = {errors: []};
        await runner.run(context);

        // Should have processed all posts
        expect(context.processed).toBe(7);
        // Should have updated 6 posts (the one with no audio should be skipped)
        expect(context.updated).toBe(6);
        // Should have no errors
        expect(context.errors).toHaveLength(0);

        // Verify edit calls for each post with audio
        expect(mockApi.posts.edit).toHaveBeenCalledTimes(6);
        expect(mockApi.posts.edit).toHaveBeenCalledWith({
            id: '1',
            og_description: 'https://example.com/podcast1.mp3',
            title: 'Podcast with Lexical audio',
            status: 'published',
            updated_at: '2024-03-20T12:00:00.000Z'
        });
        expect(mockApi.posts.edit).toHaveBeenCalledWith({
            id: '2',
            og_description: 'https://soundcloud.com/example/podcast-episode',
            title: 'Podcast with Lexical embed',
            status: 'published',
            updated_at: '2024-03-20T12:00:00.000Z'
        });
    });

    test('handles API errors gracefully', async function () {
        // Make the edit call fail for one post
        mockApi.posts.edit.mockRejectedValueOnce({message: 'API Error'});

        const setPodcastModule = await import('../tasks/set-podcast.js');
        const runner = setPodcastModule.default.getTaskRunner({
            apiURL: 'https://example.com',
            adminAPIKey: 'key',
            verbose: true
        });

        const context = {errors: []};
        await runner.run(context);

        // Should still process remaining posts after the error
        expect(context.processed).toBe(6);
        // Should have one error
        expect(context.errors).toHaveLength(1);
        expect(context.errors[0]).toContain('API Error');
    });

    test('handles invalid JSON gracefully', async function () {
        const {extractFirstAudioFromLexical, extractFirstAudioFromMobiledoc} = await import('../tasks/set-podcast.js');
        
        const invalidJson = 'invalid json string';
        
        expect(extractFirstAudioFromLexical(invalidJson)).toBeNull();
        expect(extractFirstAudioFromMobiledoc(invalidJson)).toBeNull();
    });

    test('handles nested Lexical content', async function () {
        const {extractFirstAudioFromLexical} = await import('../tasks/set-podcast.js');
        
        const nestedLexical = JSON.stringify({
            root: {
                children: [
                    {
                        type: 'paragraph',
                        children: [
                            {
                                type: 'audio',
                                src: 'https://example.com/nested-audio.mp3'
                            }
                        ]
                    }
                ]
            }
        });
        
        const audio = extractFirstAudioFromLexical(nestedLexical);
        expect(audio).toBe('https://example.com/nested-audio.mp3');
    });

    test('prioritizes audio over other podcast platforms in detection', async function () {
        const {extractFirstAudio} = await import('../tasks/set-podcast.js');
        
        const htmlWithMultiple = `
            <iframe src="https://spotify.com/embed/episode/123"></iframe>
            <audio src="https://example.com/direct-audio.mp3" controls></audio>
        `;
        
        const audio = extractFirstAudio(htmlWithMultiple);
        expect(audio).toBe('https://example.com/direct-audio.mp3');
    });
}); 