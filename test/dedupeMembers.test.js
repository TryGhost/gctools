require('./utils');

const path = require('path');
const parse = require('@tryghost/mg-fs-utils/lib/csv').parse;
const {determineIfUpdated, splitByStatus} = require('../tasks/dedupe-members-csv');

describe('Deduplicate posts', function () {
    it('determines if members have been updated', async function () {
        const existingMembers = await parse(path.join(__dirname, './', 'fixtures', 'existing-members.csv'));
        const updatedMembers = await parse(path.join(__dirname, './', 'fixtures', 'updated-members.csv'));

        let ctx = {
            existingMembers: existingMembers,
            newCombined: updatedMembers,
            combinedNewMembers: []
        };

        const {combinedNewMembers} = determineIfUpdated(ctx);

        combinedNewMembers.should.be.an.Array().with.lengthOf(13);

        // Convert it to a string to make sure values do _not_ exist
        const combinedNewMembersString = JSON.stringify(combinedNewMembers);

        combinedNewMembersString.should.not.containEql('"email":"person05@gmail.com"');
        combinedNewMembersString.should.not.containEql('"stripe_customer_id":"cus_05ABCDEFGABCED"');
        combinedNewMembersString.should.not.containEql('"email":"person06@gmail.com"');
    });

    it('splits members by status', async function () {
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

        ctx.newFreeMembers.should.be.an.Array().with.lengthOf(5);
        ctx.newCompMembers.should.be.an.Array().with.lengthOf(3);
        ctx.newPaidMembers.should.be.an.Array().with.lengthOf(5);
    });
});
