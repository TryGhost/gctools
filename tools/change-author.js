const inquirer = require('inquirer');
const changeAuthor = require('../tasks/change-author');
const {getAPIAuthorsObj} = require('../lib/ghost-api-choices.js');
const ghostAPICreds = require('../lib/ghost-api-creds');
const ui = require('@tryghost/pretty-cli').ui;

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
        choices: function () {
            return getAPIAuthorsObj();
        }
    },
    {
        type: 'list',
        name: 'new_author',
        message: 'New Author:',
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

module.exports.choice = choice;
module.exports.doit = options;
module.exports.run = run;
