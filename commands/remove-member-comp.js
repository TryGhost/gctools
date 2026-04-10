import {ui} from '@tryghost/pretty-cli';
import removeMemberCompSubscription from '../tasks/remove-member-comp-subscription.js';

// Internal ID in case we need one.
const id = 'remove-member-comp-subscription';

const group = 'Members:';

// The command to run and any params
const flags = 'remove-member-comp-subscription <apiURL> <adminAPIKey>';

// Description for the top level command
const desc = 'Remove member complimentary subscription';

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
    sywac.array('--onlyForLabelSlugs', {
        defaultValue: null,
        desc: 'Optional label to filter members'
    });
    sywac.string('--tierId', {
        defaultValue: null,
        desc: 'The ID for the tier to add the subscription to'
    });
    sywac.number('--delayBetweenCalls', {
        defaultValue: 100,
        desc: 'The delay between API calls, in ms'
    });
};

// What to do when this command is executed
const run = async (argv) => {
    let timer = Date.now();
    let context = {errors: []};

    try {
        // Fetch the tasks, configured correctly according to the options passed in
        let runner = removeMemberCompSubscription.getTaskRunner(argv);

        // Run the migration
        await runner.run(context);
    } catch (error) {
        ui.log.error('Done with errors', context.errors);
    }

    // Report success
    ui.log.ok(`Successfully removed ${context.updated.length} subscriptions in ${Date.now() - timer}ms.`);
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
