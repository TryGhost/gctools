import inquirer from 'inquirer';
import confirm from '@inquirer/confirm';
import chalk from 'chalk';
import {ui} from '@tryghost/pretty-cli';
import {adminClient} from '../lib/ghost-api-creds.js';
import splitMembers from '../tasks/split-members.js';

const choice = {
    name: 'Split members by filter (zipper)',
    value: 'splitMembers'
};

async function run() {
    let context = {errors: []};

    const clientCreds = await adminClient();

    const answers = await inquirer.prompt([
        {
            type: 'input',
            name: 'filterURL',
            message: 'Ghost admin URL with filter (paste from browser):',
            validate: input => input.trim().length > 0 || 'Please provide a filter URL'
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

    const options = {
        apiURL: clientCreds.apiURL,
        adminAPIKey: clientCreds.adminAPIKey,
        filterURL: answers.filterURL,
        output: answers.output,
        baseName: answers.baseName,
        verbose: false
    };

    ui.log.info(`Output: ${chalk.bold.blue(answers.output)}/${chalk.bold.yellow(answers.baseName)}-{all,a,b}.csv`);

    const runTask = await confirm({
        message: chalk.bold('Proceed?'),
        default: true
    });

    if (!runTask) {
        return false;
    }

    try {
        let runner = splitMembers.getTaskRunner(options);
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
