import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import deleteStaffUsersCommand, { deletableRoleChoices } from '../commands/delete-staff-users.js';

describe('Delete staff users command', function () {
    test('configures roles as a required multi-value enum', function () {
        const configuredOptions = [];
        const sywac = {
            boolean: () => {},
            number: () => {},
            option: (flags, options) => configuredOptions.push({ flags, options }),
            string: () => {},
        };

        deleteStaffUsersCommand.setup(sywac);

        const roles = configuredOptions.find(({ flags }) => flags === '--roles');
        assert.ok(roles);
        assert.strictEqual(roles.options.type, 'array:enum');
        assert.strictEqual(roles.options.required, true);
        assert.deepStrictEqual(roles.options.choices, [
            'Contributor',
            'Author',
            'Editor',
            'Administrator',
        ]);
        assert.deepStrictEqual(deletableRoleChoices, roles.options.choices);
    });
});
