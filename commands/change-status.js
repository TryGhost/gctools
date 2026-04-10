import {ui} from '@tryghost/pretty-cli';
import changeStatus from '../tasks/change-status.js';

// Internal ID in case we need one.
const id = 'change-status';

const group = 'Content:';

// The command to run and any params
const flags = 'change-status <apiURL> <adminAPIKey>';

// Description for the top level command
const desc = 'Switch the status for posts';

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
    sywac.enumeration('--status', {
        defaultValue: 'all',
        choices: ['all', 'draft', 'published'],
        desc: 'Post visibility'
    });
    sywac.enumeration('--visibility', {
        defaultValue: 'all',
        choices: ['all', 'public', 'members', 'paid'],
        desc: 'Post visibility'
    });
    sywac.string('--tag', {
        defaultValue: null,
        desc: 'Filter by tag'
    });
    sywac.string('--author', {
        defaultValue: null,
        desc: 'Filter by author'
    });
    sywac.enumeration('--new_status', {
        choices: ['draft', 'published'],
        defaultValue: 'draft',
        desc: 'New status'
    });
    sywac.number('--delayBetweenCalls', {
        defaultValue: 50,
        desc: 'The delay between API calls, in ms'
    });
};

// What to do when this command is executed
const run = async (argv) => {
    let timer = Date.now();
    let context = {errors: []};

    try {
        // Fetch the tasks, configured correctly according to the options passed in
        let runner = changeStatus.getTaskRunner(argv);

        // Run the migration
        await runner.run(context);
    } catch (error) {
        ui.log.error('Done with errors', context.errors);
    }

    // Report success
    ui.log.ok(`Successfully changed the visibility of ${context.changed.length} posts in ${Date.now() - timer}ms.`);
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
