import inquirer from 'inquirer';
import inquirerSearchCheckbox from 'inquirer-search-checkbox';
inquirer.registerPrompt('search-checkbox', inquirerSearchCheckbox);
import inquirerDatepickerPrompt from 'inquirer-datepicker-prompt';
inquirer.registerPrompt('datetime', inquirerDatepickerPrompt);
import chalk from 'chalk';
import {ui} from '@tryghost/pretty-cli';
import changeStatus from '../tasks/change-status.js';
import {getAPIAuthorsObj, getAPITagsObj} from '../lib/ghost-api-choices.js';
import ghostAPICreds from '../lib/ghost-api-creds.js';

const dateToday = new Date();

const choice = {
    name: 'Change Status',
    value: 'changeStatus'
};

const options = [
    ...ghostAPICreds,
    {
        type: 'list',
        name: 'status',
        message: 'Status: (Leave blank for all)',
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
        name: 'visibility',
        message: 'Visibility: (Leave blank for all)',
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
        message: 'Date Range:',
        choices: [
            {
                name: `All`,
                value: 'all'
            },
            {
                name: `Custom`,
                value: 'custom'
            }
        ]
    },
    {
        type: 'datetime',
        name: 'dateRangeStart',
        message: 'Start date:',
        format: ['dd', ' ', 'mmmm', ' ', 'yyyy'],
        initial: new Date(dateToday.getFullYear(), dateToday.getMonth() - 6, dateToday.getDate()),
        when: function (answers) {
            return answers.dateRange === 'custom';
        }
    },
    {
        type: 'datetime',
        name: 'dateRangeEnd',
        message: 'End date:',
        format: ['dd', ' ', 'mmmm', ' ', 'yyyy'],
        initial: dateToday,
        when: function (answers) {
            return answers.dateRange === 'custom';
        }
    },
    {
        type: 'list',
        name: 'new_status',
        message: 'New status:',
        choices: [
            {
                name: 'Draft',
                value: 'draft'
            },
            {
                name: 'Published',
                value: 'published'
            }
        ]
    }
];

async function run() {
    await inquirer.prompt(options).then(async (answers) => {
        let timer = Date.now();
        let context = {errors: []};

        try {
            let runner = changeStatus.getTaskRunner(answers);
            await runner.run(context);
            ui.log.ok(`Successfully changed ${context.changed.length} posts in ${Date.now() - timer}ms.`);
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
