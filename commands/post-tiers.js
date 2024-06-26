import {ui} from '@tryghost/pretty-cli';
import postTiers from '../tasks/post-tiers.js';

// Internal ID in case we need one.
const id = 'post-tiers';

const group = 'Content:';

// The command to run and any params
const flags = 'post-tiers <apiURL> <adminAPIKey>';

// Description for the top level command
const desc = 'Add extra tier to post with tiers';

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
    sywac.enumeration('--filterTierId', {
        defaultValue: null,
        required: true,
        desc: 'Select posts with this tier. i.e. \'123456abcd7890efa123bc12\''
    });
    sywac.string('--addTierId', {
        defaultValue: null,
        required: true,
        desc: 'The tier ID that will be added to these posts. i.e. \'903456abcd7890efa123bc12\''
    });
    sywac.number('--delayBetweenCalls', {
        defaultValue: 50,
        desc: 'The delay between API calls, in ms'
    });
};

// What to do when this command is executed
const run = async (argv) => {
    let timer = Date.now();
    let context = {errors: []};

    // The task depends on this being an array with the tier ID and 'tiers' string
    if (argv.filterTierId) {
        argv.filterTierId = [argv.filterTierId, 'tiers'];
    }

    try {
        // Fetch the tasks, configured correctly according to the options passed in
        let runner = postTiers.getTaskRunner(argv);

        // Run the migration
        await runner.run(context);
    } catch (error) {
        ui.log.error('Done with errors', context.errors);
    }

    // Report success
    ui.log.ok(`Successfully updated ${context.updated.length} posts in ${Date.now() - timer}ms.`);
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
