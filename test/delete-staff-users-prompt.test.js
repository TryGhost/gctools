import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import deleteStaffUsersPrompt from '../prompts/delete-staff-users.js';

describe('Delete staff users prompt', function () {
    test('requires at least one role and defaults to preview', function () {
        const roles = deleteStaffUsersPrompt.options.find((option) => option.name === 'roles');
        const dryRun = deleteStaffUsersPrompt.options.find((option) => option.name === 'dryRun');
        const emailDomain = deleteStaffUsersPrompt.options.find(
            (option) => option.name === 'emailDomain',
        );
        const token = deleteStaffUsersPrompt.options.find(
            (option) => option.name === 'adminAPIKey',
        );

        assert.ok(roles);
        assert.strictEqual(roles.type, 'checkbox');
        assert.strictEqual(roles.validate([]), 'Select at least one staff role');
        assert.strictEqual(roles.validate([{ name: 'Author' }]), true);
        assert.ok(emailDomain);
        assert.strictEqual(emailDomain.default, '');
        assert.strictEqual(emailDomain.filter(' @Example.com '), '@Example.com');
        assert.strictEqual(emailDomain.validate('@example.com'), true);
        assert.match(emailDomain.validate('person@example.com'), /email domain/i);
        assert.strictEqual(dryRun.default, true);
        assert.strictEqual(token.message, 'Staff access token:');
    });
});
