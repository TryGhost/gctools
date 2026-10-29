import { beforeEach, describe, mock, test } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';

// Pages keyed by resource: each URL's handler returns one page per `page` param
let tiersPages;
let labelsPages;
let roles;
let commentsPages;
let publicCommentsPages;
let membersByFilter;
let failWith;

const pageParam = (url) => parseInt(new URL(url).searchParams.get('page') ?? '1', 10);

const paginated = (key, pages, page) => ({
    data: {
        [key]: pages[page - 1],
        meta: { pagination: { next: page < pages.length ? page + 1 : null } },
    },
});

const mockGet = mock.fn(async (url) => {
    if (failWith && url.includes(failWith)) {
        throw new Error('Ghost is unavailable');
    }
    if (url.includes('/admin/tiers/')) {
        return paginated('tiers', tiersPages, pageParam(url));
    }
    if (url.includes('/admin/labels/')) {
        return paginated('labels', labelsPages, pageParam(url));
    }
    if (url.includes('/admin/roles/')) {
        return { data: { roles } };
    }
    if (url.includes('/admin/comments/')) {
        return paginated('comments', commentsPages, pageParam(url));
    }
    if (url.includes('/members/api/comments/')) {
        return paginated('comments', publicCommentsPages, pageParam(url));
    }
    if (url.includes('/admin/members/')) {
        const filter = new URL(url).searchParams.get('filter');
        return { data: { members: membersByFilter.get(filter) ?? [] } };
    }
    throw new Error(`Unexpected URL: ${url}`);
});

mock.module('axios', { defaultExport: { get: mockGet } });

const {
    apiAuthTokenHeaders,
    getTiers,
    getMemberLabels,
    getRoles,
    getComments,
    getPublicCommentsForPost,
    getMembersByIds,
} = await import('../lib/admin-api-call.js');

const options = (overrides = {}) => ({
    apiURL: 'https://example.com',
    adminAPIKey:
        '1234567890abcdef12345678:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    ...overrides,
});

const requestedUrls = () => mockGet.mock.calls.map(({ arguments: [url] }) => url);
const authHeaders = () => mockGet.mock.calls.map(({ arguments: [, config] }) => config?.headers);

describe('Admin API call', function () {
    beforeEach(function () {
        tiersPages = [[]];
        labelsPages = [[]];
        roles = [];
        commentsPages = [[]];
        publicCommentsPages = [[]];
        membersByFilter = new Map();
        failWith = null;
        mockGet.mock.resetCalls();
    });

    describe('apiAuthTokenHeaders', function () {
        test('signs a Ghost admin JWT from the key id and secret', async function () {
            const headers = apiAuthTokenHeaders(options());

            assert.match(headers.Authorization, /^Ghost /);

            const token = headers.Authorization.replace('Ghost ', '');
            const decoded = jwt.decode(token, { complete: true });
            assert.strictEqual(decoded.header.kid, '1234567890abcdef12345678');
            assert.strictEqual(decoded.header.alg, 'HS256');
            assert.strictEqual(decoded.payload.aud, '/admin/');
        });
    });

    describe('getTiers', function () {
        test('follows pagination and concatenates all pages', async function () {
            tiersPages = [[{ id: 'tier-1' }, { id: 'tier-2' }], [{ id: 'tier-3' }]];

            const tiers = await getTiers(options());

            assert.deepStrictEqual(
                tiers.map(({ id }) => id),
                ['tier-1', 'tier-2', 'tier-3'],
            );
            assert.strictEqual(mockGet.mock.callCount(), 2);
            assert.ok(requestedUrls().every((url) => url.includes('/ghost/api/admin/tiers/')));
            assert.ok(authHeaders().every((headers) => headers.Authorization.startsWith('Ghost ')));
        });

        test('returns an empty array when the request fails', async function () {
            failWith = '/admin/tiers/';

            assert.deepStrictEqual(await getTiers(options()), []);
        });
    });

    describe('getMemberLabels', function () {
        test('follows pagination and concatenates all pages', async function () {
            labelsPages = [[{ id: 'label-1' }], [{ id: 'label-2' }]];

            const labels = await getMemberLabels(options());

            assert.deepStrictEqual(
                labels.map(({ id }) => id),
                ['label-1', 'label-2'],
            );
            assert.strictEqual(mockGet.mock.callCount(), 2);
        });

        test('returns an empty array when the request fails', async function () {
            failWith = '/admin/labels/';

            assert.deepStrictEqual(await getMemberLabels(options()), []);
        });
    });

    describe('getRoles', function () {
        test('returns the roles from a single unpaginated request', async function () {
            roles = [{ name: 'Administrator' }, { name: 'Editor' }];

            assert.deepStrictEqual(await getRoles(options()), roles);
            assert.strictEqual(mockGet.mock.callCount(), 1);
            assert.ok(requestedUrls()[0].includes('limit=all'));
        });

        test('returns an empty array when the request fails', async function () {
            failWith = '/admin/roles/';

            assert.deepStrictEqual(await getRoles(options()), []);
        });
    });

    describe('getComments', function () {
        test('follows pagination and concatenates all pages', async function () {
            commentsPages = [[{ id: 'comment-1' }], [{ id: 'comment-2' }]];

            const comments = await getComments(options());

            assert.deepStrictEqual(
                comments.map(({ id }) => id),
                ['comment-1', 'comment-2'],
            );
            assert.strictEqual(mockGet.mock.callCount(), 2);
        });

        test('applies an optional filter to the request URL', async function () {
            await getComments(options({ filter: 'post_id:abc123' }));

            const url = new URL(requestedUrls()[0]);
            assert.strictEqual(url.searchParams.get('filter'), 'post_id:abc123');
        });

        test('rejects when the request fails', async function () {
            failWith = '/admin/comments/';

            await assert.rejects(getComments(options()), /Ghost is unavailable/);
        });
    });

    describe('getPublicCommentsForPost', function () {
        test('fetches all pages of public comments filtered by post id', async function () {
            publicCommentsPages = [[{ id: 'comment-1' }], [{ id: 'comment-2' }]];

            const comments = await getPublicCommentsForPost(options(), 'post-1');

            assert.deepStrictEqual(
                comments.map(({ id }) => id),
                ['comment-1', 'comment-2'],
            );

            const url = new URL(requestedUrls()[0]);
            assert.strictEqual(url.searchParams.get('filter'), 'post_id:post-1');
            // The public Members API is unauthenticated
            assert.deepStrictEqual(authHeaders(), [undefined, undefined]);
        });
    });

    describe('getMembersByIds', function () {
        test('returns an empty array without requests when no ids are given', async function () {
            assert.deepStrictEqual(await getMembersByIds(options(), []), []);
            assert.strictEqual(mockGet.mock.callCount(), 0);
        });

        test('fetches members in batches of 50', async function () {
            const ids = Array.from({ length: 51 }, (_, index) => `member-${index}`);
            membersByFilter.set(
                `id:[${ids.slice(0, 50).join(',')}]`,
                ids.slice(0, 50).map((id) => ({ id })),
            );
            membersByFilter.set(`id:[member-50]`, [{ id: 'member-50' }]);

            const members = await getMembersByIds(options(), ids);

            assert.strictEqual(members.length, 51);
            assert.strictEqual(mockGet.mock.callCount(), 2);
        });

        test('continues with the remaining batches when one fails', async function () {
            const ids = Array.from({ length: 51 }, (_, index) => `member-${index}`);
            // The first batch's filter contains member-0; the second batch
            // (member-50 only) does not, so only the first request fails
            failWith = 'member-0';
            membersByFilter.set(`id:[member-50]`, [{ id: 'member-50' }]);

            const members = await getMembersByIds(options(), ids);

            assert.deepStrictEqual(members, [{ id: 'member-50' }]);
            assert.strictEqual(mockGet.mock.callCount(), 2);
        });
    });
});
