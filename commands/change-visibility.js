const GhostAdminAPI = require('@tryghost/admin-api');
const ui = require('@tryghost/pretty-cli').ui;
const chalk = require('chalk');
const siteCredentials = require('../lib/prompts/site-credentials.js');
const visibility = require('../lib/prompts/visibility.js');
const tags = require('../lib/prompts/tags.js');
const authors = require('../lib/prompts/authors.js');
const {createGetPostsFilter, getPosts} = require('../lib/functions/get-posts.js');
const {maybeObjectToArray, maybeStringToArray, maybeArrayToString} = require('../lib/utils.js');
const confirm = require('../lib/prompts/basic/confirm.js');

const {addPosts} = require('../lib/functions/add-posts.js');

// Internal ID in case we need one.
exports.id = 'change-visibility';

exports.group = 'Content:';

// The command to run and any params
exports.flags = 'change-visibility [apiURL] [adminAPIKey]';

// Description for the top level command
exports.desc = 'Change the visibility for posts from one level to another';

// Descriptions for the individual params
exports.paramsDesc = [
    'URL to your Ghost API',
    'Admin API key'
];

// Configure all the options
exports.setup = (sywac) => {
    sywac.boolean('-L --list', {
        defaultValue: false,
        desc: 'Choose from a list of saved sites, or add a new saved list'
    });
    sywac.boolean('-V --verbose', {
        defaultValue: false,
        desc: 'Show verbose output'
    });
    sywac.array('--visibility', {
        defaultValue: false,
        desc: 'Post visibility'
    });
    sywac.array('--tag', {
        defaultValue: null,
        desc: 'Filter by tag'
    });
    sywac.array('--author', {
        defaultValue: null,
        desc: 'Filter by author'
    });
    sywac.array('--new_visibility', {
        defaultValue: false,
        desc: 'New visibility slug'
    });
    sywac.number('--delayBetweenCalls', {
        defaultValue: 50,
        desc: 'The delay between API calls, in ms'
    });
};

// What to do when this command is executed
exports.run = async (argv) => {
    // If no site url & key arr supplied
    if (!argv.apiURL || !argv.adminAPIKey) {
        let getSiteInfo = await siteCredentials.ask({
            list: argv.list,
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

    // Filter by visibility
    if (!argv.visibility.length) {
        if (await confirm.ask({message: 'Filter by visibility?'})) {
            let getVisibility = await visibility.ask({
                visibility: argv.visibility,
                message: 'Filter current visibility:',
                validationMessage: 'Please select at please one visibility option',
                allowNew: true
            });

            argv.visibility = getVisibility.result;
        }
    }

    // Filter by tag
    if (!argv.tag.length) {
        if (await confirm.ask({message: 'Filter by tag?'})) {
            let getTags = await tags.ask({
                api: argv.api,
                tag: argv.tag,
                message: `Filter by tag: (Leave blank for all) ${chalk.yellow('[Type to search]')}`
            });

            argv.tag = maybeObjectToArray(getTags.result, 'slug');
        }
    }

    // Filter by author
    if (!argv.author.length) {
        if (await confirm.ask({message: 'Filter by author?'})) {
            let getAuthors = await authors.ask({
                api: argv.api,
                author: argv.author,
                message: `Filter by author: (Leave blank for all) ${chalk.yellow('[Type to search]')}`
            });

            argv.author = maybeObjectToArray(getAuthors.result, 'slug');
        }
    }

    // Select new visibility
    if (!argv.new_visibility.length) {
        let getVisibility = await visibility.ask({
            new_visibility: argv.new_visibility,
            message: 'Select new visibility:',
            validationMessage: 'Please select at please one visibility option',
            single: true
        });

        argv.new_visibility = maybeStringToArray(getVisibility.result);
    }

    // Find out how many posts will be affected by this change
    const thePostsFilter = createGetPostsFilter({
        visibility: argv.visibility,
        tag: argv.tag,
        author: argv.author,
        new_visibility: argv.new_visibility
    });

    const thePosts = await getPosts({
        api: argv.api,
        filter: thePostsFilter
    });

    // Confirm the changes
    const confirmChanges = await confirm.ask({
        message: `Do you want to change the visibility of ${chalk.yellow(thePosts.length)} posts (${chalk.yellow(thePostsFilter)}) posts to be ${chalk.yellow(`visibility:${argv.new_visibility}`)}?`
    });

    if (confirmChanges === false) {
        ui.log.ok('No posts visibility changes');
        process.exit(0); // Exit silently
    }

    // Change the visibility of returned data
    let updatedVisibilityPosts = thePosts.map((post) => {
        post.visibility = maybeArrayToString(argv.new_visibility);
        return post;
    });

    updatedVisibilityPosts = updatedVisibilityPosts.slice(0, 15);

    // Upload the changed posts
    const updatedPosts = await addPosts({
        api: argv.api,
        type: 'posts',
        items: updatedVisibilityPosts
    });

    ui.log.ok(`Posts visibility changed for ${updatedPosts.length} posts`);
};
