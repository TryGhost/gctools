import {join} from 'node:path';
import {URL} from 'node:url';
import fs from 'fs-extra';
import fsUtils from '@tryghost/mg-fs-utils';
import compareMemberCsv from '../tasks/compare-member-csv.js';

const __dirname = new URL('.', import.meta.url).pathname;

describe('Compare member CSV files', function () {
    afterEach(async function () {
        // Clean up generated files after each test
        await fs.remove(join(__dirname, 'fixtures', 'new.csv'));
        await fs.remove(join(__dirname, 'fixtures', 'unsubscribed.csv'));
    });

    test('identifies new members correctly', async function () {
        const oldFile = join(__dirname, 'fixtures', 'members-csv-old.csv');
        const newFile = join(__dirname, 'fixtures', 'members-csv-new.csv');

        const runner = compareMemberCsv.getTaskRunner({
            oldFile: oldFile,
            newFile: newFile
        });

        const context = {errors: []};
        await runner.run(context);

        // Check that new members were identified
        expect(context.newMembersList).toBeArrayOfSize(1);

        // Verify specific new members
        const newEmails = context.newMembersList.map(m => m.email);

        expect(newEmails).toContain('user6@example.com');

        // Verify the file was created
        const newFilePath = join(__dirname, 'fixtures', 'new.csv');
        const fileExists = await fs.pathExists(newFilePath);
        expect(fileExists).toBe(true);

        // Verify file contents
        const csvContent = await fsUtils.csv.parseCSV(newFilePath);
        expect(csvContent).toBeArrayOfSize(1);
    });

    test('identifies unsubscribed members correctly', async function () {
        const oldFile = join(__dirname, 'fixtures', 'members-csv-old.csv');
        const newFile = join(__dirname, 'fixtures', 'members-csv-new.csv');

        const runner = compareMemberCsv.getTaskRunner({
            oldFile: oldFile,
            newFile: newFile
        });

        const context = {errors: []};
        await runner.run(context);

        // Check that unsubscribed members were identified
        expect(context.unsubscribedList).toBeArrayOfSize(1);

        // Verify specific unsubscribed members
        const unsubscribedEmails = context.unsubscribedList.map(m => m.email);
        expect(unsubscribedEmails).toContain('user1@example.com');

        // Verify the file was created
        const unsubscribedFilePath = join(__dirname, 'fixtures', 'unsubscribed.csv');
        const fileExists = await fs.pathExists(unsubscribedFilePath);
        expect(fileExists).toBe(true);

        // Verify file contents
        const csvContent = await fsUtils.csv.parseCSV(unsubscribedFilePath);
        expect(csvContent).toBeArrayOfSize(1);
    });

    test('handles identical files (no changes)', async function () {
        const oldFile = join(__dirname, 'fixtures', 'members-csv-old.csv');
        const newFile = join(__dirname, 'fixtures', 'members-csv-old.csv'); // Same file

        const runner = compareMemberCsv.getTaskRunner({
            oldFile: oldFile,
            newFile: newFile
        });

        const context = {errors: []};
        await runner.run(context);

        // No new or unsubscribed members
        expect(context.newMembersList).toBeArrayOfSize(0);
        expect(context.unsubscribedList).toBeArrayOfSize(0);

        // Files should not be created when there are no differences
        const newFileExists = await fs.pathExists(join(__dirname, 'fixtures', 'new.csv'));
        const unsubscribedFileExists = await fs.pathExists(join(__dirname, 'fixtures', 'unsubscribed.csv'));
        expect(newFileExists).toBe(false);
        expect(unsubscribedFileExists).toBe(false);
    });

    test('preserves all CSV columns in output', async function () {
        const oldFile = join(__dirname, 'fixtures', 'members-csv-old.csv');
        const newFile = join(__dirname, 'fixtures', 'members-csv-new.csv');

        const runner = compareMemberCsv.getTaskRunner({
            oldFile: oldFile,
            newFile: newFile
        });

        const context = {errors: []};
        await runner.run(context);

        // Check that all columns are preserved in new members
        const newMember = context.newMembersList[0];
        expect(newMember).toHaveProperty('email');
        expect(newMember).toHaveProperty('subscribed_to_emails');
        expect(newMember).toHaveProperty('complimentary_plan');
        expect(newMember).toHaveProperty('stripe_customer_id');
        expect(newMember).toHaveProperty('created_at');
        expect(newMember).toHaveProperty('labels');
        expect(newMember).toHaveProperty('note');
    });

    test('handles case-insensitive email comparison', async function () {
        // Create temporary test files with mixed case emails
        const tempOldPath = join(__dirname, 'temp-old.csv');
        const tempNewPath = join(__dirname, 'temp-new.csv');

        const oldData = [
            {email: 'Test@Example.com', subscribed_to_emails: true, labels: 'test'},
            {email: 'another@test.com', subscribed_to_emails: true, labels: 'test'}
        ];

        const newData = [
            {email: 'test@example.com', subscribed_to_emails: true, labels: 'test'}, // Same as first but different case
            {email: 'newuser@test.com', subscribed_to_emails: true, labels: 'test'}
        ];

        // Write test CSV files
        await fs.writeFile(tempOldPath, fsUtils.csv.jsonToCSV(oldData));
        await fs.writeFile(tempNewPath, fsUtils.csv.jsonToCSV(newData));

        try {
            const runner = compareMemberCsv.getTaskRunner({
                oldFile: tempOldPath,
                newFile: tempNewPath
            });

            const context = {errors: []};
            await runner.run(context);

            // Should identify one new member (newuser@test.com)
            expect(context.newMembersList).toBeArrayOfSize(1);
            expect(context.newMembersList[0].email).toBe('newuser@test.com');

            // Should identify one unsubscribed member (another@test.com)
            expect(context.unsubscribedList).toBeArrayOfSize(1);
            expect(context.unsubscribedList[0].email).toBe('another@test.com');
        } finally {
            // Clean up temporary files and any generated output
            await fs.remove(tempOldPath);
            await fs.remove(tempNewPath);
            await fs.remove(join(__dirname, 'new.csv'));
            await fs.remove(join(__dirname, 'unsubscribed.csv'));
        }
    });

    test('handles missing email fields gracefully', async function () {
        // Create temporary test files with some missing emails
        const tempOldPath = join(__dirname, 'temp-old-missing.csv');
        const tempNewPath = join(__dirname, 'temp-new-missing.csv');

        const oldData = [
            {email: 'valid@example.com', subscribed_to_emails: true},
            {email: null, subscribed_to_emails: true}, // Missing email
            {email: '', subscribed_to_emails: true}, // Empty email
            {email: 'another@example.com', subscribed_to_emails: true}
        ];

        const newData = [
            {email: 'valid@example.com', subscribed_to_emails: true},
            {email: undefined, subscribed_to_emails: true}, // Missing email
            {email: 'new@example.com', subscribed_to_emails: true}
        ];

        // Write test CSV files
        await fs.writeFile(tempOldPath, fsUtils.csv.jsonToCSV(oldData));
        await fs.writeFile(tempNewPath, fsUtils.csv.jsonToCSV(newData));

        try {
            const runner = compareMemberCsv.getTaskRunner({
                oldFile: tempOldPath,
                newFile: tempNewPath
            });

            const context = {errors: []};
            await runner.run(context);

            // Should only process entries with valid emails
            expect(context.newMembersList).toBeArrayOfSize(1);
            expect(context.newMembersList[0].email).toBe('new@example.com');

            expect(context.unsubscribedList).toBeArrayOfSize(1);
            expect(context.unsubscribedList[0].email).toBe('another@example.com');
        } finally {
            // Clean up temporary files and any generated output
            await fs.remove(tempOldPath);
            await fs.remove(tempNewPath);
            await fs.remove(join(__dirname, 'new.csv'));
            await fs.remove(join(__dirname, 'unsubscribed.csv'));
        }
    });

    test('throws error for non-existent files', async function () {
        const runner = compareMemberCsv.getTaskRunner({
            oldFile: '/non/existent/old.csv',
            newFile: '/non/existent/new.csv'
        });

        const context = {errors: []};

        await expect(runner.run(context)).rejects.toThrow('Old file not found');
    });
});
