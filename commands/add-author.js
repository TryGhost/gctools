import {ui} from '@tryghost/pretty-cli';
import addAuthor from '../tasks/add-author.js';

// Internal ID in case we need one.
const id = 'add-author';

const group = 'Content:';

// The command to run and any params
const flags = 'add-author <apiURL> <adminAPIKey>';

// Description for the top level command
const desc = 'Add an author to posts';

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
    sywac.string('--author', {
        defaultValue: null,
        desc: 'Current author slug'
    });
    sywac.string('--tag', {
        defaultValue: null,
        desc: 'Select posts with these tag slugs, inside single quotes. i.e. \'existing-tag, newsletter\''
    });
    sywac.string('--new_author', {
        defaultValue: null,
        desc: 'New author slug'
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
        let runner = addAuthor.getTaskRunner(argv);

        // Run the migration
        await runner.run(context);
    } catch (error) {
        ui.log.error('Done with errors', context.errors);
    }

    // Report success
    ui.log.ok(`Successfully changed ${context.changed.length} posts in ${Date.now() - timer}ms.`);
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
