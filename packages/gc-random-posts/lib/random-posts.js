import GhostAdminAPI from '@tryghost/admin-api';
import {ui} from '@tryghost/pretty-cli';
import GCUtils from '@tryghost/gc-utils';
import chalk from 'chalk';

import {getRandomPostContent} from './generate.js';

const prompts = GCUtils.prompts;
const siteCredentials = GCUtils.siteCredentials;
const {addPosts} = GCUtils.postOps;

// Internal ID in case we need one.
export const id = 'random-posts';

// The group in which commands are grouped by in the CLI
export const group = 'Content:';

// Define whether to show this tool in the interactive prompt
export const interactive = true;

// The name displayed in the interactive prompt
export const name = 'Random posts';

// The command to run and any params
export const flags = 'random-posts <apiURL> <adminAPIKey>';

// Description for the top level command
export const desc = 'Insert random posts';

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
    sywac.number('--count', {
        defaultValue: 10,
        desc: 'The number of posts to add'
    });
    sywac.number('--titleMinLength', {
        defaultValue: 3,
        desc: 'The minimum number of words in the title'
    });
    sywac.number('--titleMaxLength', {
        defaultValue: 8,
        desc: 'The maximum number of words in the title'
    });
    sywac.enumeration('--contentUnit', {
        defaultValue: 'paragraphs',
        choices: ['paragraphs', 'sentences', 'words'],
        desc: 'The type of content you want to define the size of'
    });
    sywac.number('--contentCount', {
        defaultValue: 10,
        desc: 'The number of units for each post'
    });
    sywac.number('--paragraphLowerBound', {
        defaultValue: 3,
        desc: 'Min. number of sentences per paragraph'
    });
    sywac.number('--paragraphUpperBound', {
        defaultValue: 7,
        desc: 'Max. number of sentences per paragraph'
    });
    sywac.number('--sentenceLowerBound', {
        defaultValue: 3,
        desc: 'Min. number of words per sentence'
    });
    sywac.number('--sentenceUpperBound', {
        defaultValue: 15,
        desc: 'Max. number of words per sentence'
    });
    sywac.string('--author', {
        defaultValue: false,
        desc: 'The assigned author email address. Defaults to who created the API key'
    });
    sywac.string('--tag', {
        defaultValue: '#gctools',
        desc: 'Comma separated list of tags'
    });
    sywac.enumeration('--status', {
        defaultValue: 'published',
        choices: ['public', 'draft', 'scheduled'],
        desc: 'Post status'
    });
    sywac.enumeration('--visibility', {
        defaultValue: 'public',
        choices: ['public', 'members', 'paid'],
        desc: 'Post visibility'
    });
    sywac.number('--delayBetweenCalls', {
        defaultValue: 50,
        desc: 'The delay between API calls, in ms'
    });
    sywac.boolean('--confirm', {
        defaultValue: true,
        desc: 'Ask for confirmation before changing visibility'
    });

    sywac.string('--startDate', {
        defaultValue: null,
        desc: 'START DATE'
    });

    sywac.string('--endDate', {
        defaultValue: null,
        desc: 'END DATE'
    });
};

// What to do when this command is executed
export const run = async (argv) => {
    // let context = {errors: []};
    const isInteractive = (argv && argv.interactive) || false;

    // If no site url & key arr supplied
    if (!argv.apiURL || !argv.adminAPIKey) {
        let getSiteInfo = await siteCredentials({
            list: true,
            apiURL: argv.apiURL,
            adminAPIKey: argv.adminAPIKey
        });

        argv.apiURL = getSiteInfo.apiURL;
        argv.adminAPIKey = getSiteInfo.adminAPIKey;
    }

    // Init the API connection
    argv.api = new GhostAdminAPI({
        url: argv.apiURL,
        key: argv.adminAPIKey,
        version: 'v5.0'
    });

    // Optionally prompt to confirm the changes
    const confirmChanges = (!argv.confirm && !isInteractive) || await prompts.confirm({
        message: `Do you want to add ${chalk.red(argv.count)} new random posts?`
    });

    // Exit if denied
    if (confirmChanges === false) {
        ui.log.ok('No random posts were added. Bye!');
        process.exit(0); // Exit silently
    }

    // Start timer
    const timer = Date.now();

    let newPosts = [];

    [...Array(argv.count)].forEach(() => {
        newPosts.push(getRandomPostContent(argv));
    });

    // Upload the changed pages
    const addedPosts = await addPosts({
        api: argv.api,
        items: newPosts,
        verbose: argv.verbose
    });

    ui.log.ok(`${addedPosts.length} random posts were added in ${Date.now() - timer}ms.`);

    return {
        posts: addedPosts
    };
};
