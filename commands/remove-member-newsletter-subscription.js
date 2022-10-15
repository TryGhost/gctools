import {ui} from '@tryghost/pretty-cli';
import removeMemberNewsletterSubscription from '../tasks/remove-member-newsletter-subscription.js';

// Internal ID in case we need one.
const id = 'remove-member-newsletter-subscription';

const group = 'Content:';

// The command to run and any params
const flags = 'remove-member-newsletter-subscription <apiURL> <adminAPIKey> <newsletterID>';

// Description for the top level command
const desc = 'Remove member newsletter subscription';

// Descriptions for the individual params
const paramsDesc = [
    'URL to your Ghost API',
    'Admin API key',
    'Newsletter ID to be unsubscribed from'
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
        let runner = removeMemberNewsletterSubscription.getTaskRunner(argv);

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
