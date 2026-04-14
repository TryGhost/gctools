import {ui} from '@tryghost/pretty-cli';
import inlineMedia from '../tasks/inline-media.js';

// Internal ID in case we need one.
const id = 'inline-media';

const group = 'Content:';

// The command to run and any params
const flags = 'inline-media <apiURL> <adminAPIKey>';

// Description for the top level command
const desc = 'Download external images and re-upload them to Ghost';

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
    sywac.boolean('--dryRun', {
        defaultValue: false,
        desc: 'Show what would be processed without downloading or uploading'
    });
    sywac.enumeration('--status', {
        defaultValue: 'all',
        choices: ['all', 'draft', 'published'],
        desc: 'Post status'
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
    sywac.string('--assetDomains', {
        defaultValue: null,
        desc: 'Comma separated list of domains to process media from. i.e. \'cdn.example.com, images.example.com\''
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
            return {
                slug: item.trim()
            };
        });
    }

    if (argv.author) {
        argv.author = argv.author.split(',').map((item) => {
            return {
                slug: item.trim()
            };
        });
    }

    if (argv.assetDomains) {
        argv.assetDomains = argv.assetDomains.split(',').map((item) => {
            return item.trim();
        });
    }

    try {
        // Fetch the tasks, configured correctly according to the options passed in
        let runner = inlineMedia.getTaskRunner(argv);

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
