import inquirer from 'inquirer';
import inquirerSearchCheckbox from 'inquirer-search-checkbox';
inquirer.registerPrompt('search-checkbox', inquirerSearchCheckbox);
import chalk from 'chalk';
import {ui} from '@tryghost/pretty-cli';
import changeVisibilityPosts from '../tasks/change-visibility-posts.js';
import {getAPIAuthorsObj, getAPITagsObj, getAPIVisibilityObj} from '../lib/ghost-api-choices.js';
import ghostAPICreds from '../lib/ghost-api-creds.js';

const choice = {
    name: 'Change visibility for posts',
    value: 'changeVisibilityPosts'
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
        type: 'list',
        name: 'new_visibility',
        message: 'New Visibility:',
        choices: function () {
            return getAPIVisibilityObj();
        }
    }
];

async function run() {
    await inquirer.prompt(options).then(async (answers) => {
        let timer = Date.now();
        let context = {errors: []};

        try {
            let runner = changeVisibilityPosts.getTaskRunner(answers);
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
