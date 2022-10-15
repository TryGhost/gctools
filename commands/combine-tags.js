import {ui} from '@tryghost/pretty-cli';
import combineTags from '../tasks/combine-tags.js';

// Internal ID in case we need one.
const id = 'combine-tags';

const group = 'Content:';

// The command to run and any params
const flags = 'combine-tags <apiURL> <adminAPIKey> <jsonFile>';

// Description for the top level command
const desc = 'Combine tags in Ghost';

// Descriptions for the individual params
const paramsDesc = [
    'URL to your Ghost API',
    'Admin API key',
    'JSON file containing the tags to combine'
];

// Configure all the options
const setup = (sywac) => {
    sywac.boolean('-V --verbose', {
        defaultValue: false,
        desc: 'Show verbose output'
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

    if (argv.author) {
        argv.author = argv.author.split(',').map((item) => {
            // This needs to be improved. The task is expecting an array of objects that each contain a `slug` value
            return {
                slug: item.trim()
            };
        });
    }

    if (argv.new_tags) {
        argv.new_tags = argv.new_tags.split(',').map((item) => {
            return item.trim();
        });
    }

    try {
        // Fetch the tasks, configured correctly according to the options passed in
        let runner = combineTags.getTaskRunner(argv);

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
