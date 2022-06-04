const GhostAdminAPI = require('@tryghost/admin-api');
const ui = require('@tryghost/pretty-cli').ui;
const Table = require('tty-table');
const chalk = require('chalk');
const siteCredentials = require('../lib/prompts/site-credentials.js');
const {getStats} = require('../lib/stats.js');

// Internal ID in case we need one.
exports.id = 'content-stats';

exports.group = 'Content:';

// The command to run and any params
exports.flags = 'content-stats [apiURL] [adminAPIKey]';

// Description for the top level command
exports.desc = 'See stats on how much content your Ghost site has';

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

    // Get the content stats
    const stats = await getStats({
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

    ui.log(Table(statsHeader, statsRows, {compact: true}).render());

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

    ui.log(Table(membersHeader, membersRows, {compact: true}).render());

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

    ui.log(Table(usersHeader, usersRows, {compact: true}).render());
};
