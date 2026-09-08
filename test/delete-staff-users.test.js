import { beforeEach, describe, mock, test } from 'node:test';
import assert from 'node:assert/strict';
import { silentRenderer } from './helpers/silent-renderer.js';

const currentUser = {
    id: 'current-user',
    name: 'Current Admin',
    roles: [{ name: 'Administrator' }],
    count: { posts: 0 },
};

let discoveredUsers = [];
let freshUsers = new Map();
let staffTokenError = null;
let deleteErrors = new Map();

const mockRead = mock.fn(({ id }) => {
    if (id === 'me') {
        if (staffTokenError) {
            return Promise.reject(staffTokenError);
        }

        return Promise.resolve(currentUser);
    }

    const freshUser = freshUsers.get(id);
    if (!freshUser) {
        return Promise.reject(new Error('User not found'));
    }

    return Promise.resolve(freshUser);
});

const mockDelete = mock.fn(({ id }) => {
    if (deleteErrors.has(id)) {
        return Promise.reject(deleteErrors.get(id));
    }

    return Promise.resolve();
});

const mockDiscover = mock.fn(() => Promise.resolve(discoveredUsers));

mock.module('@tryghost/admin-api', {
    defaultExport: function GhostAdminAPI() {
        return {
            users: {
                read: mockRead,
                delete: mockDelete,
            },
        };
    },
});

mock.module('../lib/batch-ghost-discover.js', {
    namedExports: { discover: mockDiscover },
});

const {
    default: deleteStaffUsers,
    emailMatchesDomain,
    getContentCount,
    normaliseEmailDomain,
    normaliseRoleNames,
    partitionUsers,
    validateOptions,
} = await import('../tasks/delete-staff-users.js');

const user = (id, role, posts, status = 'active') => ({
    id,
    name: `User ${id}`,
    email: `${id}@example.com`,
    roles: [{ name: role }],
    count: posts === undefined ? undefined : { posts },
    status,
});

const baseOptions = (overrides = {}) => ({
    ...silentRenderer,
    apiURL: 'https://example.com',
    staffAccessToken:
        '507f1f77bcf86cd799439011:507f1f77bcf86cd7994390117bcf86cd7994390117bcf86cd7994390117bcf86cd',
    roles: ['Contributor'],
    dryRun: true,
    yes: false,
    delayBetweenCalls: 0,
    ...overrides,
});

describe('Delete staff users', function () {
    beforeEach(() => {
        discoveredUsers = [];
        freshUsers = new Map();
        staffTokenError = null;
        deleteErrors = new Map();
        mockRead.mock.resetCalls();
        mockDelete.mock.resetCalls();
        mockDiscover.mock.resetCalls();
    });

    test('normalises role strings and interactive role objects', function () {
        assert.deepStrictEqual(
            normaliseRoleNames(['Contributor, author', { name: 'EDITOR' }, 'contributor']),
            ['Contributor', 'author', 'EDITOR'],
        );
    });

    test('requires roles and refuses the Owner role', function () {
        assert.throws(() => normaliseRoleNames([]), /at least one staff role/i);
        assert.throws(() => normaliseRoleNames(['Owner']), /Owner role cannot be deleted/i);
    });

    test('normalises and validates optional email domains', function () {
        assert.strictEqual(normaliseEmailDomain(' Example.COM '), 'example.com');
        assert.strictEqual(normaliseEmailDomain('@Example.COM'), 'example.com');
        assert.strictEqual(normaliseEmailDomain(''), null);
        assert.strictEqual(normaliseEmailDomain(undefined), null);
        assert.throws(() => normaliseEmailDomain('person@example.com'), /email domain/i);
        assert.throws(() => normaliseEmailDomain('@'), /email domain/i);

        assert.strictEqual(emailMatchesDomain(user('match', 'Author', 0), 'example.com'), true);
        assert.strictEqual(
            emailMatchesDomain({ email: 'person@notexample.com' }, 'example.com'),
            false,
        );
        assert.strictEqual(
            emailMatchesDomain({ email: 'PERSON@EXAMPLE.COM' }, 'example.com'),
            true,
        );
        assert.strictEqual(emailMatchesDomain({}, 'example.com'), false);
        assert.strictEqual(emailMatchesDomain({}, null), true);
    });

    test('requires exactly one CLI action flag', function () {
        assert.throws(() => validateOptions({ roles: ['Author'] }), /--dry-run.*--yes/i);
        assert.throws(
            () => validateOptions({ roles: ['Author'], dryRun: true, yes: true }),
            /either --dry-run or --yes/i,
        );
        assert.deepStrictEqual(validateOptions({ roles: ['Author'], dryRun: true }), {
            dryRun: true,
            emailDomain: null,
            roleNames: ['Author'],
        });
        assert.deepStrictEqual(
            validateOptions({
                roles: ['Author'],
                dryRun: true,
                'email-domain': '@Example.com',
            }),
            {
                dryRun: true,
                emailDomain: 'example.com',
                roleNames: ['Author'],
            },
        );
    });

    test('partitions by role and fails closed for protected or unsafe users', function () {
        const users = [
            user('owner', 'Owner', 0),
            currentUser,
            user('content', 'Contributor', 2),
            user('invalid-count', 'Contributor', -1),
            user('missing', 'Contributor'),
            user('active-empty', 'Contributor', 0),
            user('inactive-empty', 'Contributor', '0', 'inactive'),
            user('other-role', 'Author', 0),
        ];

        const result = partitionUsers(users, {
            roleNames: ['contributor', 'ADMINISTRATOR'],
            currentUserId: currentUser.id,
        });

        assert.deepStrictEqual(
            result.candidates.map(({ id }) => id),
            ['active-empty', 'inactive-empty'],
        );
        assert.deepStrictEqual(
            result.skipped.map(({ reason }) => reason),
            ['owner', 'current-user', 'has-content', 'has-content', 'missing-content-count'],
        );
        assert.deepStrictEqual(
            result.ignored.map(({ id }) => id),
            ['other-role'],
        );
        assert.strictEqual(getContentCount(user('zero', 'Author', '0')), 0);
        assert.strictEqual(getContentCount(user('missing', 'Author')), null);
    });

    test('dry run previews eligible users without deleting', async function () {
        const otherDomain = user('other-domain', 'Contributor', 0);
        otherDomain.email = 'other@ghost.org';
        discoveredUsers = [
            user('empty', 'Contributor', 0),
            user('with-content', 'Contributor', 1),
            otherDomain,
        ];
        const context = { errors: [] };

        await deleteStaffUsers
            .getTaskRunner(baseOptions({ emailDomain: '@EXAMPLE.COM' }))
            .run(context);

        assert.deepStrictEqual(
            context.candidates.map(({ id }) => id),
            ['empty'],
        );
        assert.deepStrictEqual(
            context.skipped.map(({ reason }) => reason),
            ['has-content', 'email-domain-mismatch'],
        );
        assert.strictEqual(mockDelete.mock.callCount(), 0);
        assert.strictEqual(mockRead.mock.callCount(), 1);
        assert.deepStrictEqual(
            mockDiscover.mock.calls[0].arguments[0].include,
            'count.posts,roles',
        );
    });

    test('revalidates the email domain before deletion', async function () {
        const candidate = user('changed-email', 'Contributor', 0);
        const changedEmail = user('changed-email', 'Contributor', 0);
        changedEmail.email = 'changed-email@ghost.org';
        discoveredUsers = [candidate];
        freshUsers = new Map([['changed-email', changedEmail]]);
        const context = { errors: [] };

        await deleteStaffUsers
            .getTaskRunner(
                baseOptions({
                    dryRun: false,
                    yes: true,
                    emailDomain: 'example.com',
                }),
            )
            .run(context);

        assert.strictEqual(mockDelete.mock.callCount(), 0);
        assert.strictEqual(context.skipped.at(-1).reason, 'email-domain-mismatch');
    });

    test('revalidates users and continues after deletion failures', async function () {
        const first = user('first', 'Contributor', 0);
        const changed = user('changed', 'Contributor', 0);
        const failing = user('failing', 'Contributor', 0);
        discoveredUsers = [first, changed, failing];
        freshUsers = new Map([
            ['first', first],
            ['changed', user('changed', 'Contributor', 1)],
            ['failing', failing],
        ]);
        deleteErrors.set('failing', new Error('Not allowed'));
        const context = { errors: [] };

        await deleteStaffUsers
            .getTaskRunner(baseOptions({ dryRun: false, yes: true }))
            .run(context);

        assert.deepStrictEqual(
            context.deleted.map(({ id }) => id),
            ['first'],
        );
        assert.deepStrictEqual(
            mockDelete.mock.calls.map((call) => call.arguments[0].id),
            ['first', 'failing'],
        );
        assert.strictEqual(context.skipped.at(-1).reason, 'has-content');
        assert.strictEqual(context.failed.length, 1);
        assert.strictEqual(context.failed[0].user.id, 'failing');
    });

    test('fails before discovery when the credential is not a staff token', async function () {
        staffTokenError = new Error('User not found');
        const context = { errors: [] };

        await assert.rejects(
            deleteStaffUsers.getTaskRunner(baseOptions()).run(context),
            /staff access token is required/i,
        );

        assert.strictEqual(mockDiscover.mock.callCount(), 0);
        assert.strictEqual(mockDelete.mock.callCount(), 0);
        assert.match(context.errors[0].message, /staff access token is required/i);
    });
});
