require('./utils');

const {requestOptions} = require('../lib/batch-ghost-discover');

describe('Batch Ghost Discover', function () {
    it('Builds the default query', async function () {
        const opts = requestOptions();

        Object.keys(opts).should.have.length(2);
        opts.should.be.an.Object();
        opts.should.have.properties(['page', 'limit']);
        opts.page.should.be.an.Number();
        opts.limit.should.be.an.Number();
    });

    it('Has different defaults for specific types: tags', async function () {
        const opts = requestOptions({
            type: 'tags'
        });

        Object.keys(opts).should.have.length(3);
        opts.should.be.an.Object();
        opts.should.have.properties(['page', 'limit', 'include']);
        opts.page.should.be.an.Number();
        opts.limit.should.be.an.Number();
        opts.include.should.eql('count.posts');
    });

    it('Has different defaults for specific types: users', async function () {
        const opts = requestOptions({
            type: 'users'
        });

        Object.keys(opts).should.have.length(3);
        opts.should.be.an.Object();
        opts.should.have.properties(['page', 'limit', 'include']);
        opts.page.should.be.an.Number();
        opts.limit.should.be.an.Number();
        opts.include.should.eql('count.posts,roles');
    });

    it('Has different defaults for specific types, with a custom limit', async function () {
        const opts = requestOptions({
            type: 'users',
            limit: 100
        });

        opts.limit.should.eql(100);
        opts.include.should.eql('count.posts,roles');
    });

    it('Accepts a specific limit (supplied as int)', async function () {
        const opts = requestOptions({
            limit: 55
        });

        opts.limit.should.eql(55);
    });

    it('Accepts a specific limit (supplied as string)', async function () {
        const opts = requestOptions({
            limit: '45'
        });

        opts.limit.should.eql(45);
    });

    it('Accepts a specific include', async function () {
        const opts = requestOptions({
            include: 'monthly_price,yearly_price,benefits'
        });

        opts.include.should.be.eql('monthly_price,yearly_price,benefits');
    });

    it('Accepts a specific filter', async function () {
        const opts = requestOptions({
            filter: 'tag:getting-started'
        });

        opts.filter.should.be.eql('tag:getting-started');
    });

    it('Accepts a specific fields', async function () {
        const opts = requestOptions({
            fields: 'title,url'
        });

        opts.fields.should.be.eql('title,url');
    });

    it('Accepts a specific formats', async function () {
        const opts = requestOptions({
            formats: 'html,plaintext'
        });

        opts.formats.should.be.eql('html,plaintext');
    });

    it('Accepts a specific order', async function () {
        const opts = requestOptions({
            order: 'monthly_price ASC'
        });

        opts.order.should.be.eql('monthly_price ASC');
    });

    it('Accepts a combination of parameters', async function () {
        const opts = requestOptions({
            type: 'posts',
            limit: '35',
            include: 'authors, tags',
            order: 'title DESC'
        });

        Object.keys(opts).should.have.length(4);
        opts.should.be.an.Object();
        opts.should.have.properties(['page', 'limit', 'include', 'order']);
        opts.page.should.be.an.Number();
        opts.limit.should.be.an.Number();
        opts.include.should.eql('authors, tags');
        opts.order.should.eql('title DESC');
    });
});
