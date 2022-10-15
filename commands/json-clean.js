import {ui} from '@tryghost/pretty-cli';
import jsonClean from '../tasks/json-clean.js';

// Internal ID in case we need one.
const id = 'json-clean';

const group = 'Beta:';

// The command to run and any params
const flags = 'json-clean <jsonFile>';

// Description for the top level command
const desc = 'Clean a JSON file so it only contains content';

// Descriptions for the individual params
const paramsDesc = ['Path to the Ghost JSON file'];

// Configure all the options
const setup = (sywac) => {
    sywac.boolean('-V --verbose', {
        defaultValue: true,
        desc: 'Show verbose output'
    });
};

// What to do when this command is executed
const run = async (argv) => {
    let timer = Date.now();
    let context = {errors: []};

    try {
        // Fetch the tasks, configured correctly according to the options passed in
        let jsonCleaner = jsonClean.getTaskRunner(argv);

        // Run the migration
        await jsonCleaner.run(context);

        if (argv.verbose) {
            ui.log.info('Done');
        }
    } catch (error) {
        ui.log.error('Done with errors', context.errors);
    }

    // Report success
    ui.log.ok(`Successfully cleaned JSON file in ${Date.now() - timer}ms.`);
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
