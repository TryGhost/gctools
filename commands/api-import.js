const apiImport = require('../tasks/api-import');
const ui = require('@tryghost/pretty-cli').ui;

// Internal ID in case we need one.
exports.id = 'api-import';

exports.group = 'Tools:';

// The command to run and any params
exports.flags = 'api-import <apiURL> <adminAPIKey> <jsonFile>';

// Description for the top level command
exports.desc = 'Import the content from a valid GHost JSON file using the Admin API';

// Descriptions for the individual params
exports.paramsDesc = ['URL to your Ghost API', 'Admin API key', 'Path to the JSON file file'];

// Configure all the options
exports.setup = (sywac) => {
    sywac.boolean('-V --verbose', {
        defaultValue: false,
        desc: 'Show verbose output'
    });
    sywac.boolean('--check_duplicates', {
        defaultValue: true,
        desc: 'Check for duplicated content (by slug) before importing'
    });
    sywac.number('--delayBetweenCalls', {
        defaultValue: 10,
        desc: 'The delay between API calls, in ms'
    });
};

// What to do when this command is executed
exports.run = async (argv) => {
    let timer = Date.now();
    let context = {errors: []};

    try {
        // Fetch the tasks, configured correctly according to the options passed in
        let apiImporter = apiImport.getTaskRunner(argv);

        // Run the migration
        await apiImporter.run(context);

        if (argv.verbose) {
            ui.log.info('Done');
        }
    } catch (error) {
        ui.log.error('Done with errors', context.errors);
    }

    // Report success
    ui.log.ok(`Successfully imported ${context.inserted.length} posts in ${Date.now() - timer}ms.`);
};
