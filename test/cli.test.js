// Switch these lines once there are useful utils
// const testUtils = require('./utils');
require('./utils');

const {promisify} = require('util');
const exec = promisify(require('child_process').exec);

describe('CLI output', function () {
    it('outputs preface', async function () {
        // Should take less than 5000ms to run
        this.timeout(5000);

        try {
            const help = await exec('yarn dev');
            help.stdout.should.containEql('Command line utilities for working with Ghost content');
        } catch (error) {
            throw Error('CLI threw an error');
        }
    });
});
