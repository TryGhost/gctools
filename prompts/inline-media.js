import inquirer from 'inquirer';
import inquirerSearchCheckbox from 'inquirer-search-checkbox';
inquirer.registerPrompt('search-checkbox', inquirerSearchCheckbox);
import inquirerDatepickerPrompt from 'inquirer-datepicker-prompt';
inquirer.registerPrompt('datetime', inquirerDatepickerPrompt);
import chalk from 'chalk';
import { ui } from '@tryghost/pretty-cli';
import inlineMedia from '../tasks/inline-media.js';
import { getAPIAuthorsObj, getAPITagsObj } from '../lib/ghost-api-choices.js';
import ghostAPICreds from '../lib/ghost-api-creds.js';

const dateStartOfToday = new Date();
dateStartOfToday.setUTCHours(0, 0, 0, 0);

const dateEndOfToday = new Date();
dateEndOfToday.setUTCHours(23, 59, 59, 999);

const choice = {
    name: 'Inline media',
    value: 'inlineMedia',
};

const options = [
    ...ghostAPICreds,
    {
        type: 'input',
        name: 'slug',
        message: 'Filter by slug (leave blank for all):',
        filter: function (val) {
            return val.trim() || null;
        },
    },
    {
        type: 'input',
        name: 'id',
        message: 'Filter by post ID (leave blank for all):',
        filter: function (val) {
            return val.trim() || null;
        },
    },
    {
        type: 'checkbox',
        name: 'type',
        message: 'Content type:',
        choices: [
            {
                name: 'Posts',
                value: 'posts',
            },
            {
                name: 'Pages',
                value: 'pages',
            },
        ],
    },
    {
        type: 'select',
        name: 'status',
        message: 'Status: (Leave blank for all)',
        choices: [
            {
                name: 'All',
                value: 'all',
            },
            {
                name: 'Draft',
                value: 'draft',
            },
            {
                name: 'Published',
                value: 'published',
            },
        ],
    },
    {
        type: 'select',
        name: 'visibility',
        message: 'Filter by visibility:',
        choices: [
            {
                name: 'All',
                value: 'all',
            },
            {
                name: 'Public',
                value: 'public',
            },
            {
                name: 'Members',
                value: 'members',
            },
            {
                name: 'Paid',
                value: 'paid',
            },
        ],
    },
    {
        type: 'select',
        name: 'filterByTag',
        message: 'Filter by tag?',
        choices: [
            {
                name: 'No',
                value: 'no',
            },
            {
                name: 'Yes',
                value: 'yes',
            },
        ],
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
            return answers.filterByTag === 'yes';
        },
    },
    {
        type: 'select',
        name: 'filterByAuthor',
        message: 'Filter by author?',
        choices: [
            {
                name: 'No',
                value: 'no',
            },
            {
                name: 'Yes',
                value: 'yes',
            },
        ],
    },
    {
        type: 'search-checkbox',
        name: 'author',
        message: `Filter by author: ${chalk.yellow('[Type to search]')}`,
        choices: function () {
            return getAPIAuthorsObj();
        },
        when: function (answers) {
            return answers.filterByAuthor === 'yes';
        },
    },
    {
        type: 'select',
        name: 'filterByAfterDate',
        message: 'Only include posts published on or after a specific date?',
        choices: [
            {
                name: 'No',
                value: 'no',
            },
            {
                name: 'Yes',
                value: 'yes',
            },
        ],
    },
    {
        type: 'datetime',
        name: 'afterAndOnDate',
        message: 'Include posts published on and after (UTC):',
        format: ['dd', ' ', 'mmmm', ' ', 'yyyy'],
        initial: dateStartOfToday,
        when: function (answers) {
            return answers.filterByAfterDate === 'yes';
        },
    },
    {
        type: 'select',
        name: 'filterByBeforeDate',
        message: 'Only include posts published on or before a specific date?',
        choices: [
            {
                name: 'No',
                value: 'no',
            },
            {
                name: 'Yes',
                value: 'yes',
            },
        ],
    },
    {
        type: 'datetime',
        name: 'beforeAndOnDate',
        message: 'Include posts published on and before (UTC):',
        format: ['dd', ' ', 'mmmm', ' ', 'yyyy'],
        initial: dateEndOfToday,
        when: function (answers) {
            return answers.filterByBeforeDate === 'yes';
        },
    },
    {
        type: 'input',
        name: 'assetDomains',
        message: 'Asset domain(s) to process (comma separated, leave blank for all):',
        filter: function (val) {
            const trimmed = val.trim();
            if (!trimmed) {
                return null;
            }
            return trimmed.split(',').map((item) => {
                return item.trim();
            });
        },
    },
    {
        type: 'select',
        name: 'dryRun',
        message: 'Dry run? (show what would be processed without downloading or uploading)',
        choices: [
            {
                name: 'No',
                value: false,
            },
            {
                name: 'Yes',
                value: true,
            },
        ],
    },
];

async function run() {
    await inquirer.prompt(options).then(async (answers) => {
        let timer = Date.now();
        let context = { errors: [] };

        try {
            let runner = inlineMedia.getTaskRunner(answers);
            await runner.run(context);
        } catch (error) {
            ui.log.error('Done with errors');
        }

        if (context.errors.length > 0) {
            ui.log.warn(`\n${context.errors.length} errors encountered:`);
            context.errors.forEach((err) => {
                const message =
                    typeof err === 'string' ? err : err.message || err.context || String(err);
                ui.log.warn(`  - ${message}`);
            });
            ui.log.info('');
        }

        ui.log.ok(
            `Successfully updated ${context.updated.length} posts in ${Date.now() - timer}ms.`,
        );
    });
}

export default {
    choice,
    options,
    run,
};
