import {ui} from '@tryghost/pretty-cli';
import addMemberNewsletterSubscription from '../tasks/add-member-newsletter-subscription.js';

// Internal ID in case we need one.
const id = 'add-member-newsletter-subscription';

const group = 'Members:';

// The command to run and any params
const flags = 'add-member-newsletter-subscription <apiURL> <adminAPIKey> <newsletterID>';

// Description for the top level command
const desc = 'Add member newsletter subscription';

// Descriptions for the individual params
const paramsDesc = [
    'URL to your Ghost API',
    'Admin API key',
    'Newsletter ID to be subscribed from'
];

// Configure all the options
const setup = (sywac) => {
    sywac.boolean('-V --verbose', {
        defaultValue: false,
        desc: 'Show verbose output'
    });
    sywac.string('--onlyForLabelSlug', {
        defaultValue: false,
        desc: 'Optional label to filter members'
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
        let runner = addMemberNewsletterSubscription.getTaskRunner(argv);

        // Run the migration
        await runner.run(context);
    } catch (error) {
        ui.log.error('Done with errors', context.errors);
    }

    // Report success
    ui.log.ok(`Successfully added ${context.updated.length} subscriptions in ${Date.now() - timer}ms.`);
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
