import {ui} from '@tryghost/pretty-cli';
import contentStats from '../tasks/content-stats.js';

// Internal ID in case we need one.
const id = 'content-stats';

const group = 'Content:';

// The command to run and any params
const flags = 'content-stats <apiURL> <adminAPIKey>';

// Description for the top level command
const desc = 'See stats on how mich content your Ghost site has';

// Descriptions for the individual params
const paramsDesc = [
    'URL to your Ghost API',
    'Admin API key'
];

// Configure all the options
const setup = (sywac) => {
    sywac.boolean('-V --verbose', {
        defaultValue: false,
        desc: 'Show verbose output'
    });
    sywac.boolean('--listEmptyAuthors', {
        defaultValue: false,
        desc: 'List the empty authors'
    });
};

// What to do when this command is executed
const run = async (argv) => {
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

        if (argv.listEmptyAuthors) {
            ui.log('\n\nAuthors with no posts:');
            ui.log(context.tables.emptyAuthors);
        }

        // Report success
        ui.log.ok(`Successfully showed stats in ${Date.now() - timer}ms.`);
    } catch (error) {
        ui.log.error('There were errors', context.errors);
    }
};

export default {
    id,
    group,
    flags,
    desc,
    paramsDesc,
    setup,
    run
};
