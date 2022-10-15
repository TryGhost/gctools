import {ui} from '@tryghost/pretty-cli';
import zipSplit from '../tasks/zip-split.js';

// Internal ID in case we need one.
const id = 'zip-split';

const group = 'Tools:';

// The command to run and any params
const flags = 'zip-split <zipFile>';

// Description for the top level command
const desc = 'Split a large zip file into smaller zips of a predefined maximum size';

// Descriptions for the individual params
const paramsDesc = ['Path to the large zip file'];

// Configure all the options
const setup = (sywac) => {
    sywac.boolean('-V --verbose', {
        defaultValue: false,
        desc: 'Show verbose output'
    });
    sywac.number('-M, --maxSize', {
        defaultValue: 100,
        desc: 'Max zip size, in MB'
    });
};

// What to do when this command is executed
const run = async (argv) => {
    let timer = Date.now();
    let context = {errors: []};

    try {
        // Fetch the tasks, configured correctly according to the options passed in
        let zipSpliter = zipSplit.getTaskRunner(argv);

        // Run the migration
        await zipSpliter.run(context);

        if (argv.verbose) {
            // ui.log.info('Done', require('util').inspect(context.result.data, false, 2));
            ui.log.info('Done');
        }
    } catch (error) {
        ui.log.error('Done with errors', context.errors);
    }

    // Report success
    ui.log.ok(`Successfully split zip in ${Date.now() - timer}ms.`);
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
