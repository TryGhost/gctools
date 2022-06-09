import zipCreate from '../tasks/zip-create.js';
import {ui} from '@tryghost/pretty-cli';

// Internal ID in case we need one.
export const id = 'zip-create';

export const group = 'Tools:';

// The command to run and any params
export const flags = 'zip-create <dirPath>';

// Description for the top level command
export const desc = 'Create multiple zip files of a predefined maximum size from a source directory';

// Descriptions for the individual params
export const paramsDesc = ['Path to the large directory'];

// Configure all the options
export const setup = (sywac) => {
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
export const run = async (argv) => {
    let timer = Date.now();
    let context = {errors: []};

    try {
        // Fetch the tasks, configured correctly according to the options passed in
        let zipCreator = zipCreate.getTaskRunner(argv);

        // Run the migration
        await zipCreator.run(context);

        if (argv.verbose) {
            // ui.log.info('Done', require('util').inspect(context.result.data, false, 2));
            ui.log.info('Done');
        }
    } catch (error) {
        ui.log.error('Done with errors', context.errors);
    }

    // Report success
    ui.log.ok(`Successfully created zip in ${Date.now() - timer}ms.`);
};
