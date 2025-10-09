import {ui} from '@tryghost/pretty-cli';
import removeTags from '../tasks/remove-tags.js';

// Internal ID in case we need one.
const id = 'remove-tags';

const group = 'Content:';

// The command to run and any params
const flags = 'remove-tags <apiURL> <adminAPIKey>';

// Description for the top level command
const desc = 'Remove tags from posts and pages in Ghost';

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
    sywac.array('--type', {
        defaultValue: 'all',
        choices: ['all', 'posts', 'pages'],
        desc: 'Content type'
    });
    sywac.enumeration('--visibility', {
        defaultValue: 'all',
        choices: ['all', 'public', 'members', 'paid'],
        desc: 'Select posts with this visibility setting'
    });
    sywac.string('--tag', {
        defaultValue: null,
        desc: 'Select posts with these tag slugs, inside single quotes. i.e. \'existing-tag, newsletter\''
    });
    sywac.string('--author', {
        defaultValue: null,
        desc: 'Select posts with these author slugs, inside single quotes. i.e. \'example-author\''
    });
    sywac.string('--before-date', {
        defaultValue: null,
        desc: 'Remove tags from content published before this date (YYYY-MM-DD format)'
    });
    sywac.string('--after-date', {
        defaultValue: null,
        desc: 'Remove tags from content published after this date (YYYY-MM-DD format)'
    });
    sywac.string('--remove_tags', {
        desc: 'Comma separated list of tag names to remove (not slugs), inside single quotes. i.e. \'Legacy Tag, Old Tag\''
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

    if (argv.tag) {
        argv.tag = argv.tag.split(',').map((item) => {
            // Convert comma-separated tag slugs to array of objects with slug property
            return {
                slug: item.trim()
            };
        });
    }

    if (argv.author) {
        argv.author = argv.author.split(',').map((item) => {
            // This needs to be improved. The task is expecting an array of objects that each contain a `slug` value
            return {
                slug: item.trim()
            };
        });
    }

    if (argv.remove_tags) {
        argv.remove_tags = argv.remove_tags.split(',').map((item) => {
            return item.trim();
        });
    }

    try {
        // Fetch the tasks, configured correctly according to the options passed in
        let runner = removeTags.getTaskRunner(argv);

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
