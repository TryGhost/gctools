import changeAuthor from '../tasks/change-author.js';
import {ui} from '@tryghost/pretty-cli';

// Internal ID in case we need one.
export const id = 'change-author';

export const group = 'Content:';

// The command to run and any params
export const flags = 'change-author <apiURL> <adminAPIKey>';

// Description for the top level command
export const desc = 'Delete posts in Ghost';

// Descriptions for the individual params
export const paramsDesc = [
    'URL to your Ghost API',
    'Admin API key'
];

// Configure all the options
export const setup = (sywac) => {
    sywac.boolean('-V --verbose', {
        defaultValue: false,
        desc: 'Show verbose output'
    });
    sywac.string('--author', {
        defaultValue: null,
        desc: 'Current author slug'
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
export const run = async (argv) => {
    let timer = Date.now();
    let context = {errors: []};

    try {
        // Fetch the tasks, configured correctly according to the options passed in
        let runner = changeAuthor.getTaskRunner(argv);

        // Run the migration
        await runner.run(context);
    } catch (error) {
        ui.log.error('Done with errors', context.errors);
    }

    // Report success
    ui.log.ok(`Successfully changed ${context.changed.length} posts in ${Date.now() - timer}ms.`);
};
