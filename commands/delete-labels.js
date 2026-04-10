import {ui} from '@tryghost/pretty-cli';
import deleteLabels from '../tasks/delete-labels.js';

// Internal ID in case we need one.
const id = 'delete-labels';

const group = 'Members:';

// The command to run and any params
const flags = 'delete-labels <apiURL> <adminAPIKey>';

// Description for the top level command
const desc = 'Delete labels in Ghost';

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
    sywac.array('--labels', {
        defaultValue: null,
        desc: 'Name of the label to delete, in the format \'First\' \'Second\''
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
        let runner = deleteLabels.getTaskRunner(argv);

        // Run the migration
        await runner.run(context);
    } catch (error) {
        ui.log.error('Done with errors', context.errors);
    }

    // Report success
    ui.log.ok(`Successfully deleted ${context.deleted.length} labels in ${Date.now() - timer}ms.`);
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
