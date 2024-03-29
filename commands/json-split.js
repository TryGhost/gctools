import {ui} from '@tryghost/pretty-cli';
import jsonSplit from '../tasks/json-split.js';

// Internal ID in case we need one.
const id = 'json-split';

const group = 'Tools:';

// The command to run and any params
const flags = 'json-split <jsonFile>';

// Description for the top level command
const desc = 'Split a large Ghost export JSON file into multiple smaller files';

// Descriptions for the individual params
const paramsDesc = ['Path to the large JSON file'];

// Configure all the options
const setup = (sywac) => {
    sywac.boolean('-V --verbose', {
        defaultValue: false,
        desc: 'Show verbose output'
    });
    sywac.number('-M, --maxPosts', {
        defaultValue: 500,
        desc: 'Maximum number of posts per file'
    });
};

// What to do when this command is executed
const run = async (argv) => {
    let timer = Date.now();
    let context = {errors: []};

    try {
        // Fetch the tasks, configured correctly according to the options passed in
        let jsonSpliter = jsonSplit.getTaskRunner(argv);

        // Run the migration
        await jsonSpliter.run(context);

        if (argv.verbose) {
            ui.log.info('Done');
        }
    } catch (error) {
        ui.log.error('Done with errors', context.errors);
    }

    // Report success
    ui.log.ok(`Successfully split JSON file in ${Date.now() - timer}ms.`);
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
