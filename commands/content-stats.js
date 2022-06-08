import contentStats from '../tasks/content-stats.js';
import {ui} from '@tryghost/pretty-cli';

// Internal ID in case we need one.
export const id = 'content-stats';

export const group = 'Content:';

// The command to run and any params
export const flags = 'content-stats <apiURL> <adminAPIKey>';

// Description for the top level command
export const desc = 'See stats on how mich content your Ghost site has';

// Descriptions for the individual params
export const paramsDesc = [
    'URL to your Ghost API',
    'Admin API key'
];

// Configure all the options
export const setup = (sywac) => {
    sywac.boolean('-V --verbose', {
        defaultValue: false,
        desc: 'Show verbose output'
    });
};

// What to do when this command is executed
export const run = async (argv) => {
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
