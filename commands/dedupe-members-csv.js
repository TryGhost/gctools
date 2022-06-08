import dedupeMembers from '../tasks/dedupe-members-csv.js';
import {ui} from '@tryghost/pretty-cli';

// Internal ID in case we need one.
export const id = 'dedupe-members-csv';

export const group = 'Content:';

// The command to run and any params
export const flags = 'dedupe-members-csv <existingMembers> <newFree> [newComp] [newPaid]';

// Description for the top level command
export const desc = 'Deduplicate members';

// Descriptions for the individual params
export const paramsDesc = [
    'The current members CSV',
    'New free members CSV',
    'New comp members CSV',
    'New paid members CSV'
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
};

// What to do when this command is executed
export const run = async (argv) => {
    let timer = Date.now();
    let context = {errors: []};

    try {
        // Fetch the tasks, configured correctly according to the options passed in
        let runner = dedupeMembers.getTaskRunner(argv);

        // Run the migration
        await runner.run(context);
    } catch (error) {
        ui.log.error('Done with errors', context.errors);
    }

    // Report success
    ui.log.ok(`Successfully found ${context.combinedNewMembers.length} new members in ${Date.now() - timer}ms.`);
};
