import inquirer from 'inquirer';
import confirm from '@inquirer/confirm';
import chalk from 'chalk';
import {ui} from '@tryghost/pretty-cli';
import addLabelToMembers from '../tasks/add-label-to-members.js';
import {adminClient} from '../lib/ghost-api-creds.js';

const choice = {
    name: 'Add label to members from CSV',
    value: 'addLabelToMembers'
};

async function run() {
    let context = {errors: []};

    const clientCreds = await adminClient();

    const answers = await inquirer.prompt([
        {
            type: 'input',
            name: 'csvPath',
            message: 'Path to members CSV file:',
            filter: val => val.trim(),
            validate: input => input.trim().length > 0 || 'Please provide a path to a CSV file'
        },
        {
            type: 'input',
            name: 'label',
            message: 'Label name to add:',
            filter: val => val.trim(),
            validate: input => input.trim().length > 0 || 'Please provide a label name'
        }
    ]);

    const opts = Object.assign({}, clientCreds, answers);

    ui.log.info(`CSV: ${chalk.bold.blue(opts.csvPath)}`);
    ui.log.info(`Label: ${chalk.bold.yellow(opts.label)}`);

    const runTask = await confirm({
        message: chalk.bold('Proceed?'),
        default: true
    });

    if (!runTask) {
        return false;
    }

    try {
        let runner = addLabelToMembers.getTaskRunner(opts);
        await runner.run(context);
    } catch (error) {
        ui.log.error('Done with errors', context.errors);
    }

    ui.log.ok(`Successfully labelled ${context.successful || 0} members.`);

    if (context.unsuccessful) {
        ui.log.warn(`Failed to label ${context.unsuccessful} members.`);
    }
}

export default {
    choice,
    run
};
