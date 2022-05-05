const jsonClean = require('../tasks/json-clean');
const ui = require('@tryghost/pretty-cli').ui;

// Internal ID in case we need one.
exports.id = 'json-clean';

exports.group = 'Beta:';

// The command to run and any params
exports.flags = 'json-clean <jsonFile>';

// Description for the top level command
exports.desc = 'Clean a JSON file so it only contains content';

// Descriptions for the individual params
exports.paramsDesc = ['Path to the Ghost JSON file'];

// Configure all the options
exports.setup = (sywac) => {
    sywac.boolean('-V --verbose', {
        defaultValue: true,
        desc: 'Show verbose output'
    });
};

// What to do when this command is executed
exports.run = async (argv) => {
    let timer = Date.now();
    let context = {errors: []};

    try {
        // Fetch the tasks, configured correctly according to the options passed in
        let jsonCleaner = jsonClean.getTaskRunner(argv);

        // Run the migration
        await jsonCleaner.run(context);

        if (argv.verbose) {
            ui.log.info('Done');
        }
    } catch (error) {
        ui.log.error('Done with errors', context.errors);
    }

    // Report success
    ui.log.ok(`Successfully cleaned JSON file in ${Date.now() - timer}ms.`);
};
