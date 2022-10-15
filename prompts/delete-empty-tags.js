import inquirer from 'inquirer';
import {ui} from '@tryghost/pretty-cli';
import deleteEmptyTags from '../tasks/delete-empty-tags.js';
import ghostAPICreds from '../lib/ghost-api-creds.js';

const choice = {
    name: 'Delete empty tags',
    value: 'deleteEmptyTags'
};

const options = [
    ...ghostAPICreds
];

async function run() {
    await inquirer.prompt(options).then(async (answers) => {
        let timer = Date.now();
        let context = {errors: []};

        try {
            let runner = deleteEmptyTags.getTaskRunner(answers);
            await runner.run(context);
            ui.log.ok(`Successfully deleted ${context.deleted.length} tags in ${Date.now() - timer}ms.`);
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
