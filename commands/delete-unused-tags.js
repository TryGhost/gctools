import { ui } from '@tryghost/pretty-cli';
import deleteEmptyTags from '../tasks/delete-unused-tags.js';

// Internal ID in case we need one.
const id = 'delete-empty-tags';

const group = 'Content:';

// The command to run and any params
const flags = 'delete-empty-tags <apiURL> <adminAPIKey>';

// Description for the top level command
const desc = 'Delete tags in Ghost with no associated posts';

// Descriptions for the individual params
const paramsDesc = ['URL to your Ghost API', 'Admin API key'];

// Configure all the options
const setup = (sywac) => {
    sywac.boolean('-V --verbose', {
        defaultValue: false,
        desc: 'Show verbose output',
    });
    sywac.boolean('--dry-run', {
        defaultValue: false,
        desc: 'List tag names, slugs and post counts without deleting anything',
    });
    sywac.number('--maxPostCount', {
        defaultValue: 0,
        desc: 'Maximum number of associated posts a tag can have for it to be deleted (i.e. `2` will select tags with 2 or less associated posts)',
    });
    sywac.number('--delayBetweenCalls', {
        defaultValue: 50,
        desc: 'The delay between API calls, in ms',
    });
};

// What to do when this command is executed
const run = async (argv) => {
    let timer = Date.now();
    let context = { errors: [] };

    try {
        // Fetch the tasks, configured correctly according to the options passed in
        let runner = deleteEmptyTags.getTaskRunner(argv);

        // Run the migration
        await runner.run(context);
    } catch (error) {
        ui.log.error('Done with errors', context.errors.length ? context.errors : [error]);
        process.exitCode = 1;
        return;
    }

    if (argv.dryRun || argv['dry-run']) {
        ui.log(context.previewTable);
        ui.log.ok(
            `Dry run complete: ${context.tagsToDelete.length} tags would be deleted in ${Date.now() - timer}ms. No tags were deleted.`,
        );
        return;
    }

    // Report success
    ui.log.ok(`Successfully deleted ${context.deleted.length} tags in ${Date.now() - timer}ms.`);
};

export default {
    id,
    group,
    flags,
    desc,
    paramsDesc,
    setup,
    run,
};
