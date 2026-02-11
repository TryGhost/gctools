import {ui} from '@tryghost/pretty-cli';
import cleanSlugs from '../tasks/clean-slugs.js';

// Internal ID in case we need one.
const id = 'clean-slugs';

const group = 'Content:';

// The command to run and any params
const flags = 'clean-slugs <apiURL> <adminAPIKey>';

// Description for the top level command
const desc = 'Find and remove alphanumeric IDs from post and tag slugs';

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
    sywac.boolean('--dry-run', {
        defaultValue: false,
        desc: 'Show what would be changed without making changes'
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
        let runner = cleanSlugs.getTaskRunner(argv);

        // Run the migration
        await runner.run(context);
    } catch (error) {
        ui.log.error('Done with errors', context.errors);
    }

    // Report success
    let postCount = context.updated ? context.updated.length : 0;
    let tagCount = context.updatedTags ? context.updatedTags.length : 0;
    let totalCount = postCount + tagCount;

    if (totalCount > 0) {
        let messages = [];
        if (postCount > 0) {
            messages.push(`${postCount} post${postCount === 1 ? '' : 's'}`);
        }
        if (tagCount > 0) {
            messages.push(`${tagCount} tag${tagCount === 1 ? '' : 's'}`);
        }
        ui.log.ok(`Successfully updated ${messages.join(' and ')} in ${Date.now() - timer}ms.`);
    } else {
        ui.log.ok(`No slugs needed cleaning in ${Date.now() - timer}ms.`);
    }
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