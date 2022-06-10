import GhostAdminAPI from '@tryghost/admin-api';
import {ui} from '@tryghost/pretty-cli';
import chalk from 'chalk';
import askFor from '../lib/prompts/index.js';
import siteCredentials from '../lib/site-credentials.js';
import {createPostsFilter, getPostsCount, getPosts} from '../lib/functions/get-posts.js';
import {editPosts} from '../lib/functions/edit-posts.js';

// Internal ID in case we need one.
export const id = 'change-visibility';

export const group = 'Content:';

export const interactive = true;
export const name = 'Change post visibility';

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
    sywac.string('--filter', {
        defaultValue: null,
        desc: 'A Ghost-compatible filter - This will override any other filters'
    });
    sywac.enumeration('--new_visibility', {
        choices: ['public', 'members', 'paid'],
        defaultValue: false,
        desc: 'New visibility slug'
    });
    sywac.number('--delayBetweenCalls', {
        defaultValue: 50,
        desc: 'The delay between API calls, in ms'
    });
};

// visibility:[all]+tags:[beer]+author:[paul]

// What to do when this command is executed
export const run = async (argv) => {
    // let context = {errors: []};
    // const isInteractive = (argv && argv.interactive) || false;

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

    // If we have no filter defined,
    if (!argv.filter) {
        // Filter by visibility
        if (!argv.visibility || !argv.visibility.length) {
            if (await askFor.confirm({message: 'Filter by visibility?'})) {
                argv.visibility = await askFor.checkbox({
                    message: 'Post visibility',
                    choices: ['all', 'public', 'members', 'paid'],
                    default: 'all'
                });

                if (argv.visibility.includes('all')) {
                    argv.visibility = false;
                }
            }
        }

        // Filter by tag
        if (!argv.tag || !argv.tag.length) {
            if (await askFor.confirm({message: 'Filter by tag?'})) {
                let getTags = await askFor.tags({
                    api: argv.api,
                    tag: argv.tag,
                    message: `Filter by tag: (Leave blank for all) ${chalk.yellow('[Type to search]')}`
                });

                argv.tag = getTags.map(tag => tag.slug);
            }
        }

        // Filter by author
        if (!argv.author || !argv.author.length) {
            if (await askFor.confirm({message: 'Filter by author?'})) {
                let getAuthors = await askFor.authors({
                    api: argv.api,
                    author: argv.author,
                    message: `Filter by author: (Leave blank for all) ${chalk.yellow('[Type to search]')}`
                });

                argv.author = getAuthors.map(author => author.slug);
            }
        }
    }

    // Select new visibility
    if (!argv.new_visibility) {
        argv.new_visibility = await askFor.list({
            message: 'New visibility',
            choices: ['public', 'members', 'paid'],
            default: 'members'
        });
    }

    // Create the filter string
    const thePostsFilter = argv.filter || createPostsFilter({
        visibility: argv.visibility,
        tag: argv.tag,
        author: argv.author
    });

    // Fetch the number of posts affected by the above filter, _without_ getting all the posts
    const thePostsCount = await getPostsCount({
        api: argv.api,
        filter: thePostsFilter
    });

    // Confirm the changes
    const confirmChanges = await askFor.confirm({
        message: `Do you want to change the visibility of ${chalk.yellow(thePostsCount)} posts (${chalk.yellow(thePostsFilter)}) posts to be ${chalk.yellow(`visibility:${argv.new_visibility}`)}?`
    });

    // Exit if denied
    if (confirmChanges === false) {
        ui.log.ok('No posts visibility changes were made. Bye!');
        process.exit(0); // Exit silently
    }

    // Start timer
    const timer = Date.now();

    // Fetch all post data from the API
    const thePosts = await getPosts({
        api: argv.api,
        filter: thePostsFilter
    });

    // Change the visibility of returned data
    let updatedVisibilityPosts = thePosts.map((post) => {
        post.visibility = argv.new_visibility;
        return post;
    });

    // Upload the changed posts
    const updatedPosts = await editPosts({
        api: argv.api,
        type: 'posts',
        items: updatedVisibilityPosts
    });

    ui.log.ok(`Posts visibility changed for ${updatedPosts.length} posts in ${Date.now() - timer}ms.`);
};
