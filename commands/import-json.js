import {ui} from '@tryghost/pretty-cli';
import importJson from '../tasks/import-json.js';

// Internal ID in case we need one.
const id = 'import-json';

const group = 'Content:';

// The command to run and any params
const flags = 'import-json <apiURL> <adminAPIKey> <jsonFile>';

// Description for the top level command
const desc = 'Import posts from a Ghost JSON export file';

// Descriptions for the individual params
const paramsDesc = [
    'URL to your Ghost API',
    'Admin API key',
    'Path to the Ghost JSON export file'
];

// Configure all the options
const setup = (sywac) => {
    sywac.boolean('-V --verbose', {
        defaultValue: false,
        desc: 'Show verbose output'
    });
    sywac.boolean('-y --yes', {
        defaultValue: false,
        desc: 'Skip confirmation prompt'
    });
    sywac.string('--importStatus', {
        defaultValue: null,
        desc: 'Override post status (null = retain original, "draft", "published")'
    });
    sywac.enumeration('--contentType', {
        defaultValue: 'all',
        choices: ['all', 'posts', 'pages'],
        desc: 'Type of content to import'
    });
    sywac.number('--delayBetweenCalls', {
        defaultValue: 50,
        desc: 'The delay between API calls, in ms'
    });
    sywac.boolean('--dryRun', {
        defaultValue: false,
        desc: 'Preview import without making changes'
    });
    sywac.boolean('--skipCacheRefresh', {
        defaultValue: false,
        desc: 'Skip API fetch, use existing cache (faster for multiple files)'
    });
};

// What to do when this command is executed
const run = async (argv) => {
    let timer = Date.now();
    let context = {errors: []};

    try {
        // Fetch the tasks, configured correctly according to the options passed in
        let runner = importJson.getTaskRunner(argv);

        // Run the migration
        await runner.run(context);

        // Print any warnings about skipped posts
        importJson.printWarnings(context);

        // Report success
        if (argv.dryRun) {
            ui.log.info(`Dry run complete. ${context.newPosts?.length || 0} posts would be imported.`);
        } else {
            ui.log.ok(`Successfully imported ${context.imported?.length || 0} posts in ${Date.now() - timer}ms.`);
        }

        if (context.skipped?.length > 0) {
            ui.log.warn(`${context.skipped.length} posts skipped due to missing authors.`);
        }

        if (context.duplicatePosts?.length > 0) {
            ui.log.info(`${context.duplicatePosts.length} duplicate posts were skipped.`);
        }
    } catch (error) {
        ui.log.error('Done with errors', context.errors);
    } finally {
        // Clean up database connection
        importJson.cleanup(context);
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
