import {ui} from '@tryghost/pretty-cli';
import updatePostsFromJson from '../tasks/update-posts-from-json.js';

const {UPDATABLE_FIELDS} = updatePostsFromJson;
const validFieldValues = UPDATABLE_FIELDS.map(f => f.value);

// Internal ID in case we need one.
const id = 'update-posts-from-json';

const group = 'Content:';

// The command to run and any params
const flags = 'update-posts-from-json <apiURL> <adminAPIKey> <jsonFile>';

// Description for the top level command
const desc = 'Update Ghost posts from a Ghost export JSON file';

// Descriptions for the individual params
const paramsDesc = [
    'URL to your Ghost API',
    'Admin API key',
    'Path to the Ghost export JSON file'
];

// Configure all the options
const setup = (sywac) => {
    sywac.boolean('-V --verbose', {
        defaultValue: false,
        desc: 'Show verbose output'
    });
    sywac.string('--fields', {
        defaultValue: null,
        desc: `Comma-separated list of fields to update. Available: ${validFieldValues.join(', ')}`
    });
    sywac.boolean('--dryRun', {
        defaultValue: false,
        desc: 'Preview what would be changed without making any updates'
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

    if (!argv.fields) {
        ui.log.error(`Please provide --fields. Available fields: ${validFieldValues.join(', ')}`);
        return;
    }

    // Parse and validate fields
    let fields = argv.fields.split(',').map(f => f.trim()).filter(Boolean);
    let invalidFields = fields.filter(f => !validFieldValues.includes(f));

    if (invalidFields.length > 0) {
        ui.log.error(`Invalid fields: ${invalidFields.join(', ')}. Available fields: ${validFieldValues.join(', ')}`);
        return;
    }

    if (fields.length === 0) {
        ui.log.error(`No valid fields provided. Available fields: ${validFieldValues.join(', ')}`);
        return;
    }

    argv.fields = fields;

    try {
        let runner = updatePostsFromJson.getTaskRunner(argv);
        await runner.run(context);
    } catch (error) {
        ui.log.error('Done with errors', context.errors);
    }

    if (context.skipped && context.skipped.length > 0) {
        ui.log.warn(`Skipped ${context.skipped.length} posts with no changes.`);
    }

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
