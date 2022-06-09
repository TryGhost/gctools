import changeVisibility from '../tasks/change-visibility.js';
import {ui} from '@tryghost/pretty-cli';
// import {input} from '../lib/basic-prompts.js';
import {buildParams, buildParamDescriptions, buildArguments} from '../lib/build-sywac-values.js';

// Internal ID in case we need one.
export const id = 'change-visibility';

export const group = 'Content:';

export const interactive = true;
export const name = 'Change post visibility';

const options = {
    params: [
        {
            name: 'apiURL',
            required: true,
            desc: 'URL to your Ghost API'
        },
        {
            name: 'adminAPIKey',
            required: true,
            desc: 'Admin API key'
        }
    ],
    arguments: [
        {
            type: 'boolean',
            flags: '-V --verbose',
            defaultValue: false,
            desc: 'Show verbose output'
        },
        {
            type: 'enumeration',
            flags: '--visibility',
            defaultValue: 'all',
            choices: ['all', 'public', 'members', 'paid'],
            desc: 'Post visibility'
        },
        {
            type: 'string',
            flags: '--tag',
            defaultValue: null,
            desc: 'Filter by tag'
        },
        {
            type: 'string',
            flags: '--author',
            defaultValue: null,
            desc: 'Filter by author'
        },
        {
            type: 'enumeration',
            flags: '--new_visibility',
            choices: ['public', 'members', 'paid'],
            defaultValue: 'members',
            desc: 'New visibility slug'
        },
        {
            type: 'number',
            flags: '--delayBetweenCalls',
            defaultValue: 50,
            desc: 'The delay between API calls, in ms'
        }
    ]
};

// The command to run and any params
export const flags = `change-visibility ${buildParams(options.params)}`;

// Description for the top level command
export const desc = 'Switch the visibility for posts from one level to another';

// Descriptions for the individual params
export const paramsDesc = buildParamDescriptions(options.params);

// Configure all the arguments
export const setup = sywac => buildArguments(sywac, options.arguments);

// What to do when this command is executed
export const run = async (argv) => {
    const timer = Date.now();
    let context = {errors: []};
    // const isInteractive = (argv && argv.interactive) || false;

    // Don't do anything here just yet
    // if (isInteractive) {
    //     argv.myText = await input({
    //         message: 'What is this?'
    //     });
    // }

    try {
        // Fetch the tasks, configured correctly according to the options passed in
        const runner = changeVisibility.getTaskRunner(argv);

        // Run the migration
        await runner.run(context);
    } catch (error) {
        ui.log.error('Done with errors', context.errors);
    }

    // Report success
    ui.log.ok(`Successfully changed the visibility of ${context.changed.length} posts in ${Date.now() - timer}ms.`);
};
