const zipSplit = require('../tools/zip-split');
const path = require('path');
const ui = require('@tryghost/pretty-cli').ui;

// Internal ID in case we need one.
exports.id = 'zip-split';

exports.group = 'Sources:';

// The command to run and any params
exports.flags = 'zip-split <zipFile>';

// Description for the top level command
exports.desc = 'Split a large zip file into smaller zips of a predefined maximum size';

// Descriptions for the individual params
exports.paramsDesc = ['Path to the large zip file'];

// Configure all the options
exports.setup = (sywac) => {
    sywac.boolean('-V --verbose', {
        defaultValue: false,
        desc: 'Show verbose output'
    });
    sywac.number('-M, --maxSize', {
        defaultValue: 100,
        desc: 'Max zip size, in MB'
    });
};

// What to do when this command is executed
exports.run = async (argv) => {
    let timer = Date.now();
    let context = {errors: []};

    if (argv.verbose) {
        ui.log.info(`Migrating from Ghost at ${argv.url}`);
    }

    let args = {
        options: argv,
        dir: process.cwd(),
        zipFile: argv.zipFile,
        sizeInMb: argv.maxSize,
        destDir: path.dirname(argv.zipFile)
    };

    try {
        const run = new zipSplit(args);
        await run.run();
        // Report success
        ui.log.ok(`Completed in ${Date.now() - timer}ms.`);
    } catch (error) {
        ui.log.error('There were errors', context.errors);
    }
};
