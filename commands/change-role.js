import {ui} from '@tryghost/pretty-cli';
import changeRole from '../tasks/change-role.js';

// Internal ID in case we need one.
const id = 'change-role';

const group = 'Content:';

// The command to run and any params
const flags = 'change-role <apiURL> <adminAPIKey>';

// Description for the top level command
const desc = 'Change user roles in Ghost (requires staff token) [Ghost >= 5.2.0]';

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
const run = async (argv) => {
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

export default {
    id,
    group,
    flags,
    desc,
    paramsDesc,
    setup,
    run
};
