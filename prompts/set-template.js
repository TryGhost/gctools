import inquirer from 'inquirer';
import inquirerSearchCheckbox from 'inquirer-search-checkbox';
inquirer.registerPrompt('search-checkbox', inquirerSearchCheckbox);
import {ui} from '@tryghost/pretty-cli';
import chalk from 'chalk';
import setTemplate from '../tasks/set-template.js';
import ghostAPICreds from '../lib/ghost-api-creds.js';
import {getAPIAuthorsObj, getAPITagsObj} from '../lib/ghost-api-choices.js';

const choice = {
    name: 'Set posts template',
    value: 'setTemplate'
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
        name: 'filter_by',
        message: 'Filter content by:',
        choices: [
            {
                name: 'No filtering',
                value: false
            },
            {
                name: 'Filter by author',
                value: 'filter_by_author'
            },
            {
                name: 'Filter by tag',
                value: 'filter_by_tag'
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
            return answers.filter_by === 'filter_by_tag';
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
            return answers.filter_by === 'filter_by_author';
        }
    },
    {
        type: 'input',
        name: 'templateSlug',
        message: 'File name of the template, without extension:',
        filter: (val) => {
            return val.trim();
        },
        validate: function (input) {
            if (!input.length) {
                return 'Enter a template name';
            }

            if (input === 'default' || input === 'null' || input === null) {
                return true;
            }

            if (!input.includes('custom-')) {
                return 'Template must start with `custom-`';
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
            let runner = setTemplate.getTaskRunner(answers);
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
