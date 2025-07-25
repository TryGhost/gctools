import inquirer from 'inquirer';
import inquirerSearchCheckbox from 'inquirer-search-checkbox';
inquirer.registerPrompt('search-checkbox', inquirerSearchCheckbox);
import chalk from 'chalk';
import {ui} from '@tryghost/pretty-cli';
import deletePages from '../tasks/delete-pages.js';
import {getAPIAuthorsObj, getAPITagsObj} from '../lib/ghost-api-choices.js';
import ghostAPICreds from '../lib/ghost-api-creds.js';

const choice = {
    name: 'Delete pages',
    value: 'deletePages'
};

const options = [
    ...ghostAPICreds,
    {
        type: 'list',
        name: 'status',
        message: 'Status:',
        choices: [
            {
                name: 'All',
                value: 'all'
            },
            {
                name: 'Draft',
                value: 'draft'
            },
            {
                name: 'Published',
                value: 'published'
            }
        ]
    },
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
        type: 'search-checkbox',
        name: 'tag',
        message: `Filter by tag: ${chalk.yellow('[Type to search]')}`,
        pageSize: 20,
        choices: function () {
            return getAPITagsObj();
        },
        when: function (answers) {
            return answers.delete_by === 'delete_by_tag';
        },
        validate: function (input) {
            if (input.length === 0) {
                return 'Select at least 1 tag (Press up/down to navigate)';
            }

            return true;
        }
    },
    {
        type: 'search-checkbox',
        name: 'author',
        message: `Filter by author: ${chalk.yellow('[Type to search]')}`,
        choices: function () {
            return getAPIAuthorsObj();
        },
        when: function (answers) {
            return answers.delete_by === 'delete_by_author';
        },
        validate: function (input) {
            if (input.length === 0) {
                return 'Select at least 1 author (Press up/down to navigate)';
            }

            return true;
        }
    }
];

async function run() {
    await inquirer.prompt(options).then(async (answers) => {
        let timer = Date.now();
        let context = {errors: []};

        try {
            let runner = deletePages.getTaskRunner(answers);
            await runner.run(context);
            ui.log.ok(`Successfully deleted ${context.deleted.length} pages in ${Date.now() - timer}ms.`);
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
