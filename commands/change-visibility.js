import changeVisibility from '../tasks/change-visibility.js';
import {ui} from '@tryghost/pretty-cli';

// Internal ID in case we need one.
export const id = 'change-visibility';

export const group = 'Content:';

// The command to run and any params
export const flags = 'change-visibility <apiURL> <adminAPIKey>';

// Description for the top level command
export const desc = 'Switch the visibility for posts from one level to another';

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
    sywac.enumeration('--visibility', {
        defaultValue: 'all',
        choices: ['all', 'public', 'members', 'paid'],
        desc: 'Post visibility'
    });
    sywac.string('--tag', {
        defaultValue: null,
        desc: 'Filter by tag'
    });
    sywac.string('--author', {
        defaultValue: null,
        desc: 'Filter by author'
    });
    sywac.enumeration('--new_visibility', {
        choices: ['public', 'members', 'paid'],
        defaultValue: 'members',
        desc: 'New visibility slug'
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
        let runner = changeVisibility.getTaskRunner(argv);

        // Run the migration
        await runner.run(context);
    } catch (error) {
        ui.log.error('Done with errors', context.errors);
    }

    // Report success
    ui.log.ok(`Successfully changed the visibility of ${context.changed.length} posts in ${Date.now() - timer}ms.`);
};
