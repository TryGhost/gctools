import {describe, test} from 'node:test';
import assert from 'node:assert/strict';
import {requestOptions} from '../lib/batch-ghost-discover.js';

describe('Batch Ghost Discover', function () {
    test('Builds the default query', async function () {
        const opts = requestOptions();

        assert.strictEqual(typeof opts, 'object');
        assert.ok('page' in opts);
        assert.ok('limit' in opts);
        assert.strictEqual(typeof opts.page, 'number');
        assert.strictEqual(typeof opts.limit, 'number');
    });

    test('Has different defaults for specific types: tags', async function () {
        const opts = requestOptions({
            type: 'tags'
        });

        assert.strictEqual(typeof opts, 'object');
        assert.ok('page' in opts);
        assert.ok('limit' in opts);
        assert.ok('include' in opts);
        assert.strictEqual(typeof opts.page, 'number');
        assert.strictEqual(typeof opts.limit, 'number');
        assert.deepStrictEqual(opts.include, 'count.posts');
    });

    test('Has different defaults for specific types: users', async function () {
        const opts = requestOptions({
            type: 'users'
        });

        assert.strictEqual(typeof opts, 'object');
        assert.ok('page' in opts);
        assert.ok('limit' in opts);
        assert.ok('include' in opts);
        assert.strictEqual(typeof opts.page, 'number');
        assert.strictEqual(typeof opts.limit, 'number');
        assert.deepStrictEqual(opts.include, 'count.posts,roles');
    });

    test('Has different defaults for specific types, with a custom limit', async function () {
        const opts = requestOptions({
            type: 'users',
            limit: 100
        });

        assert.deepStrictEqual(opts.limit, 100);
        assert.deepStrictEqual(opts.include, 'count.posts,roles');
    });

    test('Accepts a specific limit (supplied as int)', async function () {
        const opts = requestOptions({
            limit: 55
        });

        assert.deepStrictEqual(opts.limit, 55);
    });

    test('Accepts a specific limit (supplied as string)', async function () {
        const opts = requestOptions({
            limit: '45'
        });

        assert.deepStrictEqual(opts.limit, 45);
    });

    test('Accepts a specific include', async function () {
        const opts = requestOptions({
            include: 'monthly_price,yearly_price,benefits'
        });

        assert.deepStrictEqual(opts.include, 'monthly_price,yearly_price,benefits');
    });

    test('Accepts a specific filter', async function () {
        const opts = requestOptions({
            filter: 'tag:getting-started'
        });

        assert.deepStrictEqual(opts.filter, 'tag:getting-started');
    });

    test('Accepts a specific fields', async function () {
        const opts = requestOptions({
            fields: 'title,url'
        });

        assert.deepStrictEqual(opts.fields, 'title,url');
    });

    test('Accepts a specific formats', async function () {
        const opts = requestOptions({
            formats: 'html,plaintext'
        });

        assert.deepStrictEqual(opts.formats, 'html,plaintext');
    });

    test('Accepts a specific order', async function () {
        const opts = requestOptions({
            order: 'monthly_price ASC'
        });

        assert.deepStrictEqual(opts.order, 'monthly_price ASC');
    });

    test('Accepts a combination of parameters', async function () {
        const opts = requestOptions({
            type: 'posts',
            limit: '35',
            include: 'authors, tags',
            order: 'title DESC'
        });

        assert.strictEqual(typeof opts, 'object');
        assert.ok('page' in opts);
        assert.ok('limit' in opts);
        assert.ok('include' in opts);
        assert.ok('order' in opts);
        assert.strictEqual(typeof opts.page, 'number');
        assert.strictEqual(typeof opts.limit, 'number');
        assert.deepStrictEqual(opts.include, 'authors, tags');
        assert.deepStrictEqual(opts.order, 'title DESC');
    });
});
