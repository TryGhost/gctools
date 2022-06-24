import GhostAdminAPI from '@tryghost/admin-api';
import {ui} from '@tryghost/pretty-cli';
import GCUtils from '@tryghost/gc-utils';
import chalk from 'chalk';
import fs from 'fs';
import url from 'url';
import path from 'path';

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));
const unsplashImages = JSON.parse(fs.readFileSync(path.join(__dirname, './unsplash-images.json')));

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
    sywac.string('--startDate', {
        defaultValue: null,
        desc: 'START DATE'
    });
    sywac.string('--endDate', {
        defaultValue: null,
        desc: 'END DATE'
    });
    sywac.boolean('--featureImage', {
        defaultValue: true,
        desc: 'Add random feature images'
    });
    sywac.number('--delayBetweenCalls', {
        defaultValue: 50,
        desc: 'The delay between API calls, in ms'
    });
    sywac.boolean('--confirm', {
        defaultValue: true,
        desc: 'Ask for confirmation before changing visibility'
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

    if (isInteractive) {
        if (!argv.count) {
            argv.count = await prompts.number({
                default: 10,
                message: `How manu posts to create`
            });
        }

        argv.status = await prompts.list({
            message: 'Post status',
            choices: ['published', 'draft'],
            default: 'published'
        });

        argv.visibility = await prompts.list({
            message: 'Post visibility',
            choices: ['public', 'members', 'paid'],
            default: 'public'
        });

        if (!argv.tag || !argv.tag.length) {
            let getTags = await prompts.tags({
                api: argv.api,
                tag: argv.tag,
                message: `Filter by tag: (Leave blank for all) ${chalk.yellow('[Type to search]')}`,
                addNew: true
            });

            argv.tag = getTags.map(tag => tag.name);
        }

        if (!argv.author || !argv.author.length) {
            let getAuthors = await prompts.authors({
                api: argv.api,
                author: argv.author,
                message: `Filter by author: (Leave blank for all) ${chalk.yellow('[Type to search]')}`
            });

            argv.author = getAuthors.map(author => author.slug);
        }

        const dateRangeChoice = await prompts.list({
            message: 'Date range',
            choices: ['Past year', 'Past month', 'Custom'],
            default: 'Past year'
        });

        const dateNow = new Date();
        const yearNow = dateNow.getFullYear();
        const monthNow = dateNow.getMonth();
        const dayNow = dateNow.getDate();

        if (dateRangeChoice === 'Past year') {
            argv.startDate = new Date(yearNow, monthNow - 12, dayNow);
            argv.endDate = new Date(yearNow, monthNow, dayNow);
        } else if (dateRangeChoice === 'Past month') {
            argv.startDate = new Date(yearNow, monthNow - 1, dayNow);
            argv.endDate = new Date(yearNow, monthNow, dayNow);
        } else {
            argv.startDate = await prompts.datetime({
                message: 'Start at',
                initial: new Date(yearNow, monthNow - 12, dayNow)
            });

            argv.endDate = await prompts.datetime({
                message: 'End at',
                initial: new Date(yearNow, monthNow, dayNow)
            });
        }

        argv.featureImage = await prompts.confirm({
            message: `Do you want feature images on these posts?`,
            default: true
        });
    }

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

    [...Array(argv.count)].forEach(async () => {
        newPosts.push(getRandomPostContent(argv, unsplashImages));
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
