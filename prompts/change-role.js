import inquirer from 'inquirer';
import {ui} from '@tryghost/pretty-cli';
import changeRole from '../tasks/change-role.js';
import {getAPIRolesObj} from '../lib/ghost-api-choices.js';
import ghostAPICreds from '../lib/ghost-api-creds.js';

const choice = {
    name: 'Change user roles (requires staff token) [Ghost >= 5.2.0]',
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
        type: 'list',
        name: 'newRole',
        message: 'The new role name:',
        pageSize: 20,
        choices: () => {
            return getAPIRolesObj();
        }
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

export default {
    choice,
    options,
    run
};
