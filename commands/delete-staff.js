import deleteStaff from '../tasks/delete-staff.js';
import {ui} from '@tryghost/pretty-cli';

// Internal ID in case we need one.
export const id = 'delete-staff';

export const group = 'Content:';

// The command to run and any params
export const flags = 'delete-staff <apiURL> <adminAPIKey>';

// Description for the top level command
export const desc = 'Delete posts in Ghost (requires staff token)';

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
    sywac.array('--filterRole', {
        defaultValue: false,
        desc: 'Comma-separated list of roles to delete'
    });
    sywac.boolean('--filterNoPosts', {
        defaultValue: true,
        desc: 'Only delete staff with zero posts'
    });
    sywac.number('--maxStaff', {
        defaultValue: 100,
        desc: 'THe max number if staff to delete (defaults to 100)'
    });
    sywac.number('--delayBetweenCalls', {
        defaultValue: 1000,
        desc: 'The delay between API calls, in ms'
    });
};

// What to do when this command is executed
export const run = async (argv) => {
    let timer = Date.now();
    let context = {errors: []};

    try {
        // Fetch the tasks, configured correctly according to the options passed in
        let runner = deleteStaff.getTaskRunner(argv);

        // Run the migration
        await runner.run(context);
    } catch (error) {
        ui.log.error('Done with errors', context.errors);
    }

    // Report success
    ui.log.ok(`Successfully deleted ${context.deleted.length} users in ${Date.now() - timer}ms.`);
};
