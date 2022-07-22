import {getRandomPostContent} from '../lib/generate.js';

describe('Generate random posts', function () {
    test('Creates a random post with default settings', async function () {
        const post = getRandomPostContent();

        expect(post.status).toBeString();
        expect(post.visibility).toBeString();
        expect(post.title).toBeString();
        expect(post.excerpt).toBeString();
        expect(post.html).toBeString();
        expect(post.html.split('\n').length).toEqual(10);
        expect(post.tags).toBeArray();
        expect(post.tags).toBeArrayOfSize(1);
        expect(post.tags[0]).toEqual('#gctools');
        expect(post.created_at).toBeDateString();
        expect(post.updated_at).toBeDateString();
        expect(post.published_at).toBeDateString();
    });

    test('Set title size', async function () {
        const post = getRandomPostContent({
            titleMinLength: 2,
            titleMaxLength: 4
        });

        expect(post.title.split(' ').length).toBeWithin(1, 5);
    });

    test('Set number of words per sentence', async function () {
        const post = getRandomPostContent({
            sentenceLowerBound: 2,
            sentenceUpperBound: 4
        });

        const postParagraphs = post.html.split('\n');
        const firstSentances = postParagraphs[0].replace('<p>', '').replace('</p>', '').match(/([^ \r\n][^!?\.\r\n]+[\w!?\.]+)/g);
        const firstSentenceWords = firstSentances[0].split(' ');
        const secondSentenceWords = firstSentances[1].split(' ');

        expect(firstSentenceWords.length).toBeWithin(1, 5);
        expect(secondSentenceWords.length).toBeWithin(1, 5);
    });

    test('Set number of sentences per paragraphs', async function () {
        const post = getRandomPostContent({
            paragraphLowerBound: 2,
            paragraphUpperBound: 4
        });

        const postParagraphs = post.html.split('\n');
        const firstSentances = postParagraphs[0].replace('<p>', '').replace('</p>', '').match(/([^ \r\n][^!?\.\r\n]+[\w!?\.]+)/g);

        expect(firstSentances.length).toBeWithin(1, 5);
    });

    test('Set number of paragraphs', async function () {
        const post = getRandomPostContent({
            contentCount: 3
        });

        expect(post.html.split('\n').length).toEqual(3);
    });

    test('Can set the status', async function () {
        const post = getRandomPostContent({
            status: 'draft'
        });

        expect(post.status).toEqual('draft');
    });

    test('Can set the visibility', async function () {
        const post = getRandomPostContent({
            visibility: 'paid'
        });

        expect(post.visibility).toEqual('paid');
    });

    test('Define the start & end date range', async function () {
        const post = getRandomPostContent({
            startDate: '2020-06-23T15:01:50.735Z',
            endDate: '2021-06-23T15:01:50.735Z'
        });

        expect(post.created_at).toBeDateString();
        expect(post.created_at).toBeAfterOrEqualTo(new Date('2020-06-23T15:01:50.735Z'));
        expect(post.created_at).toBeBeforeOrEqualTo(new Date('2021-06-23T15:01:50.735Z'));

        expect(post.updated_at).toBeDateString();
        expect(post.updated_at).toBeAfterOrEqualTo(new Date('2020-06-23T15:01:50.735Z'));
        expect(post.updated_at).toBeBeforeOrEqualTo(new Date('2021-06-23T15:01:50.735Z'));

        expect(post.published_at).toBeDateString();
        expect(post.published_at).toBeAfterOrEqualTo(new Date('2020-06-23T15:01:50.735Z'));
        expect(post.published_at).toBeBeforeOrEqualTo(new Date('2021-06-23T15:01:50.735Z'));
    });
});
