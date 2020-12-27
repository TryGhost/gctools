const inquirer = require('inquirer');
const randomPosts = require('../tasks/random-posts');
const {getAPITags, getAPIAuthorsEmails} = require('../lib/ghost-api-choices.js');
const ghostAPICreds = require('../lib/ghost-api-creds');
const ui = require('@tryghost/pretty-cli').ui;
const _ = require('lodash');

const choice = {
    name: 'Add random posts',
    value: 'randomPosts'
};

const options = [
    ...ghostAPICreds,
    {
        type: 'input',
        name: 'count',
        message: 'Number of posts to create:',
        default: function () {
            return 10;
        }
    },
    {
        type: 'rawlist',
        name: 'status',
        message: 'Status:',
        choices: [
            {
                name: 'Published',
                value: 'published'
            },
            {
                name: 'Draft',
                value: 'draft'
            }
        ]
    },
    {
        type: 'rawlist',
        name: 'visibility',
        message: 'Visibility:',
        choices: [
            {
                name: 'Public',
                value: 'public'
            },
            {
                name: 'Members',
                value: 'members'
            },
            {
                name: 'Paid',
                value: 'paid'
            }
        ]
    },
    {
        type: 'checkbox',
        name: 'tags',
        message: 'Tags (comma separated list):',
        choices: function () {
            return Object.assign(getAPITags([{
                name: 'Custom tag',
                value: 'gctools_new_tag'
            }]));
        }
    },
    {
        type: 'input',
        name: 'new_tag',
        message: 'Custom tag (comma separated list):',
        when: function (answers) {
            return answers.tags.includes('gctools_new_tag');
        }
    },
    {
        type: 'checkbox',
        name: 'userEmail',
        message: 'Author:',
        choices: function () {
            return getAPIAuthorsEmails();
        }
    }
    // },
    // {
    //     type: 'input',
    //     name: 'userEmail',
    //     message: 'Author email (leave blank to use the API key creators user):'
    // }
];

async function run() {
    await inquirer.prompt(options).then(async (answers) => {
        // Handle the case where a new tag is wanted
        if (answers.new_tag) {
            var tagsArray = answers.new_tag.split(',').map(function (item) {
                return item.trim();
            });
            _.remove(answers.tags, function (tag) {
                return tag === 'gctools_new_tag';
            });
            answers.tags.push(...tagsArray);
            answers.tags = answers.tags.join(',');
            delete answers.new_tag;
        }

        let timer = Date.now();
        let context = {errors: []};

        try {
            let runner = randomPosts.getTaskRunner(answers);
            await runner.run(context);
            ui.log.ok(`Successfully added ${context.inserted.length} posts in ${Date.now() - timer}ms.`);
        } catch (error) {
            ui.log.error('Done with errors', context.errors);
        }
    });
}

module.exports.choice = choice;
module.exports.doit = options;
module.exports.run = run;
