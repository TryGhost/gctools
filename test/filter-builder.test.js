const testUtils = require('./utils');
const {filterBuilder} = require('../lib/filter-builder');

const tagsObject = testUtils.fixtures.readSync('tags.json');
const authorsObject = testUtils.fixtures.readSync('authors.json');

describe('Filter builder', function () {
    it('Builds exclusive filter from strings', async function () {
        const filter = filterBuilder({
            author: 'harry,ron',
            tag: 'newsletter,blog',
            visibility: 'member,paid'
        });

        filter.should.eql('author:[harry, ron], tag:[newsletter, blog], visibility:[member, paid]');
    });

    it('Builds exclusive filter from strings with no visibility', async function () {
        // CASE: The `all` in `visibility` takes priority, so no visibility filter is actually needed
        const filter = filterBuilder({
            author: 'harry,ron',
            tag: 'newsletter,blog',
            visibility: 'member,paid,all'
        });

        filter.should.eql('author:[harry, ron], tag:[newsletter, blog]');
    });

    it('Builds inclusive filter from strings', async function () {
        const filter = filterBuilder({
            author: 'harry,ron',
            tag: 'newsletter,blog',
            visibility: 'member,paid',
            joinSeparator: '+'
        });

        filter.should.eql('author:[harry+ron]+tag:[newsletter+blog]+visibility:[member+paid]');
    });

    it('Builds exclusive filter from arrays', async function () {
        const filter = filterBuilder({
            author: ['harry', 'ron'],
            tag: ['newsletter', 'blog'],
            visibility: ['member', 'paid']
        });

        filter.should.eql('author:[harry, ron], tag:[newsletter, blog], visibility:[member, paid]');
    });

    it('Builds filter from objects', async function () {
        const filter = filterBuilder({
            author: authorsObject,
            tag: tagsObject,
            visibility: ['members', 'paid']
        });

        filter.should.eql('author:[ghost-user, sample-user], tag:[lorem-ipsum, dolor-simet], visibility:[members, paid]');
    });

    it('Builds filter from strings, arrays, and objects', async function () {
        const filter = filterBuilder({
            author: 'harry',
            tag: tagsObject,
            visibility: ['members', 'paid']
        });

        filter.should.eql('author:[harry], tag:[lorem-ipsum, dolor-simet], visibility:[members, paid]');
    });
});
