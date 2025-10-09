import inquirer from 'inquirer';
import inquirerSearchCheckbox from 'inquirer-search-checkbox';
inquirer.registerPrompt('search-checkbox', inquirerSearchCheckbox);
import inquirerDatepickerPrompt from 'inquirer-datepicker-prompt';
inquirer.registerPrompt('datetime', inquirerDatepickerPrompt);
import chalk from 'chalk';
import {ui} from '@tryghost/pretty-cli';
import removeTags from '../tasks/remove-tags.js';
import {getAPIAuthorsObj, getAPITagsObj} from '../lib/ghost-api-choices.js';
import ghostAPICreds from '../lib/ghost-api-creds.js';

const dateToday = new Date();

const choice = {
    name: 'Remove tags from posts and pages',
    value: 'removeTags'
};

const options = [
    ...ghostAPICreds,
    {
        type: 'checkbox',
        name: 'type',
        message: 'Type of content to remove tags from:',
        choices: [
            {
                name: 'Posts',
                value: 'posts'
            },
            {
                name: 'Pages',
                value: 'pages'
            }
        ]
    },
    {
        type: 'list',
        name: 'visibility',
        message: 'Filter by visibility:',
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
        type: 'list',
        name: 'dateRange',
        message: 'Filter by date:',
        choices: [
            {
                name: 'All',
                value: 'all'
            },
            {
                name: 'Custom',
                value: 'custom'
            }
        ]
    },
    {
        type: 'datetime',
        name: 'beforeDate',
        message: 'Remove tags from content published before:',
        format: ['dd', ' ', 'mmmm', ' ', 'yyyy'],
        initial: new Date(dateToday.getFullYear() - 1, dateToday.getMonth(), dateToday.getDate()),
        when: function (answers) {
            return answers.dateRange === 'custom';
        }
    },
    {
        type: 'datetime',
        name: 'afterDate',
        message: 'Remove tags from content published after:',
        format: ['dd', ' ', 'mmmm', ' ', 'yyyy'],
        initial: new Date(dateToday.getFullYear() - 2, dateToday.getMonth(), dateToday.getDate()),
        when: function (answers) {
            return answers.dateRange === 'custom';
        }
    },
    {
        type: 'search-checkbox',
        name: 'remove_tags',
        message: `Tag(s) to be removed: (Leave blank for all) ${chalk.yellow('[Type to search]')}`,
        pageSize: 20,
        choices: function () {
            return getAPITagsObj();
        }
    }
];

async function run() {
    await inquirer.prompt(options).then(async (answers) => {
        let timer = Date.now();
        let context = {errors: []};

        // Convert date objects to ISO string format for the task
        if (answers.beforeDate) {
            answers.beforeDate = answers.beforeDate.toISOString().substring(0, 10);
        }
        if (answers.afterDate) {
            answers.afterDate = answers.afterDate.toISOString().substring(0, 10);
        }

        try {
            let runner = removeTags.getTaskRunner(answers);
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
