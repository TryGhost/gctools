const addMemberNewsletterSubscription = require('../tasks/add-member-newsletter-subscription');
const ui = require('@tryghost/pretty-cli').ui;

// Internal ID in case we need one.
exports.id = 'add-member-newsletter-subscription';

exports.group = 'Content:';

// The command to run and any params
exports.flags = 'add-member-newsletter-subscription <apiURL> <adminAPIKey> <newsletterID>';

// Description for the top level command
exports.desc = 'Add member newsletter subscription';

// Descriptions for the individual params
exports.paramsDesc = [
    'URL to your Ghost API',
    'Admin API key',
    'Newsletter ID to be subscribed from'
];

// Configure all the options
exports.setup = (sywac) => {
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
exports.run = async (argv) => {
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
