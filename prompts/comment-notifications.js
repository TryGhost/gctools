import inquirer from 'inquirer';
import {ui} from '@tryghost/pretty-cli';
import commentNotifications from '../tasks/comment-notifications.js';
import ghostAPICreds from '../lib/ghost-api-creds.js';

export const choice = {
    name: 'Set comment notifications for all staff users',
    value: 'commentNotifications'
};

const modeOptions = [
    ...ghostAPICreds,
    {
        type: 'list',
        name: 'mode',
        message: 'What would you like to do?',
        choices: [
            {
                name: 'Set notifications (enable/disable for all staff)',
                value: 'set'
            },
            {
                name: 'Backup current settings to CSV',
                value: 'backup'
            },
            {
                name: 'Backup settings, then disable notifications',
                value: 'backupAndDisable'
            },
            {
                name: 'Restore settings from CSV backup',
                value: 'restore'
            }
        ],
        default: 'set'
    }
];

const setOptions = [
    {
        type: 'list',
        name: 'value',
        message: 'Enable or disable comment notifications:',
        choices: [
            {
                name: 'Disable (false)',
                value: false
            },
            {
                name: 'Enable (true)',
                value: true
            }
        ],
        default: false,
        when: answers => answers.mode === 'set'
    }
];

const backupOptions = [
    {
        type: 'input',
        name: 'backupPath',
        message: 'Path to save backup CSV:',
        default: './comment-notifications-backup.csv',
        when: answers => answers.mode === 'backup' || answers.mode === 'backupAndDisable'
    }
];

const restoreOptions = [
    {
        type: 'input',
        name: 'restorePath',
        message: 'Path to CSV file to restore from:',
        default: './comment-notifications-backup.csv',
        when: answers => answers.mode === 'restore'
    }
];

const delayOptions = [
    {
        type: 'number',
        name: 'delayBetweenCalls',
        message: 'The delay between API calls, in ms:',
        default: 200
    }
];

export const options = [
    ...modeOptions,
    ...setOptions,
    ...backupOptions,
    ...restoreOptions,
    ...delayOptions
];

export async function run() {
    await inquirer.prompt(options).then(async (answers) => {
        let timer = Date.now();
        let context = {errors: []};

        // Map mode to task options
        const taskOptions = {
            ...answers,
            backupPath: null,
            restorePath: null,
            value: null
        };

        if (answers.mode === 'set') {
            taskOptions.value = answers.value;
        } else if (answers.mode === 'backup') {
            taskOptions.backupPath = answers.backupPath;
            // value stays null for backup-only mode
        } else if (answers.mode === 'backupAndDisable') {
            taskOptions.backupPath = answers.backupPath;
            taskOptions.value = false;
        } else if (answers.mode === 'restore') {
            taskOptions.restorePath = answers.restorePath;
            // value stays null for restore mode
        }

        try {
            let runner = commentNotifications.getTaskRunner(taskOptions);
            await runner.run(context);

            // Report results
            let messages = [];

            if (context.backedUp > 0) {
                messages.push(`backed up ${context.backedUp} users`);
            }

            if (context.restored && context.restored.length > 0) {
                messages.push(`restored ${context.restored.length} users`);
            }

            if (context.updated && context.updated.length > 0) {
                messages.push(`updated ${context.updated.length} users`);
            }

            if (context.skipped && context.skipped.length > 0) {
                messages.push(`skipped ${context.skipped.length} users`);
            }

            if (messages.length > 0) {
                ui.log.ok(`Successfully ${messages.join(', ')} in ${Date.now() - timer}ms.`);
            } else {
                ui.log.ok(`No changes made in ${Date.now() - timer}ms.`);
            }
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
