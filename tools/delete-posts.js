const inquirer = require('inquirer');
const deletePosts = require('../tasks/delete-posts');
const {getAPIAuthors, getAPITags} = require('../lib/ghost-api-choices.js');
const ghostAPICreds = require('../lib/ghost-api-creds');
const ui = require('@tryghost/pretty-cli').ui;

const choice = {
    name: 'Delete posts',
    value: 'deletePosts'
};

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
            return getAPITags();
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
            return getAPIAuthors();
        },
        when: function (answers) {
            return answers.delete_by === 'delete_by_author';
        }
    }
];

async function run() {
    await inquirer.prompt(options).then(async (answers) => {
        let timer = Date.now();
        let context = {errors: []};

        try {
            let runner = deletePosts.getTaskRunner(answers);
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
