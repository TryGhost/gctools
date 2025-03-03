import {ui} from '@tryghost/pretty-cli';
import findReplace from '../tasks/find-replace.js';

// Internal ID in case we need one.
const id = 'find-replace';

const group = 'Content:';

// The command to run and any params
const flags = 'find-replace <apiURL> <adminAPIKey>';

// Description for the top level command
const desc = 'Find & replace text in Ghost';

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
    sywac.string('--find', {
        defaultValue: null,
        desc: 'Find'
    });
    sywac.string('--replace', {
        defaultValue: null,
        desc: 'Replace with'
    });
    sywac.array('--where', {
        defaultValue: 'mobiledoc',
        choices: ['all', 'mobiledoc', 'html', 'lexical', 'title', 'slug', 'custom_excerpt', 'meta_title', 'meta_description', 'twitter_title', 'twitter_description', 'og_title', 'og_description'],
        desc: 'Where to perform the find & replace (comma separated, eg: mobiledoc,title,meta_title)'
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

    if (argv.where.includes('all')) {
        argv.where = ['mobiledoc', 'title', 'slug', 'custom_excerpt', 'meta_title', 'meta_description', 'twitter_title', 'twitter_description', 'og_title', 'og_description'];
    }

    try {
        // Fetch the tasks, configured correctly according to the options passed in
        let runner = findReplace.getTaskRunner(argv);

        // Run the migration
        await runner.run(context);
    } catch (error) {
        ui.log.error('Done with errors', context.errors);
    }

    // Report success
    ui.log.ok(`Successfully updated ${context.updated.length} strings in ${Date.now() - timer}ms.`);
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
