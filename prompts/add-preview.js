import inquirer from 'inquirer';
import inquirerCearchCheckbox from 'inquirer-search-checkbox';
inquirer.registerPrompt('search-checkbox', inquirerCearchCheckbox);
import chalk from 'chalk';
import addPreview from '../tasks/add-preview.js';
import {getAPIAuthorsObj, getAPITagsObj} from '../lib/ghost-api-choices.js';
import ghostAPICreds from '../lib/ghost-api-creds.js';
import {ui} from '@tryghost/pretty-cli';

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
        type: 'search-checkbox',
        name: 'tag',
        message: `Filter by tag: (Leave blank for all) ${chalk.yellow('[Type to search]')}`,
        pageSize: 20,
        choices: function () {
            return getAPITagsObj();
        }
    },
    {
        type: 'search-checkbox',
        name: 'author',
        message: `Filter by author: (Leave blank for all) ${chalk.yellow('[Type to search]')}`,
        choices: function () {
            return getAPIAuthorsObj();
        }
    },
    {
        type: 'string',
        name: 'previewPosition',
        message: 'The card position index the public preview should be inserted after (or percentage, written as "20%"):',
        default: '2'
    },
    {
        type: 'confirm',
        name: 'overwrite',
        message: 'Overwrite the preview position if one already exists?',
        default: false
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

export default {
    choice,
    options,
    run
};
