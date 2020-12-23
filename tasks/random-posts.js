const inquirer = require('inquirer');
const randomPosts = require('../tools/random-posts');
const ui = require('@tryghost/pretty-cli').ui;

const choice = {
    name: 'Add random posts',
    value: 'randomPosts'
};

const options = [
    {
        type: 'input',
        name: 'apiURL',
        message: 'Enter the URL to your Ghost API',
        filter: function (val) {
            return val.trim();
        }
    },
    {
        type: 'input',
        name: 'adminAPIKey',
        message: 'Enter the Admin API key',
        filter: function (val) {
            return val.trim();
        }
    },
    {
        type: 'input',
        name: 'count',
        message: 'Set number of posts to create',
        default: function () {
            return 10;
        }
    },
    {
        type: 'rawlist',
        name: 'status',
        message: 'Select post status',
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
        message: 'Select post visibility',
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
        type: 'input',
        name: 'tags',
        message: 'Set the post tag(s)',
        default: function () {
            return '#gctools';
        }
    },
    {
        type: 'input',
        name: 'userEmail',
        message: 'Set the post author email (leave blank to use the API key creators user)'
    }
];

function run() {
    let opts = {};

    inquirer.prompt(options).then(async (answers) => {
        Object.assign(opts, answers);

        let timer = Date.now();
        let context = {errors: []};

        try {
            let runner = randomPosts.getTaskRunner(opts);
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
