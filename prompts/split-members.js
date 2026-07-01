import inquirer from 'inquirer';
import confirm from '@inquirer/confirm';
import chalk from 'chalk';
import {ui} from '@tryghost/pretty-cli';
import splitMembers from '../tasks/split-members.js';
import ghostAPICreds from '../lib/ghost-api-creds.js';

const choice = {
    name: 'Split members into A/B groups (zipper)',
    value: 'splitMembers'
};

async function run() {
    let context = {errors: []};

    const {source} = await inquirer.prompt([
        {
            type: 'select',
            name: 'source',
            message: 'Where should the members come from?',
            choices: [
                {name: 'Fetch from Ghost (Admin API)', value: 'api'},
                {name: 'Read from a CSV file', value: 'csv'}
            ]
        }
    ]);

    let sourceAnswers;

    if (source === 'api') {
        sourceAnswers = await inquirer.prompt([
            ...ghostAPICreds,
            {
                type: 'input',
                name: 'filter',
                message: 'Filter (paste a Ghost members URL or NQL filter, blank for all members):',
                filter: val => (val && val.trim().length ? val.trim() : null)
            }
        ]);
    } else {
        sourceAnswers = await inquirer.prompt([
            {
                type: 'input',
                name: 'csvPath',
                message: 'Path to members CSV file:',
                validate: input => input.trim().length > 0 || 'Please provide a path to a CSV file'
            }
        ]);
    }

    const outputAnswers = await inquirer.prompt([
        {
            type: 'input',
            name: 'output',
            message: 'Output directory:',
            default: '.'
        },
        {
            type: 'input',
            name: 'baseName',
            message: 'Base filename prefix:',
            default: 'members'
        }
    ]);

    // Optional: bulk-label each group after splitting
    const {addLabels} = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'addLabels',
            message: 'Bulk-add a label to each group (A and B) via the Ghost API?',
            default: false
        }
    ]);

    let labelAnswers = {addLabels};

    if (addLabels) {
        // Labelling needs API credentials — collect them if we read from a CSV
        const creds = source === 'api' ? {} : await inquirer.prompt([...ghostAPICreds]);

        const labelInput = await inquirer.prompt([
            {
                type: 'input',
                name: 'labelA',
                message: 'Label for group A:',
                filter: val => val.trim(),
                validate: input => input.trim().length > 0 || 'Please provide a label for group A'
            },
            {
                type: 'input',
                name: 'labelB',
                message: 'Label for group B:',
                filter: val => val.trim(),
                validate: input => input.trim().length > 0 || 'Please provide a label for group B'
            },
            {
                type: 'number',
                name: 'chunkSize',
                message: 'Members per bulk request (chunk size):',
                default: 100
            }
        ]);

        labelAnswers = {addLabels, ...creds, ...labelInput};
    }

    const answers = {...sourceAnswers, ...outputAnswers, ...labelAnswers};

    if (source === 'api') {
        ui.log.info(`Input: ${chalk.bold.blue('Ghost Admin API')}${answers.filter ? ` (filter: ${chalk.yellow(answers.filter)})` : ''}`);
    } else {
        ui.log.info(`Input: ${chalk.bold.blue(answers.csvPath)}`);
    }
    ui.log.info(`Output: ${chalk.bold.blue(answers.output)}/${chalk.bold.yellow(answers.baseName)}-{all,a,b}.csv`);

    if (addLabels) {
        ui.log.info(`Labels: A → ${chalk.bold.yellow(answers.labelA)}, B → ${chalk.bold.yellow(answers.labelB)} (chunks of ${answers.chunkSize})`);
    }

    const runTask = await confirm({
        message: chalk.bold('Proceed?'),
        default: true
    });

    if (!runTask) {
        return false;
    }

    try {
        let runner = splitMembers.getTaskRunner(answers);
        await runner.run(context);
    } catch (error) {
        ui.log.error('Done with errors', context.errors);
    }

    const total = context.members ? context.members.length : 0;
    const aCount = context.membersA ? context.membersA.length : 0;
    const bCount = context.membersB ? context.membersB.length : 0;

    ui.log.ok(`Split ${total} members into A (${aCount}) and B (${bCount})`);

    if (addLabels && context.labelled) {
        ui.log.ok(`Labelled group A "${answers.labelA}" (${context.labelled.a}) and group B "${answers.labelB}" (${context.labelled.b}).`);
    }

    if (context.errors && context.errors.length > 0) {
        ui.log.error('Errors:', context.errors);
    }
}

export default {
    choice,
    run
};
