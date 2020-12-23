const inquirer = require('inquirer');
const randomPosts = require('../tasks/random-posts');
const ghostAPICreds = require('../lib/ghost-api-creds');
const ui = require('@tryghost/pretty-cli').ui;

const choice = {
    name: 'Add random posts',
    value: 'randomPosts'
};

const options = [
    ...ghostAPICreds,
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

async function run() {
    let opts = {};

    await inquirer.prompt(options).then(async (answers) => {
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
