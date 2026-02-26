import {describe, test, mock, beforeEach} from 'node:test';
import assert from 'node:assert/strict';

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

describe('Set podcast', function () {
    beforeEach(() => {
        mockEdit.mock.resetCalls();
        mockBrowse.mock.resetCalls();
    });

    test('can extract audio from Lexical content with direct audio node', async function () {
        const {extractFirstAudioFromLexical} = await import('../tasks/set-podcast.js');
        const audio = extractFirstAudioFromLexical(mockPosts[0].lexical);
        assert.strictEqual(audio, 'https://example.com/podcast1.mp3');
    });

    test('can extract audio from Lexical content with embed node', async function () {
        const {extractFirstAudioFromLexical} = await import('../tasks/set-podcast.js');
        const audio = extractFirstAudioFromLexical(mockPosts[1].lexical);
        assert.strictEqual(audio, 'https://soundcloud.com/example/podcast-episode');
    });

    test('can extract audio from Mobiledoc content with audio card', async function () {
        const {extractFirstAudioFromMobiledoc} = await import('../tasks/set-podcast.js');
        const audio = extractFirstAudioFromMobiledoc(mockPosts[2].mobiledoc);
        assert.strictEqual(audio, 'https://example.com/podcast2.mp3');
    });

    test('can extract audio from Mobiledoc content with embed card', async function () {
        const {extractFirstAudioFromMobiledoc} = await import('../tasks/set-podcast.js');
        const audio = extractFirstAudioFromMobiledoc(mockPosts[3].mobiledoc);
        assert.strictEqual(audio, 'https://anchor.fm/example/episodes/episode-1');
    });

    test('can extract audio from HTML content with audio tag', async function () {
        const {extractFirstAudio} = await import('../tasks/set-podcast.js');
        const audio = extractFirstAudio(mockPosts[4].html);
        assert.strictEqual(audio, 'https://example.com/podcast3.mp3');
    });

    test('can extract audio from HTML content with iframe embed', async function () {
        const {extractFirstAudio} = await import('../tasks/set-podcast.js');
        const audio = extractFirstAudio(mockPosts[5].html);
        assert.strictEqual(audio, 'https://spotify.com/embed/episode/123');
    });

    test('returns null when no audio is found in HTML', async function () {
        const {extractFirstAudio} = await import('../tasks/set-podcast.js');
        const audio = extractFirstAudio(mockPosts[6].html);
        assert.strictEqual(audio, null);
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
        assert.strictEqual(audio, null);
    });

    test('returns null when no audio is found in Mobiledoc', async function () {
        const {extractFirstAudioFromMobiledoc} = await import('../tasks/set-podcast.js');
        const mobiledocWithoutAudio = JSON.stringify({
            cards: [
                ['paragraph', {text: 'No audio here'}]
            ]
        });
        const audio = extractFirstAudioFromMobiledoc(mobiledocWithoutAudio);
        assert.strictEqual(audio, null);
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
        assert.strictEqual(context.processed, 7);
        // Should have updated 6 posts (the one with no audio should be skipped)
        assert.strictEqual(context.updated, 6);
        // Should have no errors
        assert.strictEqual(context.errors.length, 0);

        // Verify edit calls for each post with audio
        assert.strictEqual(mockApi.posts.edit.mock.callCount(), 6);
        assert.ok(mockApi.posts.edit.mock.calls.some((c) => {
            try {
                assert.deepStrictEqual(c.arguments, [{
                    id: '1',
                    og_description: 'https://example.com/podcast1.mp3',
                    title: 'Podcast with Lexical audio',
                    status: 'published',
                    updated_at: '2024-03-20T12:00:00.000Z'
                }]);
                return true;
            } catch {
                return false;
            }
        }));
        assert.ok(mockApi.posts.edit.mock.calls.some((c) => {
            try {
                assert.deepStrictEqual(c.arguments, [{
                    id: '2',
                    og_description: 'https://soundcloud.com/example/podcast-episode',
                    title: 'Podcast with Lexical embed',
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

        const setPodcastModule = await import('../tasks/set-podcast.js');
        const runner = setPodcastModule.default.getTaskRunner({
            apiURL: 'https://example.com',
            adminAPIKey: 'key',
            verbose: true
        });

        const context = {errors: []};
        await runner.run(context);

        // Should still process remaining posts after the error
        assert.strictEqual(context.processed, 6);
        // Should have one error
        assert.strictEqual(context.errors.length, 1);
        assert.ok(context.errors[0].includes('API Error'));
    });

    test('handles invalid JSON gracefully', async function () {
        const {extractFirstAudioFromLexical, extractFirstAudioFromMobiledoc} = await import('../tasks/set-podcast.js');

        const invalidJson = 'invalid json string';

        assert.strictEqual(extractFirstAudioFromLexical(invalidJson), null);
        assert.strictEqual(extractFirstAudioFromMobiledoc(invalidJson), null);
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
        assert.strictEqual(audio, 'https://example.com/nested-audio.mp3');
    });

    test('prioritizes audio over other podcast platforms in detection', async function () {
        const {extractFirstAudio} = await import('../tasks/set-podcast.js');

        const htmlWithMultiple = `
            <iframe src="https://spotify.com/embed/episode/123"></iframe>
            <audio src="https://example.com/direct-audio.mp3" controls></audio>
        `;

        const audio = extractFirstAudio(htmlWithMultiple);
        assert.strictEqual(audio, 'https://example.com/direct-audio.mp3');
    });
});
