import changeRole from '../tasks/change-role.js';
import {ui} from '@tryghost/pretty-cli';

// Internal ID in case we need one.
export const id = 'change-role';

export const group = 'Content:';

// The command to run and any params
export const flags = 'change-role <apiURL> <adminAPIKey>';

// Description for the top level command
export const desc = 'Change user roles in Ghost (requires staff token) [Ghost >= 5.2.0]';

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
        desc: 'Comma-separated list of roles to change'
    });
    sywac.enumeration('--newRole', {
        defaultValue: false,
        desc: 'The new role name, e.g. `Editor`',
        choices: ['Contributor', 'Author', 'Editor', 'Administrator']
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
        let runner = changeRole.getTaskRunner(argv);

        // Run the migration
        await runner.run(context);
    } catch (error) {
        ui.log.error('Done with errors', context.errors);
    }

    // Report success
    ui.log.ok(`Successfully updated ${context.updated.length} users in ${Date.now() - timer}ms.`);
};
