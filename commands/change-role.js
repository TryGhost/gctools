const changeRole = require('../tasks/change-role');
const ui = require('@tryghost/pretty-cli').ui;

// Internal ID in case we need one.
exports.id = 'change-role';

exports.group = 'Content:';

// The command to run and any params
exports.flags = 'change-role <apiURL> <adminAPIKey>';

// Description for the top level command
exports.desc = 'Change user roles in Ghost (requires staff token)';

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
    sywac.array('--filterRole', {
        defaultValue: false,
        desc: 'Comma-separated list of roles to change'
    });
    sywac.string('--newRoleID', {
        defaultValue: false,
        desc: 'The new role ID'
    });
    sywac.number('--delayBetweenCalls', {
        defaultValue: 1000,
        desc: 'The delay between API calls, in ms'
    });
};

// What to do when this command is executed
exports.run = async (argv) => {
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
