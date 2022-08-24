const inquirer = require('inquirer');
inquirer.registerPrompt('search-checkbox', require('inquirer-search-checkbox'));
const chalk = require('chalk');
const deleteTags = require('../tasks/delete-tags');
const {getAPITagsObj} = require('../lib/ghost-api-choices.js');
const ghostAPICreds = require('../lib/ghost-api-creds');
const ui = require('@tryghost/pretty-cli').ui;

const choice = {
    name: 'Delete tags',
    value: 'deleteTags'
};

const options = [
    ...ghostAPICreds,
    {
        type: 'search-checkbox',
        name: 'tags',
        message: `Select tags: ${chalk.yellow('[Type to search]')}`,
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

        try {
            let runner = deleteTags.getTaskRunner(answers);
            await runner.run(context);
            ui.log.ok(`Successfully deleted ${context.deleted.length} tags in ${Date.now() - timer}ms.`);
        } catch (error) {
            ui.log.error('Done with errors', context.errors);
        }
    });
}

module.exports.choice = choice;
module.exports.doit = options;
module.exports.run = run;
