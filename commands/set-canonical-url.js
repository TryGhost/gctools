import {ui} from '@tryghost/pretty-cli';
import setCanonicalUrl from '../tasks/set-canonical-url.js';

// Internal ID in case we need one.
const id = 'set-canonical-url';

const group = 'Content:';

// The command to run and any params
const flags = 'set-canonical-url <apiURL> <adminAPIKey>';

// Description for the top level command
const desc = 'Clear or rebuild the canonical_url for posts';

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
        desc: 'Preview what would change without writing'
    });
    sywac.string('--newCanonicalUrl', {
        defaultValue: null,
        desc: `URL template, e.g. 'https://example.com/topic/{slug}/'. Use {slug} as a placeholder for the post slug. Omit to clear canonical_url to null.`
    });
    sywac.enumeration('--status', {
        defaultValue: 'all',
        choices: ['all', 'draft', 'published'],
        desc: 'Post status'
    });
    sywac.enumeration('--visibility', {
        defaultValue: 'all',
        choices: ['all', 'public', 'members', 'paid'],
        desc: 'Post visibility'
    });
    sywac.string('--tag', {
        defaultValue: null,
        desc: `Filter by tag slug(s), comma separated. i.e. 'world-news, weather-reports'`
    });
    sywac.string('--author', {
        defaultValue: null,
        desc: `Filter by author slug(s), comma separated. i.e. 'jane-doe'`
    });
    sywac.enumeration('--dateRange', {
        defaultValue: 'all',
        choices: ['all', 'custom'],
        desc: 'Filter by published_at date range. Set to "custom" and supply --dateRangeStart / --dateRangeEnd to enable.'
    });
    sywac.string('--dateRangeStart', {
        defaultValue: null,
        desc: 'Start of date range (YYYY-MM-DD), only used when --dateRange=custom'
    });
    sywac.string('--dateRangeEnd', {
        defaultValue: null,
        desc: 'End of date range (YYYY-MM-DD), only used when --dateRange=custom'
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

    // Validate --newCanonicalUrl: if the flag is present but has no argument,
    // sywac may coerce it to a non-string value. We treat null as "clear", so
    // any non-null, non-string value is a usage error.
    if (argv.newCanonicalUrl !== null && typeof argv.newCanonicalUrl !== 'string') {
        ui.log.error(`--newCanonicalUrl requires an argument. Omit the flag entirely to clear canonical_url.`);
        return;
    }

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

    // Convert date strings to Date objects so the task can call toISOString()
    if (argv.dateRange === 'custom') {
        if (!argv.dateRangeStart || !argv.dateRangeEnd) {
            ui.log.error(`--dateRange=custom requires both --dateRangeStart and --dateRangeEnd (YYYY-MM-DD).`);
            return;
        }
        argv.dateRangeStart = new Date(argv.dateRangeStart);
        argv.dateRangeEnd = new Date(argv.dateRangeEnd);
    }

    try {
        // Fetch the tasks, configured correctly according to the options passed in
        let runner = setCanonicalUrl.getTaskRunner(argv);

        // Run the migration
        await runner.run(context);
    } catch (error) {
        ui.log.error('Done with errors', context.errors);
    }

    if (!argv.dryRun) {
        // Report success for write mode
        ui.log.ok(`Successfully updated canonical_url on ${context.updated.length} posts in ${Date.now() - timer}ms.`);
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
