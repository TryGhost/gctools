import inquirer from 'inquirer';
import {ui} from '@tryghost/pretty-cli';
import contentStats from '../tasks/content-stats.js';
import ghostAPICreds from '../lib/ghost-api-creds.js';

const choice = {
    name: 'Content stats',
    value: 'contentStats'
};

const options = [
    ...ghostAPICreds
];

async function run() {
    await inquirer.prompt(options).then(async (answers) => {
        let timer = Date.now();
        let context = {errors: []};

        try {
            let runner = contentStats.getTaskRunner(answers);
            await runner.run(context);

            // Show the tables
            ui.log(context.tables.stats);
            ui.log(context.tables.users);

            // Report success
            ui.log.ok(`Successfully showed stats in ${Date.now() - timer}ms.`);
        } catch (error) {
            ui.log.error('There were errors', context.errors);
        }
    });
}

export default {
    choice,
    options,
    run
};
