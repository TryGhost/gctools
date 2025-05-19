import {ui} from '@tryghost/pretty-cli';
import setFeaturedImages from '../tasks/set-featured-images.js';

// Internal ID in case we need one.
const id = 'set-featured-images';

const group = 'Content:';

// The command to run and any params
const flags = 'set-featured-images <apiURL> <adminAPIKey>';

// Description for the top level command
const desc = 'Set featured images for posts that don\'t have one by using the first image in the post content';

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
        let runner = setFeaturedImages.getTaskRunner(argv);

        // Run the migration
        await runner.run(context);
    } catch (error) {
        ui.log.error('Done with errors', context.errors);
    }

    // Report success
    ui.log.ok(`Successfully processed ${context.processed} posts in ${Date.now() - timer}ms.`);
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