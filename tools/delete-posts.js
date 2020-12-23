const inquirer = require('inquirer');
const deletePosts = require('../tasks/delete-posts');
const batchGhostDiscover = require('../lib/batch-ghost-discover');
const ghostAPICreds = require('../lib/ghost-api-creds');
const ui = require('@tryghost/pretty-cli').ui;

const choice = {
    name: 'Delete posts',
    value: 'deletePosts'
};

async function getGhostTags() {
    const url = process.env.GC_TOOLS_apiURL;
    const key = process.env.GC_TOOLS_adminAPIKey;

    let apiTags = await batchGhostDiscover({
        type: 'tags',
        url: url,
        key: key
    });

    let tags = [];

    apiTags.forEach(function (tag){
        tags.push({
            name: `${tag.name} (${tag.count.posts} posts)`,
            value: tag.slug
        });
    });

    return tags;
}

async function getGhostAuthors() {
    const url = process.env.GC_TOOLS_apiURL;
    const key = process.env.GC_TOOLS_adminAPIKey;

    let apiUsers = await batchGhostDiscover({
        type: 'users',
        url: url,
        key: key
    });

    let users = [];

    apiUsers.forEach(function (author){
        users.push({
            name: `${author.name} (${author.count.posts} posts)`,
            value: author.slug
        });
    });

    return users;
}

const options = [
    ...ghostAPICreds,
    {
        type: 'list',
        name: 'delete_by',
        message: 'Delete content by:',
        choices: [
            {
                name: 'Delete by author',
                value: 'delete_by_author'
            },
            {
                name: 'Delete by tag',
                value: 'delete_by_tag'
            }
        ]
    },
    {
        type: 'checkbox',
        name: 'tag',
        message: 'Filter by tag:',
        pageSize: 20,
        choices: function () {
            return getGhostTags();
        },
        when: function (answers) {
            return answers.delete_by === 'delete_by_tag';
        }
    },
    {
        type: 'checkbox',
        name: 'author',
        message: 'Filter by author:',
        choices: function () {
            return getGhostAuthors();
        },
        when: function (answers) {
            return answers.delete_by === 'delete_by_author';
        }
    }
];

async function run() {
    let opts = {};

    await inquirer.prompt(options).then(async (answers) => {
        Object.assign(opts, answers);

        let timer = Date.now();
        let context = {errors: []};

        try {
            let runner = deletePosts.getTaskRunner(opts);
            await runner.run(context);
            ui.log.ok(`Successfully deleted ${context.deleted.length} posts in ${Date.now() - timer}ms.`);
        } catch (error) {
            ui.log.error('Done with errors', context.errors);
        }
    });
}

module.exports.choice = choice;
module.exports.doit = options;
module.exports.run = run;
