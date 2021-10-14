const inquirer = require('inquirer');
const addPreview = require('../tasks/add-preview');
const {getAPIAuthorsObj, getAPITagsObj} = require('../lib/ghost-api-choices.js');
const ghostAPICreds = require('../lib/ghost-api-creds');
const ui = require('@tryghost/pretty-cli').ui;

const choice = {
    name: 'Add public preview divider',
    value: 'addPreview'
};

const options = [
    ...ghostAPICreds,
    {
        type: 'list',
        name: 'visibility',
        message: 'Visibility:',
        choices: [
            {
                name: 'All',
                value: 'all'
            },
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
        name: 'tag',
        message: 'Filter by tag: (Leave blank for all)',
        pageSize: 20,
        choices: function () {
            return getAPITagsObj();
        }
    },
    {
        type: 'checkbox',
        name: 'author',
        message: 'Filter by author: (Leave blank for all)',
        choices: function () {
            return getAPIAuthorsObj();
        }
    },
    {
        type: 'number',
        name: 'previewPosition',
        message: 'The card position index the public preview should be inserted after:',
        default: 2
    }
];

async function run() {
    await inquirer.prompt(options).then(async (answers) => {
        let timer = Date.now();
        let context = {errors: []};

        try {
            let runner = addPreview.getTaskRunner(answers);
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
