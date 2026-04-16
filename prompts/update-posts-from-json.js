import inquirer from 'inquirer';
import {ui} from '@tryghost/pretty-cli';
import updatePostsFromJson from '../tasks/update-posts-from-json.js';
import ghostAPICreds from '../lib/ghost-api-creds.js';

const {UPDATABLE_FIELDS} = updatePostsFromJson;

const choice = {
    name: 'Update posts from JSON file',
    value: 'updatePostsFromJson'
};

const options = [
    ...ghostAPICreds,
    {
        type: 'input',
        name: 'jsonFile',
        message: 'Path to Ghost export JSON file:',
        validate: (input) => {
            return input.trim().length > 0 ? true : 'Please provide a file path';
        }
    },
    {
        type: 'checkbox',
        name: 'fields',
        message: 'Select fields to update:',
        pageSize: 20,
        choices: UPDATABLE_FIELDS.map(f => ({
            name: f.name,
            value: f.value,
            checked: false
        })),
        validate: (input) => {
            return input.length > 0 ? true : 'Please select at least one field';
        }
    },
    {
        type: 'confirm',
        name: 'dryRun',
        message: 'Dry run? (preview changes without updating)',
        default: false
    }
];

async function run() {
    await inquirer.prompt(options).then(async (answers) => {
        let timer = Date.now();
        let context = {errors: []};

        try {
            let runner = updatePostsFromJson.getTaskRunner(answers);
            await runner.run(context);
        } catch (error) {
            ui.log.error('Done with errors', context.errors);
        }

        if (context.skipped && context.skipped.length > 0) {
            ui.log.warn(`Skipped ${context.skipped.length} posts with no changes.`);
        }

        ui.log.ok(`Successfully updated ${context.updated.length} posts in ${Date.now() - timer}ms.`);
    });
}

export default {
    choice,
    options,
    run
};
