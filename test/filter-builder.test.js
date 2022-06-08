const {filterBuilder} = require('../lib/filter-builder');

const tagsObject = require('./fixtures/tags.json');
const authorsObject = require('./fixtures/authors.json');

describe('Filter builder', function () {
    test('Builds exclusive filter from strings', async function () {
        const filter = filterBuilder({
            author: 'harry,ron',
            tag: 'newsletter,blog',
            visibility: 'member,paid'
        });

        expect(filter).toEqual('author:[harry, ron], tag:[newsletter, blog], visibility:[member, paid]');
    });

    test('Builds exclusive filter from strings with no visibility', async function () {
        // CASE: The `all` in `visibility` takes priority, so no visibility filter is actually needed
        const filter = filterBuilder({
            author: 'harry,ron',
            tag: 'newsletter,blog',
            visibility: 'member,paid,all'
        });

        expect(filter).toEqual('author:[harry, ron], tag:[newsletter, blog]');
    });

    test('Builds inclusive filter from strings', async function () {
        const filter = filterBuilder({
            author: 'harry,ron',
            tag: 'newsletter,blog',
            visibility: 'member,paid',
            joinSeparator: '+'
        });

        expect(filter).toEqual('author:[harry+ron]+tag:[newsletter+blog]+visibility:[member+paid]');
    });

    test('Builds exclusive filter from arrays', async function () {
        const filter = filterBuilder({
            author: ['harry', 'ron'],
            tag: ['newsletter', 'blog'],
            visibility: ['member', 'paid']
        });

        expect(filter).toEqual('author:[harry, ron], tag:[newsletter, blog], visibility:[member, paid]');
    });

    test('Builds filter from objects', async function () {
        const filter = filterBuilder({
            author: authorsObject,
            tag: tagsObject,
            visibility: ['members', 'paid']
        });

        expect(filter).toEqual('author:[ghost-user, sample-user], tag:[lorem-ipsum, dolor-simet], visibility:[members, paid]');
    });

    test('Builds filter from strings, arrays, and objects', async function () {
        const filter = filterBuilder({
            author: 'harry',
            tag: tagsObject,
            visibility: ['members', 'paid']
        });

        expect(filter).toEqual('author:[harry], tag:[lorem-ipsum, dolor-simet], visibility:[members, paid]');
    });
});
