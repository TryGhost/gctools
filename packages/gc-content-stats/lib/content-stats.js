import GhostAdminAPI from '@tryghost/admin-api';
import {ui} from '@tryghost/pretty-cli';
import GCUtils from '@tryghost/gc-utils';
import chalk from 'chalk';
import Table from 'tty-table';

const siteCredentials = GCUtils.siteCredentials;

// Internal ID in case we need one.
export const id = 'content-stats';

// The group in which commands are grouped by in the CLI
export const group = 'Utilities:';

// Define whether to show this tool in the interactive prompt
export const interactive = true;

// The name displayed in the interactive prompt
export const name = 'View content stats';

// The command to run and any params
export const flags = 'content-stats <apiURL> <adminAPIKey>';

// Description for the top level command
export const desc = 'See the number of posts, pages, tags, staff, and members';

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
};

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

    // Get the content stats
    const stats = await GCUtils.stats.get({
        api: argv.api
    });

    const statsHeader = [{
        value: 'Resource',
        headerColor: 'cyan',
        color: 'white',
        headerAlign: 'left',
        align: 'left',
        width: 20
    },
    {
        value: 'Count',
        headerColor: 'cyan',
        color: 'white',
        headerAlign: 'left',
        align: 'left',
        width: 10
    }];

    const statsRows = [
        ['Posts', String(stats.posts.count)],
        [chalk.gray('- Public'), chalk.gray(String(stats.public_posts.count))],
        [chalk.gray('- Members'), chalk.gray(String(stats.members_posts.count))],
        [chalk.gray('- Paid'), chalk.gray(String(stats.paid_posts.count))],
        ['Pages', String(stats.pages.count)],
        ['Tags', String(stats.tags.count)]
    ];

    const membersHeader = [{
        value: 'Members',
        headerColor: 'cyan',
        color: 'white',
        headerAlign: 'left',
        align: 'left',
        width: 20
    },
    {
        value: 'Count',
        headerColor: 'cyan',
        color: 'white',
        headerAlign: 'left',
        align: 'left',
        width: 10
    }];

    const membersRows = [
        ['Total', String(stats.members.count)],
        [chalk.gray('- Free'), chalk.gray(String(stats.members.status.free.count))],
        [chalk.gray('- Complimentary'), chalk.gray(String(stats.members.status.comped.count))],
        [chalk.gray('- Paid'), chalk.gray(String(stats.members.status.paid.count))]
    ];

    const usersHeader = [{
        value: 'Staff',
        headerColor: 'cyan',
        color: 'white',
        headerAlign: 'left',
        align: 'left',
        width: 20
    },
    {
        value: 'Count',
        headerColor: 'cyan',
        color: 'white',
        headerAlign: 'left',
        align: 'left',
        width: 10
    }];

    const usersRows = [
        ['Total', String(stats.users.count)],
        [chalk.gray('- Owner'), chalk.gray(String(stats.users.roles.owner.count))],
        [chalk.gray('- Administrator'), chalk.gray(String(stats.users.roles.administrator.count))],
        [chalk.gray('- Editor'), chalk.gray(String(stats.users.roles.editor.count))],
        [chalk.gray('- Author'), chalk.gray(String(stats.users.roles.author.count))],
        [chalk.gray('- Contributor'), chalk.gray(String(stats.users.roles.contributor.count))]
    ];

    ui.log(Table(statsHeader, statsRows, {compact: true}).render());
    ui.log(Table(membersHeader, membersRows, {compact: true}).render());
    ui.log(Table(usersHeader, usersRows, {compact: true}).render());
};
