const deleteEmptyTags = require('../tasks/delete-empty-tags');
const ui = require('@tryghost/pretty-cli').ui;

// Internal ID in case we need one.
exports.id = 'delete-empty-tags';

exports.group = 'Beta:';

// The command to run and any params
exports.flags = 'delete-empty-tags <apiURL> <adminAPIKey>';

// Description for the top level command
exports.desc = 'Delete tags in Ghost with no associated posts';

// Descriptions for the individual params
exports.paramsDesc = [
    'URL to your Ghost API',
    'Admin API key'
];

// Configure all the options
exports.setup = (sywac) => {
    sywac.boolean('-V --verbose', {
        defaultValue: false,
        desc: 'Show verbose output'
    });
    sywac.number('--delayBetweenCalls', {
        defaultValue: 50,
        desc: 'The delay between API calls, in ms'
    });
};

// What to do when this command is executed
exports.run = async (argv) => {
    let timer = Date.now();
    let context = {errors: []};

    try {
        // Fetch the tasks, configured correctly according to the options passed in
        let runner = deleteEmptyTags.getTaskRunner(argv);

        // Run the migration
        await runner.run(context);
    } catch (error) {
        ui.log.error('Done with errors', context.errors);
    }

    // Report success
    ui.log.ok(`Successfully deleted ${context.deleted.length} tags in ${Date.now() - timer}ms.`);
};
