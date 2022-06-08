const path = require('path');
const parse = require('@tryghost/mg-fs-utils/lib/csv').parse;
const {determineIfUpdated, splitByStatus} = require('../tasks/dedupe-members-csv');

describe('Deduplicate posts', function () {
    test('determines if members have been updated', async function () {
        const existingMembers = await parse(path.join(__dirname, './', 'fixtures', 'existing-members.csv'));
        const updatedMembers = await parse(path.join(__dirname, './', 'fixtures', 'updated-members.csv'));

        let ctx = {
            existingMembers: existingMembers,
            newCombined: updatedMembers,
            combinedNewMembers: []
        };

        const {combinedNewMembers} = determineIfUpdated(ctx);

        expect(combinedNewMembers).toBeArray();
        expect(combinedNewMembers).toHaveLength(13);

        // Convert it to a string to make sure values do _not_ exist
        const combinedNewMembersString = JSON.stringify(combinedNewMembers);

        expect(combinedNewMembersString).not.toInclude('"email":"person05@gmail.com"');
        expect(combinedNewMembersString).not.toInclude('"stripe_customer_id":"cus_05ABCDEFGABCED"');
        expect(combinedNewMembersString).not.toInclude('"email":"person06@gmail.com"');
    });

    test('splits members by status', async function () {
        const existingMembers = await parse(path.join(__dirname, './', 'fixtures', 'existing-members.csv'));
        const updatedMembers = await parse(path.join(__dirname, './', 'fixtures', 'updated-members.csv'));

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

        expect(ctx.newFreeMembers).toBeArray();
        expect(ctx.newFreeMembers).toHaveLength(5);

        expect(ctx.newCompMembers).toBeArray();
        expect(ctx.newCompMembers).toHaveLength(3);

        expect(ctx.newPaidMembers).toBeArray();
        expect(ctx.newPaidMembers).toHaveLength(5);
    });
});
