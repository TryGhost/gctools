import GhostAdminAPI from '@tryghost/admin-api';
import {ui} from '@tryghost/pretty-cli';
import GCUtils from '@tryghost/gc-utils';
import chalk from 'chalk';

const prompts = GCUtils.prompts;
const siteCredentials = GCUtils.siteCredentials;
const {createPostsFilter, getPostsCount, getPosts, deletePosts} = GCUtils.postOps;

// Internal ID in case we need one.
export const id = 'delete-pages';

// The group in which commands are grouped by in the CLI
export const group = 'Content:';

// Define whether to show this tool in the interactive prompt
export const interactive = true;

// The name displayed in the interactive prompt
export const name = 'Delete pages';

// The command to run and any params
export const flags = 'delete-pages <apiURL> <adminAPIKey>';

// Description for the top level command
export const desc = 'Delete a filtered set of pages';

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
    sywac.array('--visibility', {
        defaultValue: null,
        choices: ['public', 'members', 'paid'],
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
    sywac.string('--filter', {
        defaultValue: null,
        desc: 'A Ghost-compatible filter - This will override any other filters'
    });
    sywac.boolean('--confirm', {
        defaultValue: true,
        desc: 'Ask for confirmation before changing visibility'
    });
    sywac.number('--delayBetweenCalls', {
        defaultValue: 50,
        desc: 'The delay between API calls, in ms'
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

    // If we have no filter defined,
    if (!argv.filter && isInteractive) {
        // Filter by visibility
        if (!argv.visibility || !argv.visibility.length) {
            if (await prompts.confirm({message: 'Filter by visibility?'})) {
                argv.visibility = await prompts.checkbox({
                    message: 'Page visibility',
                    choices: ['public', 'members', 'paid']
                });

                if (argv.visibility.includes('all')) {
                    argv.visibility = false;
                }
            }
        }

        // Filter by tag
        if (!argv.tag || !argv.tag.length) {
            if (await prompts.confirm({message: 'Filter by tag?'})) {
                let getTags = await prompts.tags({
                    api: argv.api,
                    tag: argv.tag,
                    message: `Filter by tag: (Leave blank for all) ${chalk.yellow('[Type to search]')}`
                });

                argv.tag = getTags.map(tag => tag.slug);
            }
        }

        // Filter by author
        if (!argv.author || !argv.author.length) {
            if (await prompts.confirm({message: 'Filter by author?'})) {
                let getAuthors = await prompts.authors({
                    api: argv.api,
                    author: argv.author,
                    message: `Filter by author: (Leave blank for all) ${chalk.yellow('[Type to search]')}`
                });

                argv.author = getAuthors.map(author => author.slug);
            }
        }
    }

    // Create the filter string
    const thePagesFilter = argv.filter || createPostsFilter({
        visibility: argv.visibility,
        tag: argv.tag,
        author: argv.author
    });

    // Fetch the number of pages affected by the above filter, without getting _all_ the pages
    const thePagesCount = await getPostsCount({
        api: argv.api,
        type: 'pages',
        filter: thePagesFilter || null
    });

    // Optionally prompt to confirm the changes
    const confirmChanges = (!argv.confirm && !isInteractive) || await prompts.confirm({
        message: `Do you want to delete ${chalk.red(thePagesCount)} pages based on the filter ${chalk.red(thePagesFilter)} ?`
    });

    // Exit if denied
    if (confirmChanges === false) {
        ui.log.ok('No pages visibility changes were made. Bye!');
        process.exit(0); // Exit silently
    }

    // Optionally prompt to confirm the changes again
    const confirmChangesAgain = (!argv.confirm && !isInteractive) || await prompts.confirm({
        message: `${chalk.bgRed(chalk.white('For real, there are no backups. You sure?'))}`
    });

    // Exit if denied
    if (confirmChangesAgain === false) {
        ui.log.ok('No pages visibility changes were made. Bye!');
        process.exit(0); // Exit silently
    }

    // Start timer
    const timer = Date.now();

    // Fetch all post data from the API
    const thePages = await getPosts({
        api: argv.api,
        type: 'pages',
        filter: thePagesFilter || null,
        fields: 'id,title,updated_at',
        verbose: argv.verbose
    });

    // Upload the changed pages
    const deletedPages = await deletePosts({
        api: argv.api,
        type: 'pages',
        items: thePages,
        verbose: argv.verbose
    });

    ui.log.ok(`${deletedPages.length} pages were deleted in ${Date.now() - timer}ms.`);

    return {
        pages: deletedPages
    };
};
