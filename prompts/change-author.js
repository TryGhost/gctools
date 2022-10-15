import inquirer from 'inquirer';
import {ui} from '@tryghost/pretty-cli';
import changeAuthor from '../tasks/change-author.js';
import {getAPIAuthorsObj} from '../lib/ghost-api-choices.js';
import ghostAPICreds from '../lib/ghost-api-creds.js';

const choice = {
    name: 'Change Author',
    value: 'changeAuthor'
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
            let runner = changeAuthor.getTaskRunner(answers);
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
