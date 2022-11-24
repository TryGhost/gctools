import {ui} from '@tryghost/pretty-cli';
import changeTags from '../tasks/change-tags.js';

// Internal ID in case we need one.
const id = 'change-tags';

const group = 'Content:';

// The command to run and any params
const flags = 'change-tags <apiURL> <adminAPIKey> <csvFile>';

// Description for the top level command
const desc = 'Combine tags in Ghost';

// Descriptions for the individual params
const paramsDesc = [
    'URL to your Ghost API',
    'Admin API key',
    'Path to CSV file'
];

// Configure all the options
const setup = (sywac) => {
    sywac.boolean('-V --verbose', {
        defaultValue: false,
        desc: 'Show verbose output'
    });
    sywac.boolean('--addAsPrimaryTag', {
        defaultValue: false,
        desc: 'If enabled, newly added tags will be the primary tag. If not, they will be added last in the list'
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

    try {
        // Fetch the tasks, configured correctly according to the options passed in
        let runner = changeTags.getTaskRunner(argv);

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
