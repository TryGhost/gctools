import {getRandomPostContent} from '../lib/random-post';

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

        expect(randomPost.tags).toBeArrayOfSize(1);
        expect(randomPost.tags[0]).toEqual('#gctools');

        expect(randomPost.status).toEqual('published');
        expect(randomPost.visibility).toEqual('public');

        expect(randomPost.title).toBeString();
        expect(randomPost.excerpt).toBeString();

        // Count number of <p> tags in HTML content
        expect(randomPost.html.match(/<p>/g).length).toEqual(10);

        expect(randomPost.created_at).toBeAfterOrEqualTo(startDate);
        expect(randomPost.created_at).toBeBeforeOrEqualTo(endDate);

        expect(randomPost.updated_at).toBeBeforeOrEqualTo(endDate);
        expect(randomPost.updated_at).toBeBeforeOrEqualTo(endDate);

        expect(randomPost.published_at).toBeBeforeOrEqualTo(endDate);
        expect(randomPost.published_at).toBeBeforeOrEqualTo(endDate);
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

        expect(randomPost.tags).toBeArrayOfSize(2);
        expect(randomPost.tags[0]).toEqual('#Test');
        expect(randomPost.tags[1]).toEqual('Hello World');

        expect(randomPost.status).toEqual('draft');
        expect(randomPost.visibility).toEqual('paid');

        expect(randomPost.title).toBeString();
        expect(randomPost.excerpt).toBeString();

        // Count number of <p> tags in HTML content
        expect(randomPost.html.match(/<p>/g).length).toEqual(3);
    });
});
