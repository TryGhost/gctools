import inquirer from 'inquirer';
import inquirerSearchCheckbox from 'inquirer-search-checkbox';
inquirer.registerPrompt('search-checkbox', inquirerSearchCheckbox);
import chalk from 'chalk';
import deleteLabels from '../commands/delete-labels.js';
import { getAPIMemberLabels } from '../lib/ghost-api-choices.js';
import ghostAPICreds from '../lib/ghost-api-creds.js';
import { maybeStringToArray } from '../lib/utils.js';

const choice = {
    name: 'Delete labels',
    value: 'deleteLabels',
};

const options = [
    ...ghostAPICreds,
    {
        type: 'select',
        name: 'mode',
        message: 'Which labels would you like to delete?',
        choices: [
            { name: 'Labels I pick from a list', value: 'named' },
            { name: 'Labels no member has', value: 'unused' },
            { name: 'Every label, except the ones I list', value: 'allExcept' },
            { name: 'Every label', value: 'all' },
        ],
        default: 'unused',
    },
    {
        type: 'search-checkbox',
        name: 'labels',
        message: `Select labels: ${chalk.yellow('[Type to search]')}`,
        pageSize: 20,
        when: (answers) => answers.mode === 'named',
        choices: function () {
            // Loads every label, so this list is slow on sites with many thousands of them
            return getAPIMemberLabels({ returnKey: 'name' });
        },
    },
    {
        type: 'input',
        name: 'keep',
        message: 'Names or slugs of labels to keep, separated by commas (leave empty for none):',
        when: (answers) => answers.mode === 'unused' || answers.mode === 'allExcept',
        validate: (val, answers) => {
            if (answers.mode === 'allExcept' && val.trim().length === 0) {
                return 'List at least one label to keep';
            }
            return true;
        },
        filter: (val) => (val.trim() ? maybeStringToArray(val) : null),
    },
    {
        type: 'select',
        name: 'dryRun',
        message: 'What would you like to do?',
        choices: [
            { name: 'Preview which labels would be deleted', value: true },
            { name: 'Delete the labels (you will be asked to confirm)', value: false },
        ],
        default: true,
    },
    {
        type: 'number',
        name: 'delayBetweenCalls',
        message: 'The delay between API calls, in ms:',
        default: 50,
    },
];

// Turns the chosen mode into the same flags the CLI command takes
const toCommandOptions = ({ mode, ...answers }) => ({
    ...answers,
    labels: mode === 'named' ? answers.labels : null,
    unused: mode === 'unused',
    all: mode === 'all' || mode === 'allExcept',
    // Choosing "Every label" is the explicit opt-in that --force is on the CLI
    force: mode === 'all',
});

async function run() {
    const answers = await inquirer.prompt(options);
    await deleteLabels.run(toCommandOptions(answers));
}

export { toCommandOptions };

export default {
    choice,
    options,
    run,
};
