const inquirer = require('inquirer');
const changeVisibility = require('../tasks/change-visibility');
const {getAPIVisibilityObj} = require('../lib/ghost-api-choices.js');
const ghostAPICreds = require('../lib/ghost-api-creds');
const ui = require('@tryghost/pretty-cli').ui;

const choice = {
    name: 'Change Visibility',
    value: 'changeVisibility'
};

const options = [
    ...ghostAPICreds,
    {
        type: 'list',
        name: 'visibility',
        message: 'Current Visibility:',
        choices: function () {
            return getAPIVisibilityObj();
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
            let runner = changeVisibility.getTaskRunner(answers);
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
