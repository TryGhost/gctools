const changeAuthor = require('../tasks/change-author');
const ui = require('@tryghost/pretty-cli').ui;

// Internal ID in case we need one.
exports.id = 'change-author';

exports.group = 'Beta:';

// The command to run and any params
exports.flags = 'change-author <apiURL> <adminAPIKey>';

// Description for the top level command
exports.desc = 'Delete posts in Ghost';

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
    sywac.string('--author', {
        defaultValue: null,
        desc: 'Current author slug'
    });
    sywac.string('--new_author', {
        defaultValue: null,
        desc: 'New author slug'
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
        let runner = changeAuthor.getTaskRunner(argv);

        // Run the migration
        await runner.run(context);
    } catch (error) {
        ui.log.error('Done with errors', context.errors);
    }

    // Report success
    ui.log.ok(`Successfully changed ${context.changed.length} posts in ${Date.now() - timer}ms.`);
};
