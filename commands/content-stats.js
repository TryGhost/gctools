const contentStats = require('../tasks/content-stats');
const ui = require('@tryghost/pretty-cli').ui;

// Internal ID in case we need one.
exports.id = 'content-stats';

exports.group = 'Content:';

// The command to run and any params
exports.flags = 'content-stats <apiURL> <adminAPIKey>';

// Description for the top level command
exports.desc = 'See stats on how mich content your Ghost site has';

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
};

// What to do when this command is executed
exports.run = async (argv) => {
    let timer = Date.now();
    let context = {errors: []};

    try {
        // Fetch the tasks, configured correctly according to the options passed in
        let runner = contentStats.getTaskRunner(argv);

        // Run the migration
        await runner.run(context);

        // Show the tables
        ui.log(context.tables.stats);
        ui.log(context.tables.users);

        // Report success
        ui.log.ok(`Successfully showed stats in ${Date.now() - timer}ms.`);
    } catch (error) {
        ui.log.error('There were errors', context.errors);
    }
};
