require('./utils');
// const testUtils = require('./utils');

const {getRandomPostContent} = require('../lib/random-post');

describe('Random post', function () {
    it('can create a random post', async function () {
        let startDate = new Date('2011-01-01T12:30:45.000Z');
        let endDate = new Date('2011-12-31T21:30:45.000Z');

        let randomPost = await getRandomPostContent({
            dateRange: {
                start: startDate,
                end: endDate
            }
        });

        randomPost.tags.should.be.an.Array().with.lengthOf(1);
        randomPost.tags[0].should.eql('#gctools');

        randomPost.status.should.eql('published');
        randomPost.visibility.should.eql('public');

        randomPost.title.should.be.a.String();
        randomPost.excerpt.should.be.a.String();
        randomPost.meta_title.should.be.a.String();
        randomPost.meta_description.should.be.a.String();

        // Count number of <p> tags in HTML content
        randomPost.html.match(/<p>/g).length.should.eql(10);

        randomPost.created_at.should.be.aboveOrEqual(startDate);
        randomPost.created_at.should.be.belowOrEqual(endDate);

        randomPost.updated_at.should.be.belowOrEqual(endDate);
        randomPost.updated_at.should.be.belowOrEqual(endDate);

        randomPost.published_at.should.be.belowOrEqual(endDate);
        randomPost.published_at.should.be.belowOrEqual(endDate);
    });

    it('can create a random post with specific options', async function () {
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

        randomPost.tags.should.be.an.Array().with.lengthOf(2);
        randomPost.tags[0].should.eql('#Test');
        randomPost.tags[1].should.eql('Hello World');

        randomPost.status.should.eql('draft');
        randomPost.visibility.should.eql('paid');

        randomPost.title.should.be.a.String();
        randomPost.excerpt.should.be.a.String();
        randomPost.meta_title.should.be.a.String();
        randomPost.meta_description.should.be.a.String();

        // Count number of <p> tags in HTML content
        randomPost.html.match(/<p>/g).length.should.eql(3);
    });
});
