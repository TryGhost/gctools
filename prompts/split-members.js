import inquirer from 'inquirer';
import confirm from '@inquirer/confirm';
import chalk from 'chalk';
import {ui} from '@tryghost/pretty-cli';
import splitMembers from '../tasks/split-members.js';

const choice = {
    name: 'Split members CSV (zipper)',
    value: 'splitMembers'
};

async function run() {
    let context = {errors: []};

    const answers = await inquirer.prompt([
        {
            type: 'input',
            name: 'csvPath',
            message: 'Path to members CSV file:',
            validate: input => input.trim().length > 0 || 'Please provide a path to a CSV file'
        },
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

    ui.log.info(`Input: ${chalk.bold.blue(answers.csvPath)}`);
    ui.log.info(`Output: ${chalk.bold.blue(answers.output)}/${chalk.bold.yellow(answers.baseName)}-{all,a,b}.csv`);

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

    if (context.errors && context.errors.length > 0) {
        ui.log.error('Errors:', context.errors);
    }
}

export default {
    choice,
    run
};
