import {ui} from '@tryghost/pretty-cli';
import letterdropStripe from '../tasks/letterdrop-stripe.js';

// Internal ID in case we need one.
const id = 'letterdrop-stripe';

const group = 'Beta:';

// The command to run and any params
const flags = 'letterdrop-stripe <letterdropCSV> <stripeCSV>';

// Description for the top level command
const desc = 'Add Stripe customer IDs to Letterdrop subscriber export';

// Descriptions for the individual params
const paramsDesc = [
    'The Letterdrop members CSV',
    'Stripe customers CSV'
];

// Configure all the options
const setup = (sywac) => {
    sywac.boolean('-V --verbose', {
        defaultValue: false,
        desc: 'Show verbose output'
    });
    sywac.boolean('--writeCSVs', {
        defaultValue: true,
        desc: 'Create a new CSV files (set to false to skip)'
    });
};

// What to do when this command is executed
const run = async (argv) => {
    let timer = Date.now();
    let context = {errors: []};

    try {
        // Fetch the tasks, configured correctly according to the options passed in
        let runner = letterdropStripe.getTaskRunner(argv);

        // Run the migration
        await runner.run(context);
    } catch (error) {
        ui.log.error('Done with errors', context.errors);
    }

    // Report success
    // ui.log.ok(`Successfully found ${context.combinedNewMembers.length} new members in ${Date.now() - timer}ms.`);
    ui.log.ok(`Successfully done in ${Date.now() - timer}ms.`);
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
