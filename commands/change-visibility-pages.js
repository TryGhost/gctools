import {ui} from '@tryghost/pretty-cli';
import changeVisibilityPages from '../tasks/change-visibility-pages.js';

// Internal ID in case we need one.
const id = 'change-visibility-pages';

const group = 'Content:';

// The command to run and any params
const flags = 'change-visibility-pages <apiURL> <adminAPIKey>';

// Description for the top level command
const desc = 'Switch the visibility for pages from one level to another';

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
const run = async (argv) => {
    let timer = Date.now();
    let context = {errors: []};

    try {
        // Fetch the tasks, configured correctly according to the options passed in
        let runner = changeVisibilityPages.getTaskRunner(argv);

        // Run the migration
        await runner.run(context);
    } catch (error) {
        ui.log.error('Done with errors', context.errors);
    }

    // Report success
    ui.log.ok(`Successfully changed the visibility of ${context.changed.length} pages in ${Date.now() - timer}ms.`);
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
