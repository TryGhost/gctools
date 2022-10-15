import {join} from 'node:path';
import {URL} from 'node:url';
import fsUtils from '@tryghost/mg-fs-utils';
import dedupeMembers from '../tasks/dedupe-members-csv.js';
const {determineIfUpdated, splitByStatus} = dedupeMembers;

const __dirname = new URL('.', import.meta.url).pathname;

describe('Deduplicate posts', function () {
    test('determines if members have been updated', async function () {
        const existingMembers = await fsUtils.csv.parse(join(__dirname, './', 'fixtures', 'existing-members.csv'));
        const updatedMembers = await fsUtils.csv.parse(join(__dirname, './', 'fixtures', 'updated-members.csv'));

        let ctx = {
            existingMembers: existingMembers,
            newCombined: updatedMembers,
            combinedNewMembers: []
        };

        const {combinedNewMembers} = determineIfUpdated(ctx);

        expect(combinedNewMembers).toBeArrayOfSize(13);

        // Convert it to a string to make sure values do _not_ exist
        const combinedNewMembersString = JSON.stringify(combinedNewMembers);

        expect(combinedNewMembersString).not.toContain('"email":"person05@gmail.com"');
        expect(combinedNewMembersString).not.toContain('"stripe_customer_id":"cus_05ABCDEFGABCED"');
        expect(combinedNewMembersString).not.toContain('"email":"person06@gmail.com"');
    });

    test('splits members by status', async function () {
        const existingMembers = await fsUtils.csv.parse(join(__dirname, './', 'fixtures', 'existing-members.csv'));
        const updatedMembers = await fsUtils.csv.parse(join(__dirname, './', 'fixtures', 'updated-members.csv'));

        let ctx = {
            existingMembers: existingMembers,
            newCombined: updatedMembers,
            combinedNewMembers: [],
            newFreeMembers: [],
            newCompMembers: [],
            newPaidMembers: []
        };

        // Find new members
        ctx = determineIfUpdated(ctx);

        // And then split by status
        ctx = splitByStatus(ctx);

        expect(ctx.newFreeMembers).toBeArrayOfSize(5);
        expect(ctx.newCompMembers).toBeArrayOfSize(3);
        expect(ctx.newPaidMembers).toBeArrayOfSize(5);
    });
});
