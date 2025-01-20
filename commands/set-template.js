import {ui} from '@tryghost/pretty-cli';
import setTemplate from '../tasks/set-template.js';

// Internal ID in case we need one.
const id = 'set-template';

const group = 'Content:';

// The command to run and any params
const flags = 'set-template <apiURL> <adminAPIKey>';

// Description for the top level command
const desc = 'Set posts to use a specific custom template';

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
    sywac.string('--tag', {
        defaultValue: null,
        desc: 'Select posts with this tag slug'
    });
    sywac.string('--author', {
        defaultValue: null,
        desc: 'Select posts with this author slug'
    });
    sywac.enumeration('--status', {
        defaultValue: 'all',
        choices: ['all', 'draft', 'published'],
        desc: 'Post visibility'
    });
    sywac.string('--templateSlug', {
        defaultValue: null,
        desc: 'The template file name without extension'
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
        let runner = setTemplate.getTaskRunner(argv);

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
