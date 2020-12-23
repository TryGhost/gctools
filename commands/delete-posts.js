const deletePosts = require('../tools/delete-posts');
const ui = require('@tryghost/pretty-cli').ui;

// Internal ID in case we need one.
exports.id = 'delete-posts';

exports.group = 'Content:';

// The command to run and any params
exports.flags = 'delete-posts <apiURL> <adminAPIKey>';

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
    sywac.string('--tag', {
        defaultValue: null,
        desc: 'Delete content with this tag slug'
    });
    sywac.string('--author', {
        defaultValue: null,
        desc: 'Delete content with this author slug'
    });
    sywac.number('--delayBetweenCalls', {
        defaultValue: 200,
        desc: 'The delay between API calls, in ms'
    });

    // by date range
    // by visibility
    // by status
};

// What to do when this command is executed
exports.run = async (argv) => {
    let timer = Date.now();
    let context = {errors: []};

    try {
        // Fetch the tasks, configured correctly according to the options passed in
        let runner = deletePosts.getTaskRunner(argv);

        // Run the migration
        await runner.run(context);
    } catch (error) {
        ui.log.error('Done with errors', context.errors);
    }

    // Report success
    ui.log.ok(`Successfully deleted ${context.deleted.length} posts in ${Date.now() - timer}ms.`);
};
