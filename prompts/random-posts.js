import inquirer from 'inquirer';
import inquirerSearchCheckbox from 'inquirer-search-checkbox';
inquirer.registerPrompt('search-checkbox', inquirerSearchCheckbox);
import inquirerDatepickerPrompt from 'inquirer-datepicker-prompt';
inquirer.registerPrompt('datetime', inquirerDatepickerPrompt);
import chalk from 'chalk';
import randomPosts from '../tasks/random-posts.js';
import {getAPIAuthorsObj, getAPITagsObj} from '../lib/ghost-api-choices.js';
import ghostAPICreds from '../lib/ghost-api-creds.js';
import {ui} from '@tryghost/pretty-cli';

const dateToday = new Date();

const choice = {
    name: 'Add random posts',
    value: 'randomPosts'
};

const options = [
    ...ghostAPICreds,
    {
        type: 'input',
        name: 'count',
        message: 'Number of posts to create:',
        default: function () {
            return 10;
        }
    },
    {
        type: 'rawlist',
        name: 'status',
        message: 'Status:',
        choices: [
            {
                name: 'Published',
                value: 'published'
            },
            {
                name: 'Draft',
                value: 'draft'
            }
        ]
    },
    {
        type: 'rawlist',
        name: 'visibility',
        message: 'Visibility:',
        choices: [
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
        message: `Tags (comma separated list): ${chalk.yellow('[Type to search]')}`,
        choices: function () {
            return getAPITagsObj({
                name: 'Custom tag',
                value: 'gctools_new_tag'
            });
        }
    },
    {
        type: 'input',
        name: 'new_tag',
        message: 'Custom tag (comma separated list):',
        when: function (answers) {
            return answers.tag.includes('gctools_new_tag');
        }
    },
    {
        type: 'search-checkbox',
        name: 'author',
        message: `Author: ${chalk.yellow('[Type to search]')}`,
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
                name: `Past year`,
                value: {
                    start: new Date(dateToday.getFullYear() - 1, dateToday.getMonth(), dateToday.getDate()),
                    end: dateToday
                }
            },
            {
                name: `Past month`,
                value: {
                    start: new Date(dateToday.getFullYear(), dateToday.getMonth() - 1, dateToday.getDate()),
                    end: dateToday
                }
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
    }
];

async function run() {
    await inquirer.prompt(options).then(async (answers) => {
        // Handle the case where a new tag is wanted
        if (answers.new_tag) {
            let newTagsArray = answers.new_tag.split(',').map(function (item) {
                return {name: item.trim()};
            });
            answers.tag.pop();
            answers.tag.push(...newTagsArray);
        }

        // If we have a custom date, push those values to `dateRange`
        if (answers.dateRange === 'custom' && answers.dateRangeStart && answers.dateRangeEnd) {
            answers.dateRange = {
                start: answers.dateRangeStart,
                end: answers.dateRangeEnd
            };

            // We don't need these anymore
            delete answers.dateRangeStart;
            delete answers.dateRangeEnd;
        }

        let timer = Date.now();
        let context = {errors: []};

        try {
            let runner = randomPosts.getTaskRunner(answers);
            await runner.run(context);
            ui.log.ok(`Successfully added ${context.inserted.length} posts in ${Date.now() - timer}ms.`);
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
