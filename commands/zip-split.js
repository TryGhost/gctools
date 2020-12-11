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
    // let timer = Date.now();
    // let context = {errors: []};

    // if (argv.verbose) {
    //     ui.log.info(`Migrating from Ghost at ${argv.url}`);
    // }

    // console.log(zipSplit);
    // console.log(argv);

    // const dir = path.join(process.argv[1], '../');
    // const zipFile = process.argv[2];

    // const zipFilePath = zipFile;

    // const sizeInMb = process.argv[3];
    // const sizeInBytes = (sizeInMb * (1024 * 1024));
    // const tempDir = path.join(dir, '/temp');

    // const destDir = path.dirname(zipFile);

    let args = {
        dir: process.cwd(),
        zipFile: argv.zipFile,
        sizeInMb: argv.maxSize,
        tempDir: path.join(process.cwd(), '/temp'),
        destDir: path.dirname(argv.zipFile)
    };

    console.log(args);

    const run = new zipSplit(args);
    run.run();

    // if (argv.batch !== 0) {
    //     ui.log.info(`Running batch ${argv.batch} (groups of ${argv.limit} posts)`);
    // }

    // try {
    //     // Fetch the tasks, configured correctly according to the options passed in
    //     let migrate = ghost.getTaskRunner(argv);

    //     // Run the migration
    //     await migrate.run(context);

    //     if (argv.info && context.info) {
    //         let batches = context.info.batches.posts;
    //         ui.log.info(`Batch info: ${context.info.totals.posts} posts ${batches} batches.`);
    //     }

    //     if (argv.verbose) {
    //         ui.log.info('Done', require('util').inspect(context.result.data, false, 2));
    //     }
    // } catch (error) {
    //     ui.log.info('Done with errors', context.errors);
    // }

    // Report success
    // ui.log.ok(`Successfully written output to ${context.outputFile} in ${Date.now() - timer}ms.`);
};
