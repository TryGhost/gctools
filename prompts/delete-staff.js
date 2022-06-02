const inquirer = require('inquirer');
const deleteStaff = require('../tasks/delete-staff');
const {getAPIRolesObj} = require('../lib/ghost-api-choices.js');
const ghostAPICreds = require('../lib/ghost-api-creds');
const ui = require('@tryghost/pretty-cli').ui;

const choice = {
    name: 'Delete Staff (requires staff token)',
    value: 'deleteStaff'
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
        type: 'confirm',
        name: 'filterNoPosts',
        message: 'Only delete staff with zero posts:',
        default: true
    },
    {
        type: 'number',
        name: 'maxStaff',
        message: 'The max number if staff to delete:',
        default: 100
    },
    {
        type: 'number',
        name: 'delayBetweenCalls',
        message: 'The delay between API calls, in ms:',
        default: 1000
    }
];

async function run() {
    await inquirer.prompt(options).then(async (answers) => {
        let timer = Date.now();
        let context = {errors: []};

        try {
            let runner = deleteStaff.getTaskRunner(answers);
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
