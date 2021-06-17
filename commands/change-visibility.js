const changeVisibility = require('../tasks/change-visibility');
const ui = require('@tryghost/pretty-cli').ui;

// Internal ID in case we need one.
exports.id = 'change-visibility';

exports.group = 'Content:';

// The command to run and any params
exports.flags = 'change-visibility <apiURL> <adminAPIKey>';

// Description for the top level command
exports.desc = 'Switch the visibility for posts from one level to another';

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
    sywac.enumeration('--visibility', {
        choices: ['public', 'members', 'paid'],
        defaultValue: 'public',
        desc: 'Current visibility slug'
    });
    sywac.enumeration('--new_visibility', {
        choices: ['public', 'members', 'paid'],
        defaultValue: 'members',
        desc: 'New visibility slug'
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
        let runner = changeVisibility.getTaskRunner(argv);

        // Run the migration
        await runner.run(context);
    } catch (error) {
        ui.log.error('Done with errors', context.errors);
    }

    // Report success
    ui.log.ok(`Successfully changed the visibility of ${context.changed.length} posts in ${Date.now() - timer}ms.`);
};
