import {describe, test} from 'node:test';
import assert from 'node:assert/strict';
import {getRandomPostContent} from '../lib/random-post.js';

describe('Random post', function () {
    test('can create a random post', async function () {
        let startDate = new Date('2011-01-01T12:30:45.000Z');
        let endDate = new Date('2011-12-31T21:30:45.000Z');

        let randomPost = await getRandomPostContent({
            dateRange: {
                start: startDate,
                end: endDate
            }
        });

        assert.strictEqual(randomPost.tags.length, 1);
        assert.deepStrictEqual(randomPost.tags[0], '#gctools');

        assert.deepStrictEqual(randomPost.status, 'published');
        assert.deepStrictEqual(randomPost.visibility, 'public');

        assert.strictEqual(typeof randomPost.title, 'string');
        assert.strictEqual(typeof randomPost.excerpt, 'string');

        // Count number of <p> tags in HTML content
        assert.deepStrictEqual(randomPost.html.match(/<p>/g).length, 10);

        assert.ok(randomPost.created_at >= startDate);
        assert.ok(randomPost.created_at <= endDate);

        assert.ok(randomPost.updated_at <= endDate);
        assert.ok(randomPost.updated_at <= endDate);

        assert.ok(randomPost.published_at <= endDate);
        assert.ok(randomPost.published_at <= endDate);
    });

    test('can create a random post with specific options', async function () {
        let startDate = new Date('2011-01-01T12:30:45.000Z');
        let endDate = new Date('2011-12-31T21:30:45.000Z');

        let randomPost = await getRandomPostContent({
            status: 'draft',
            visibility: 'paid',
            tag: '#Test,Hello World',
            contentCount: 3,
            dateRange: {
                start: startDate,
                end: endDate
            }
        });

        assert.strictEqual(randomPost.tags.length, 2);
        assert.deepStrictEqual(randomPost.tags[0], '#Test');
        assert.deepStrictEqual(randomPost.tags[1], 'Hello World');

        assert.deepStrictEqual(randomPost.status, 'draft');
        assert.deepStrictEqual(randomPost.visibility, 'paid');

        assert.strictEqual(typeof randomPost.title, 'string');
        assert.strictEqual(typeof randomPost.excerpt, 'string');

        // Count number of <p> tags in HTML content
        assert.deepStrictEqual(randomPost.html.match(/<p>/g).length, 3);
    });
});
