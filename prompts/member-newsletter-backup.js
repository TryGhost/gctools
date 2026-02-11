import inquirer from 'inquirer';
import confirm from '@inquirer/confirm';
import chalk from 'chalk';
import {ui} from '@tryghost/pretty-cli';
import {adminClient} from '../lib/ghost-api-creds.js';
import {getLabels} from '../questions/get-labels.js';
import memberNewsletterBackup from '../tasks/member-newsletter-backup.js';

const choice = {
    name: 'Backup/restore member newsletter preferences',
    value: 'member-newsletter-backup'
};

async function run() {
    let context = {errors: []};

    // 1. Ensure we have site creds first & create a client
    const clientCreds = await adminClient();

    // 2. Ask whether to backup or restore
    const modeAnswer = await inquirer.prompt([{
        type: 'list',
        name: 'mode',
        message: 'What would you like to do?',
        choices: [
            {name: 'Backup newsletter preferences to CSV', value: 'backup'},
            {name: 'Restore newsletter preferences from CSV', value: 'restore'}
        ]
    }]);

    let options = {
        apiURL: clientCreds.apiURL,
        adminAPIKey: clientCreds.adminAPIKey,
        verbose: false,
        delayBetweenCalls: 50
    };

    if (modeAnswer.mode === 'backup') {
        // 3a. Get backup path
        const pathAnswer = await inquirer.prompt([{
            type: 'input',
            name: 'backupPath',
            message: 'Path to save backup CSV:',
            default: './member-newsletter-backup.csv'
        }]);

        // 4a. Optionally filter by labels
        const labels = await getLabels({
            message: `Filter by labels: ${chalk.reset.grey('(Leave blank for all members)')}`
        });

        options.backupPath = pathAnswer.backupPath;
        options.label = labels && labels.length > 0 ? labels.map(l => l.slug) : null;

        ui.log.info(`Backing up newsletter preferences to ${chalk.bold.blue(pathAnswer.backupPath)}`);
        if (options.label && options.label.length > 0) {
            ui.log.info(`Filtering by labels: ${chalk.bold.yellow(options.label.join(', '))}`);
        }
    } else {
        // 3b. Get restore path
        const pathAnswer = await inquirer.prompt([{
            type: 'input',
            name: 'restorePath',
            message: 'Path to CSV file to restore from:'
        }]);

        // 4b. Ask about dry run
        const dryRun = await confirm({
            message: 'Do a dry run first? (shows changes without applying them)',
            default: true
        });

        options.restorePath = pathAnswer.restorePath;
        options.dryRun = dryRun;

        ui.log.info(`Restoring newsletter preferences from ${chalk.bold.blue(pathAnswer.restorePath)}`);
        if (dryRun) {
            ui.log.info(chalk.yellow('Dry run mode - no changes will be made'));
        }
    }

    // 5. Confirm and run
    const runTask = await confirm({
        message: chalk.bold(`Proceed?`),
        default: true
    });

    if (!runTask) {
        return false;
    }

    try {
        let runner = memberNewsletterBackup.getTaskRunner(options);
        await runner.run(context);
    } catch (error) {
        ui.log.error('Done with errors', context.errors);
    }

    // Report results
    if (context.backedUp > 0) {
        ui.log.ok(`Backed up ${context.backedUp} members`);
    }

    if (context.restored && context.restored.length > 0) {
        if (options.dryRun) {
            ui.log.ok(`Would update ${context.restored.length} members`);
        } else {
            ui.log.ok(`Restored ${context.restored.length} members`);
        }
    }

    if (context.skipped && context.skipped.length > 0) {
        ui.log.info(`Skipped ${context.skipped.length} members`);
    }

    if (context.errors && context.errors.length > 0) {
        ui.log.error('Errors:', context.errors);
    }
}

export default {
    choice,
    run
};
