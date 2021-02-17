const findReplace = require('../tasks/change-image-path');
const ui = require('@tryghost/pretty-cli').ui;

// Internal ID in case we need one.
exports.id = 'change-image-path';

exports.group = 'Content:';

// The command to run and any params
exports.flags = 'change-image-path <apiURL> <adminAPIKey>';

// Description for the top level command
exports.desc = 'Find & replace text in Ghost';

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
    sywac.string('--find', {
        defaultValue: null,
        desc: 'Find'
    });
    sywac.string('--replace', {
        defaultValue: null,
        desc: 'Replace with'
    });
    sywac.boolean('-I, --info', {
        defaultValue: false,
        desc: 'Show initialisation info only'
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
        let runner = findReplace.getTaskRunner(argv);

        // Run the migration
        await runner.run(context);
    } catch (error) {
        ui.log.error('Done with errors', context.errors);
    }

    // Report success
    if (!argv.info) {
        ui.log.ok(`Successfully updated ${context.updated.length} paths in ${Date.now() - timer}ms.`);
    }
};
