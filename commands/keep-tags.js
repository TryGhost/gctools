import path from 'node:path';
import {ui} from '@tryghost/pretty-cli';
import keepTags from '../tasks/keep-tags.js';

// Internal ID in case we need one.
const id = 'keep-tags';

const group = 'Content:';

// The command to run and any params
const flags = 'keep-tags <apiURL> <adminAPIKey> <csvFile>';

// Description for the top level command
const desc = 'Delete every Ghost tag that is not listed in a CSV of tags to keep';

// Descriptions for the individual params
const paramsDesc = [
    'URL to your Ghost API',
    'Admin API key',
    'Path to a single-column CSV of tags to keep (the first row is always treated as a header)'
];

// Configure all the options
const setup = (sywac) => {
    sywac.boolean('-V --verbose', {
        defaultValue: false,
        desc: 'Show verbose output'
    });
    sywac.boolean('--dryRun', {
        defaultValue: false,
        desc: 'Report which tags would be deleted, without deleting anything'
    });
    sywac.enumeration('--matchBy', {
        defaultValue: 'slug',
        choices: ['slug', 'name', 'either'],
        desc: 'Match CSV values against the tag slug, name, or either. Note that `either` makes the "nothing matched" safety check much less likely to catch a wrong CSV'
    });
    sywac.boolean('--force', {
        defaultValue: false,
        desc: 'Bypass the safety checks that abort when the CSV is empty or matches no tags. Internal tags are still never deleted'
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
    const dryRun = Boolean(argv.dryRun || argv['dry-run']);

    try {
        // Fetch the tasks, configured correctly according to the options passed in
        let runner = keepTags.getTaskRunner(argv);

        // Run the migration
        await runner.run(context);
    } catch (error) {
        ui.log.error('Done with errors', context.errors);
        return;
    }

    const keptCount = context.toKeep.length + context.toKeepInternal.length;

    if (context.unmatched.length > 0) {
        ui.log.warn(`${context.unmatched.length} CSV value${context.unmatched.length === 1 ? '' : 's'} matched no Ghost tag.`);
    }

    // Report success
    if (dryRun) {
        ui.log.ok(`Dry run: would keep ${keptCount} and delete ${context.toDelete.length} tags in ${Date.now() - timer}ms.`);
    } else {
        ui.log.ok(`Kept ${keptCount} tags and deleted ${context.deleted.length} of ${context.toDelete.length} in ${Date.now() - timer}ms.`);

        if (context.failed.length > 0) {
            ui.log.warn(`${context.failed.length} tag${context.failed.length === 1 ? '' : 's'} could not be deleted. See the report for details.`);
        }
    }

    if (context.reportPath) {
        ui.log.info(`Report written to ${path.resolve(context.reportPath)}`);
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
