import deleteMembers from '../tasks/delete-members.js';
import {ui} from '@tryghost/pretty-cli';

// Internal ID in case we need one.
export const id = 'delete-members';

export const group = 'Content:';

// The command to run and any params
export const flags = 'delete-members <apiURL> <adminAPIKey>';

// Description for the top level command
export const desc = 'Delete members in Ghost';

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
    sywac.number('--delayBetweenCalls', {
        defaultValue: 50,
        desc: 'The delay between API calls, in ms'
    });
};

// What to do when this command is executed
export const run = async (argv) => {
    let timer = Date.now();
    let context = {errors: []};

    try {
        // Fetch the tasks, configured correctly according to the options passed in
        let runner = deleteMembers.getTaskRunner(argv);

        // Run the migration
        await runner.run(context);
    } catch (error) {
        ui.log.error('Done with errors', context.errors);
    }

    // Report success
    ui.log.ok(`Successfully deleted ${context.deleted.length} members in ${Date.now() - timer}ms.`);
};
