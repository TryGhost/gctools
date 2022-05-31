const inquirer = require('inquirer');
const changeRole = require('../tasks/change-role');
const {getAPIRolesObj} = require('../lib/ghost-api-choices.js');
const ghostAPICreds = require('../lib/ghost-api-creds');
const ui = require('@tryghost/pretty-cli').ui;

const choice = {
    name: 'Change user roles (requires staff token)',
    value: 'changeRole'
};

const options = [
    ...ghostAPICreds,
    {
        type: 'checkbox',
        name: 'filterRole',
        message: 'Filter by role:',
        pageSize: 20,
        choices: () => {
            return getAPIRolesObj();
        }
    },
    {
        type: 'input',
        name: 'newRoleID',
        message: 'The new role ID:',
        filter: (val) => {
            return val.trim();
        },
        validate: val => (val.length === 24) || 'Please supply a role ID'
    },
    {
        type: 'number',
        name: 'delayBetweenCalls',
        message: 'The delay between API calls, in ms:',
        default: 200
    }
];

async function run() {
    await inquirer.prompt(options).then(async (answers) => {
        let timer = Date.now();
        let context = {errors: []};

        try {
            let runner = changeRole.getTaskRunner(answers);
            await runner.run(context);
            ui.log.ok(`Successfully deleted ${context.deleted.length} staff in ${Date.now() - timer}ms.`);
        } catch (error) {
            ui.log.error('Done with errors', context.errors);
        }
    });
}

module.exports.choice = choice;
module.exports.doit = options;
module.exports.run = run;
