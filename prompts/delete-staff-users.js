import inquirer from 'inquirer';
import confirm from '@inquirer/confirm';
import chalk from 'chalk';
import { ui } from '@tryghost/pretty-cli';
import deleteStaffUsers from '../tasks/delete-staff-users.js';
import { getAPIRolesObj } from '../lib/ghost-api-choices.js';
import ghostAPICreds from '../lib/ghost-api-creds.js';

const choice = {
    name: 'Delete content-free staff users (requires staff access token)',
    value: 'deleteStaffUsers',
};

const staffAPICreds = ghostAPICreds.map((option) => {
    if (option.name === 'adminAPIKey') {
        return { ...option, message: 'Staff access token:' };
    }

    return option;
});

const taskOptions = [
    {
        type: 'checkbox',
        name: 'roles',
        message: 'Delete content-free staff users with these roles:',
        pageSize: 20,
        choices: () => getAPIRolesObj(),
        validate: (input) => {
            return input.length > 0 || 'Select at least one staff role';
        },
    },
    {
        type: 'input',
        name: 'emailDomain',
        message: 'Only delete staff with this email domain (optional):',
        default: '',
        filter: (input) => input.trim(),
        validate: (input) => {
            try {
                deleteStaffUsers.normaliseEmailDomain(input);
                return true;
            } catch (error) {
                return error.message;
            }
        },
    },
    {
        type: 'select',
        name: 'dryRun',
        message: 'What would you like to do?',
        choices: [
            {
                name: 'Preview eligible staff users',
                value: true,
            },
            {
                name: 'Permanently delete eligible staff users',
                value: false,
            },
        ],
        default: true,
    },
    {
        type: 'number',
        name: 'delayBetweenCalls',
        message: 'The delay between API calls, in ms:',
        default: 200,
    },
];

const options = [...staffAPICreds, ...taskOptions];

async function run() {
    const credentialAnswers = await inquirer.prompt(staffAPICreds);

    try {
        const api = deleteStaffUsers.createAPI(credentialAnswers);
        await deleteStaffUsers.verifyStaffAccessToken(api);
    } catch (error) {
        ui.log.error(error.message);
        return;
    }

    const taskAnswers = await inquirer.prompt(taskOptions);
    const answers = { ...credentialAnswers, ...taskAnswers };

    if (!answers.dryRun) {
        const roleNames = deleteStaffUsers.normaliseRoleNames(answers.roles).join(', ');
        const emailDomain = deleteStaffUsers.normaliseEmailDomain(answers.emailDomain);
        const domainScope = emailDomain ? ` whose email ends with @${emailDomain}` : '';
        const runTask = await confirm({
            message: chalk.red.bold(
                `This will permanently delete content-free staff users with these roles: ${roleNames}${domainScope}. Continue?`,
            ),
            default: false,
        });

        if (!runTask) {
            ui.log.info('Aborted');
            return;
        }
    }

    const timer = Date.now();
    const context = { errors: [] };
    answers.yes = !answers.dryRun;

    try {
        const runner = deleteStaffUsers.getTaskRunner(answers);
        await runner.run(context);
    } catch (error) {
        ui.log.error(error.message, context.errors);
        return;
    }

    if (answers.dryRun) {
        ui.log.ok(
            `Dry run complete: ${context.candidates.length} staff users would be deleted and ${context.skipped.length} were skipped in ${Date.now() - timer}ms.`,
        );
        return;
    }

    ui.log.ok(
        `Deleted ${context.deleted.length} of ${context.candidates.length} eligible staff users; skipped ${context.skipped.length}, failed ${context.failed.length} in ${Date.now() - timer}ms.`,
    );
}

export default { choice, options, run };
