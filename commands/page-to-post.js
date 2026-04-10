import {ui} from '@tryghost/pretty-cli';
import pageToPost from '../tasks/page-to-post.js';

// Internal ID in case we need one.
const id = 'page-to-post';

const group = 'Members:';

// The command to run and any params
const flags = 'page-to-post <apiURL> <adminAPIKey>';

// Description for the top level command
const desc = 'Change posts to pages, and pages to posts.';

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
    sywac.string('--id', {
        defaultValue: null,
        desc: 'The ID for the post or page'
    });
    sywac.string('--tagSlug', {
        defaultValue: null,
        desc: 'Select posts with this tag to change type'
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
        let runner = pageToPost.getTaskRunner(argv);

        // Run the migration
        await runner.run(context);
    } catch (error) {
        ui.log.error('Done with errors', context.errors);
    }

    // Report success
    ui.log.ok(`Successfully changed ${context.updated.length} posts to pages in ${Date.now() - timer}ms.`);
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
