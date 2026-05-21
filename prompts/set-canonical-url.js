import inquirer from 'inquirer';
import inquirerSearchCheckbox from 'inquirer-search-checkbox';
inquirer.registerPrompt('search-checkbox', inquirerSearchCheckbox);
import inquirerDatepickerPrompt from 'inquirer-datepicker-prompt';
inquirer.registerPrompt('datetime', inquirerDatepickerPrompt);
import chalk from 'chalk';
import {ui} from '@tryghost/pretty-cli';
import setCanonicalUrl from '../tasks/set-canonical-url.js';
import {getAPIAuthorsObj, getAPITagsObj} from '../lib/ghost-api-choices.js';
import ghostAPICreds from '../lib/ghost-api-creds.js';

const dateToday = new Date();

const choice = {
    name: 'Set canonical URL on posts',
    value: 'setCanonicalUrl'
};

const options = [
    ...ghostAPICreds,
    {
        type: 'select',
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
        type: 'select',
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
        type: 'select',
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
        type: 'select',
        name: 'mode',
        message: 'What should the canonical_url be set to?',
        choices: [
            {
                name: 'Clear (set canonical_url to null)',
                value: 'clear'
            },
            {
                name: 'Rebuild from a URL template',
                value: 'rebuild'
            }
        ]
    },
    {
        type: 'input',
        name: 'newCanonicalUrl',
        message: `URL template (use {slug} as a placeholder, e.g. https://example.com/topic/{slug}/):`,
        when: function (answers) {
            return answers.mode === 'rebuild';
        },
        validate: function (value) {
            if (!value || !value.trim()) {
                return 'Please provide a URL template, or go back and choose Clear instead.';
            }
            return true;
        }
    },
    {
        type: 'select',
        name: 'dryRun',
        message: 'Dry run? (preview changes without writing)',
        choices: [
            {
                name: 'No, apply changes',
                value: false
            },
            {
                name: 'Yes, dry run only',
                value: true
            }
        ]
    }
];

async function run() {
    ui.log.warn('BE CAREFUL - This will modify canonical_url on matching posts. Consider running a dry run first.');

    await inquirer.prompt(options).then(async (answers) => {
        let timer = Date.now();
        let context = {errors: []};

        // The interactive prompt collects `mode` for clarity, but the task
        // only cares about `newCanonicalUrl` (null = clear).
        if (answers.mode === 'clear') {
            answers.newCanonicalUrl = null;
        }
        delete answers.mode;

        try {
            let runner = setCanonicalUrl.getTaskRunner(answers);
            await runner.run(context);
            if (!answers.dryRun) {
                ui.log.ok(`Successfully updated canonical_url on ${context.updated.length} posts in ${Date.now() - timer}ms.`);
            }
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
