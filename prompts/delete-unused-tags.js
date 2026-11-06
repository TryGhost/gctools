import inquirer from 'inquirer';
import deleteEmptyTags from '../commands/delete-unused-tags.js';
import ghostAPICreds from '../lib/ghost-api-creds.js';

const choice = {
    name: 'Delete unused tags',
    value: 'deleteUnusedTags',
};

const options = [
    ...ghostAPICreds,
    {
        type: 'number',
        name: 'maxPostCount',
        message: 'Maximum number of associated posts a tag can have for it to be deleted:',
        default: 0,
    },
    {
        type: 'confirm',
        name: 'dryRun',
        message: 'Preview tags without deleting them?',
        default: false,
    },
];

async function run() {
    const answers = await inquirer.prompt(options);
    await deleteEmptyTags.run(answers);
}

export default {
    choice,
    options,
    run,
};
