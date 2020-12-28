const inquirer = require('inquirer');
const findReplace = require('../tasks/find-replace');
const ghostAPICreds = require('../lib/ghost-api-creds');
const ui = require('@tryghost/pretty-cli').ui;

const choice = {
    name: 'Find & Replace',
    value: 'findReplace'
};

const options = [
    ...ghostAPICreds,
    {
        type: 'input',
        name: 'find',
        message: 'Find:'
    },
    {
        type: 'input',
        name: 'replace',
        message: 'Replace with:'
    },
    {
        type: 'checkbox',
        name: 'where',
        message: 'In these locations (IMPLEMENT ME):',
        pageSize: 20,
        choices: [
            {
                name: 'Content',
                value: 'content',
                checked: true
            },
            {
                name: 'Title',
                value: 'title'
            },
            {
                name: 'URL',
                value: 'url'
            },
            {
                name: 'Excerpt',
                value: 'excerpt'
            },
            {
                name: 'Meta Title',
                value: 'meta_title'
            },
            {
                name: 'Meta Description',
                value: 'meta_description'
            },
            {
                name: 'Twitter Title',
                value: 'twitter_title'
            },
            {
                name: 'Twitter Description',
                value: 'twitter_description'
            },
            {
                name: 'Facebook Title',
                value: 'facebook_title'
            },
            {
                name: 'Facebook Description',
                value: 'facebook_description'
            },
            {
                name: 'Email Subject',
                value: 'email_subject'
            }
        ]
    }
];

async function run() {
    ui.log.warn('BE CAREFUL - This can be dangerous, please backup your content first.');

    await inquirer.prompt(options).then(async (answers) => {
        let timer = Date.now();
        let context = {errors: []};

        try {
            let runner = findReplace.getTaskRunner(answers);
            await runner.run(context);
            ui.log.ok(`Successfully updated ${context.updated.length} posts in ${Date.now() - timer}ms.`);
        } catch (error) {
            ui.log.error('Done with errors', context.errors);
        }
    });
}

module.exports.choice = choice;
module.exports.doit = options;
module.exports.run = run;
