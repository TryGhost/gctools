import inquirer from 'inquirer';
import inquirerSearchCheckbox from 'inquirer-search-checkbox';
inquirer.registerPrompt('search-checkbox', inquirerSearchCheckbox);
import chalk from 'chalk';
import {ui} from '@tryghost/pretty-cli';
import combineTags from '../tasks/combine-tags.js';
import {getAPITagsObj} from '../lib/ghost-api-choices.js';
import ghostAPICreds from '../lib/ghost-api-creds.js';

const choice = {
    name: 'Combine tags',
    value: 'combineTags'
};

const options = [
    ...ghostAPICreds,
    {
        type: 'search-checkbox',
        name: 'tagA',
        message: `Tag to keep: ${chalk.yellow('[Type to search]')}`,
        pageSize: 20,
        choices: function () {
            return getAPITagsObj();
        }
    },
    {
        type: 'search-checkbox',
        name: 'tagB',
        message: `Tag to merge into the above and remove: ${chalk.yellow('[Type to search]')}`,
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

        // search-checkbox returns arrays, take the first selected value
        if (Array.isArray(answers.tagA)) {
            answers.tagA = answers.tagA[0];
        }
        if (Array.isArray(answers.tagB)) {
            answers.tagB = answers.tagB[0];
        }

        try {
            let runner = combineTags.getTaskRunner(answers);
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
