import {ui} from '@tryghost/pretty-cli';
import addLabelToMembers from '../tasks/add-label-to-members.js';

// Internal ID in case we need one.
export const id = 'add-label-to-members';
export const group = 'Members:';

// The command to run and any params
export const flags = 'add-label-to-members <apiURL> <adminAPIKey> <csvPath> <label>';

// Description for the top level command
export const desc = 'Add a label to all members listed in a CSV file';

// Descriptions for the individual params
export const paramsDesc = [
    'URL to your Ghost API',
    'Admin API key',
    'Path to a members CSV file',
    'Label name to add to members'
];

// Configure all the options
export const setup = (sywac) => {
    sywac.boolean('-V --verbose', {
        defaultValue: false,
        desc: 'Show verbose output'
    });

    sywac.number('--delayBetweenCalls', {
        defaultValue: 50,
        desc: 'The delay between API calls, in ms'
    });

    sywac.number('--batchSize', {
        defaultValue: 50,
        desc: 'The number of members to process per API call'
    });
};

// What to do when this command is executed
export const run = async (argv) => {
    let timer = Date.now();
    let context = {errors: []};

    try {
        let runner = addLabelToMembers.getTaskRunner(argv);
        await runner.run(context);
    } catch (error) {
        ui.log.error('Done with errors', context.errors);
    }

    ui.log.ok(`Successfully labelled ${context.successful || 0} members in ${Date.now() - timer}ms.`);

    if (context.unsuccessful) {
        ui.log.warn(`Failed to label ${context.unsuccessful} members.`);
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
