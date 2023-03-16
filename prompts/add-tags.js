import inquirer from 'inquirer';
import inquirerSearchCheckbox from 'inquirer-search-checkbox';
inquirer.registerPrompt('search-checkbox', inquirerSearchCheckbox);
import inquirerDatepickerPrompt from 'inquirer-datepicker-prompt';
inquirer.registerPrompt('datetime', inquirerDatepickerPrompt);
import chalk from 'chalk';
import {ui} from '@tryghost/pretty-cli';
import addTags from '../tasks/add-tags.js';
import {getAPIAuthorsObj, getAPITagsObj} from '../lib/ghost-api-choices.js';
import ghostAPICreds from '../lib/ghost-api-creds.js';

const dateStartOfToday = new Date();
dateStartOfToday.setUTCHours(0);
dateStartOfToday.setUTCMinutes(0);
dateStartOfToday.setUTCSeconds(0);

const dateEndOfToday = new Date();
dateEndOfToday.setUTCHours(23);
dateEndOfToday.setUTCMinutes(59);
dateEndOfToday.setUTCSeconds(59);

const choice = {
    name: 'Add tags to posts and pages',
    value: 'addTags'
};

const options = [
    ...ghostAPICreds,
    {
        type: 'checkbox',
        name: 'type',
        message: 'Type of content to add tags to:',
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
        name: 'dateFilter',
        message: 'Filter by date:',
        choices: [
            {
                name: `No`,
                value: 'no'
            },
            {
                name: `Yes`,
                value: 'yes'
            }
        ]
    },
    {
        type: 'datetime',
        name: 'dateFilterStart',
        message: 'Start date (UTC):',
        format: ['dd', ' ', 'mmmm', ' ', 'yyyy'],
        initial: dateStartOfToday,
        when: function (answers) {
            return answers.dateFilter === 'yes';
        }
    },
    {
        type: 'datetime',
        name: 'dateFilterEnd',
        message: 'End date (UTC):',
        format: ['dd', ' ', 'mmmm', ' ', 'yyyy'],
        initial: dateEndOfToday,
        when: function (answers) {
            return answers.dateFilter === 'yes';
        }
    },
    {
        type: 'input',
        name: 'new_tags',
        message: 'Tag(s) to be added (comma separated list):',
        filter: (val) => {
            return val.split(',').map((item) => {
                return item.trim();
            });
        }
    }
];

async function run() {
    await inquirer.prompt(options).then(async (answers) => {
        let timer = Date.now();
        let context = {errors: []};

        try {
            let runner = addTags.getTaskRunner(answers);
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
