import deletePages from '../tasks/delete-pages.js';
import {ui} from '@tryghost/pretty-cli';

// Internal ID in case we need one.
export const id = 'delete-pages';

export const group = 'Content:';

// The command to run and any params
export const flags = 'delete-pages <apiURL> <adminAPIKey>';

// Description for the top level command
export const desc = 'Delete pages in Ghost';

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
    sywac.string('--tag', {
        defaultValue: null,
        desc: 'Delete content with this tag slug'
    });
    sywac.string('--author', {
        defaultValue: null,
        desc: 'Delete content with this author slug'
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
        let runner = deletePages.getTaskRunner(argv);

        // Run the migration
        await runner.run(context);
    } catch (error) {
        ui.log.error('Done with errors', context.errors);
    }

    // Report success
    ui.log.ok(`Successfully deleted ${context.deleted.length} pages in ${Date.now() - timer}ms.`);
};
