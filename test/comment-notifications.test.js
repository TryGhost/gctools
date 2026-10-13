import { afterEach, beforeEach, describe, mock, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs-extra';
import fsUtils from '@tryghost/mg-fs-utils';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { silentRenderer } from './helpers/silent-renderer.js';

let discoveredUsers = [];
let temporaryDirectories = [];

const mockEdit = mock.fn((user) => Promise.resolve(user));
const mockDiscover = mock.fn(() => Promise.resolve(discoveredUsers));

mock.module('@tryghost/admin-api', {
    defaultExport: function GhostAdminAPI() {
        return {
            users: {
                edit: mockEdit,
            },
        };
    },
});

mock.module('../lib/batch-ghost-discover.js', {
    namedExports: { discover: mockDiscover },
});

const { default: commentNotifications } = await import('../tasks/comment-notifications.js');

const user = (id, settings = {}, role = 'Administrator') => ({
    id,
    email: `${id}@example.com`,
    name: `User ${id}`,
    slug: `user-${id}`,
    roles: [{ name: role }],
    comment_notifications: false,
    free_member_signup_notification: false,
    paid_subscription_canceled_notification: false,
    paid_subscription_started_notification: false,
    ...settings,
});

const baseOptions = (overrides = {}) => ({
    ...silentRenderer,
    apiURL: 'https://example.com',
    adminAPIKey: 'test-key',
    delayBetweenCalls: 0,
    value: null,
    backupPath: null,
    restorePath: null,
    ...overrides,
});

const createTemporaryPath = async (filename) => {
    const directory = await fs.mkdtemp(join(tmpdir(), 'gctools-comment-notifications-'));
    temporaryDirectories.push(directory);
    return join(directory, filename);
};

const writeBackup = async (rows) => {
    const path = await createTemporaryPath('backup.csv');
    await fs.writeFile(path, fsUtils.csv.jsonToCSV(rows));
    return path;
};

describe('Comment notifications', function () {
    beforeEach(() => {
        discoveredUsers = [];
        mockEdit.mock.resetCalls();
        mockDiscover.mock.resetCalls();
    });

    afterEach(async () => {
        await Promise.all(temporaryDirectories.map((directory) => fs.remove(directory)));
        temporaryDirectories = [];
    });

    test('always disables the additional notification settings during bulk updates', async function () {
        discoveredUsers = [
            user('eligible', {
                comment_notifications: true,
                free_member_signup_notification: true,
            }),
            user('unchanged', { comment_notifications: true }),
            user(
                'owner',
                {
                    comment_notifications: true,
                    free_member_signup_notification: true,
                    paid_subscription_canceled_notification: true,
                    paid_subscription_started_notification: true,
                },
                'Owner',
            ),
        ];
        const context = { errors: [] };

        await commentNotifications.getTaskRunner(baseOptions({ value: true })).run(context);

        assert.strictEqual(mockEdit.mock.callCount(), 1);
        assert.deepStrictEqual(mockEdit.mock.calls[0].arguments[0], {
            id: 'eligible',
            comment_notifications: true,
            free_member_signup_notification: false,
            paid_subscription_canceled_notification: false,
            paid_subscription_started_notification: false,
        });
        assert.strictEqual(context.updated.length, 1);
    });

    test('backs up every managed notification setting', async function () {
        discoveredUsers = [
            user('staff', {
                comment_notifications: true,
                free_member_signup_notification: false,
                paid_subscription_canceled_notification: true,
                paid_subscription_started_notification: false,
            }),
            user('owner', {}, 'Owner'),
        ];
        const backupPath = await createTemporaryPath('backup.csv');
        const context = { errors: [] };

        await commentNotifications.getTaskRunner(baseOptions({ backupPath })).run(context);

        const rows = await fsUtils.csv.parseCSV(backupPath);
        assert.deepStrictEqual(rows, [
            {
                id: 'staff',
                email: 'staff@example.com',
                name: 'User staff',
                slug: 'user-staff',
                comment_notifications: 'true',
                free_member_signup_notification: 'false',
                paid_subscription_canceled_notification: 'true',
                paid_subscription_started_notification: 'false',
            },
        ]);
        assert.strictEqual(context.backedUp, 1);
        assert.strictEqual(mockEdit.mock.callCount(), 0);
    });

    test('restores every notification setting from a backup', async function () {
        discoveredUsers = [user('staff')];
        const restorePath = await writeBackup([
            {
                id: 'staff',
                email: 'staff@example.com',
                name: 'User staff',
                slug: 'user-staff',
                comment_notifications: true,
                free_member_signup_notification: true,
                paid_subscription_canceled_notification: true,
                paid_subscription_started_notification: true,
            },
        ]);
        const context = { errors: [] };

        await commentNotifications.getTaskRunner(baseOptions({ restorePath })).run(context);

        assert.strictEqual(mockEdit.mock.callCount(), 1);
        assert.deepStrictEqual(mockEdit.mock.calls[0].arguments[0], {
            id: 'staff',
            comment_notifications: true,
            free_member_signup_notification: true,
            paid_subscription_canceled_notification: true,
            paid_subscription_started_notification: true,
        });
        assert.strictEqual(context.restored.length, 1);
    });

    test('restores legacy backups without changing settings absent from the CSV', async function () {
        discoveredUsers = [
            user('staff', {
                free_member_signup_notification: true,
                paid_subscription_canceled_notification: true,
                paid_subscription_started_notification: true,
            }),
        ];
        const restorePath = await writeBackup([
            {
                id: 'staff',
                email: 'staff@example.com',
                name: 'User staff',
                slug: 'user-staff',
                comment_notifications: true,
            },
        ]);

        await commentNotifications.getTaskRunner(baseOptions({ restorePath })).run({ errors: [] });

        assert.strictEqual(mockEdit.mock.callCount(), 1);
        assert.deepStrictEqual(mockEdit.mock.calls[0].arguments[0], {
            id: 'staff',
            comment_notifications: true,
        });
    });
});
