import inquirer from 'inquirer';
import {ui} from '@tryghost/pretty-cli';
import deleteMembers from '../tasks/delete-members.js';
import ghostAPICreds from '../lib/ghost-api-creds.js';

const choice = {
    name: 'Delete Members',
    value: 'deleteMembers'
};

const options = [
    ...ghostAPICreds
];

async function run() {
    ui.log.warn('This will delete all members');

    await inquirer.prompt(options).then(async (answers) => {
        let timer = Date.now();
        let context = {errors: []};

        try {
            let runner = deleteMembers.getTaskRunner(answers);
            await runner.run(context);
            ui.log.ok(`Successfully deleted ${context.deleted.length} members in ${Date.now() - timer}ms.`);
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
