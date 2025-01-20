import inquirer from 'inquirer';
import inquirerSearchCheckbox from 'inquirer-search-checkbox';
inquirer.registerPrompt('search-checkbox', inquirerSearchCheckbox);
import chalk from 'chalk';
import {ui} from '@tryghost/pretty-cli';
import addAuthor from '../tasks/add-author.js';
import {getAPIAuthorsObj, getAPITagsObj} from '../lib/ghost-api-choices.js';
import ghostAPICreds from '../lib/ghost-api-creds.js';

const choice = {
    name: 'Add author',
    value: 'addAuthor'
};

const options = [
    ...ghostAPICreds,
    {
        type: 'list',
        name: 'author',
        message: 'Current Author:',
        pageSize: 20,
        choices: function () {
            return getAPIAuthorsObj();
        }
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
        type: 'list',
        name: 'new_author',
        message: 'New Author:',
        pageSize: 20,
        choices: function () {
            return getAPIAuthorsObj();
        }
    }
];

async function run() {
    await inquirer.prompt(options).then(async (answers) => {
        let timer = Date.now();
        let context = {errors: []};

        try {
            let runner = addAuthor.getTaskRunner(answers);
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
