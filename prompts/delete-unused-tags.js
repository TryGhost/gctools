import inquirer from 'inquirer';
import {ui} from '@tryghost/pretty-cli';
import deleteEmptyTags from '../tasks/delete-unused-tags.js';
import ghostAPICreds from '../lib/ghost-api-creds.js';

const choice = {
    name: 'Delete unused tags',
    value: 'deleteUnusedTags'
};

const options = [
    ...ghostAPICreds,
    {
        type: 'number',
        name: 'maxPostCount',
        message: 'Maximum number of associated posts a tag can have for it to be deleted:',
        default: 0
    }
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
