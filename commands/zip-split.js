const zipSplit = require('../tasks/zip-split');
const ui = require('@tryghost/pretty-cli').ui;

// Internal ID in case we need one.
exports.id = 'zip-split';

exports.group = 'Tools:';

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

    try {
        // Fetch the tasks, configured correctly according to the options passed in
        let zipSpliter = zipSplit.getTaskRunner(argv);

        // Run the migration
        await zipSpliter.run(context);

        if (argv.verbose) {
            // ui.log.info('Done', require('util').inspect(context.result.data, false, 2));
            ui.log.info('Done');
        }
    } catch (error) {
        ui.log.error('Done with errors', context.errors);
    }

    // Report success
    ui.log.ok(`Successfully split zip in ${Date.now() - timer}ms.`);
};
