import path from 'node:path';
import inquirer from 'inquirer';
import confirm from '@inquirer/confirm';
import chalk from 'chalk';
import {ui} from '@tryghost/pretty-cli';
import keepTags from '../tasks/keep-tags.js';
import ghostAPICreds from '../lib/ghost-api-creds.js';

const choice = {
    name: 'Keep only the tags listed in a CSV',
    value: 'keepTags'
};

const options = [
    ...ghostAPICreds,
    {
        type: 'input',
        name: 'csvFile',
        message: 'Path to the CSV of tags to keep (drag file into this window):',
        filter: function (val) {
            // Remove backslash escapes and surrounding quotes that come from shell path escaping
            return val.trim().replace(/\\ /g, ' ').replace(/^['"]|['"]$/g, '');
        },
        validate: function (val) {
            if (val.length === 0) {
                return 'Please provide a file path';
            }
            return true;
        }
    },
    {
        type: 'select',
        name: 'matchBy',
        message: 'Match CSV values against:',
        choices: [
            {
                name: 'Tag slug',
                value: 'slug'
            },
            {
                name: 'Tag name',
                value: 'name'
            },
            {
                name: 'Either slug or name',
                value: 'either'
            }
        ],
        default: 'slug'
    },
    {
        type: 'select',
        name: 'dryRun',
        message: 'What would you like to do?',
        choices: [
            {
                name: 'Preview which tags would be deleted',
                value: true
            },
            {
                name: 'Delete every tag not listed in the CSV',
                value: false
            }
        ],
        default: true
    },
    {
        type: 'number',
        name: 'delayBetweenCalls',
        message: 'The delay between API calls, in ms:',
        default: 50
    }
];

async function run() {
    await inquirer.prompt(options).then(async (answers) => {
        if (!answers.dryRun) {
            const runTask = await confirm({
                message: chalk.red.bold('This will permanently delete every tag not listed in the CSV. Continue?'),
                default: false
            });

            if (!runTask) {
                return;
            }
        }

        let timer = Date.now();
        let context = {errors: []};

        try {
            let runner = keepTags.getTaskRunner(answers);
            await runner.run(context);
        } catch (error) {
            ui.log.error('Done with errors', context.errors);
            return;
        }

        const keptCount = context.toKeep.length + context.toKeepInternal.length;

        if (context.unmatched.length > 0) {
            ui.log.warn(`${context.unmatched.length} CSV value${context.unmatched.length === 1 ? '' : 's'} matched no Ghost tag.`);
        }

        if (answers.dryRun) {
            ui.log.ok(`Dry run: would keep ${keptCount} and delete ${context.toDelete.length} tags in ${Date.now() - timer}ms.`);
        } else {
            ui.log.ok(`Kept ${keptCount} tags and deleted ${context.deleted.length} of ${context.toDelete.length} in ${Date.now() - timer}ms.`);

            if (context.failed.length > 0) {
                ui.log.warn(`${context.failed.length} tag${context.failed.length === 1 ? '' : 's'} could not be deleted. See the report for details.`);
            }
        }

        if (context.reportPath) {
            ui.log.info(`Report written to ${path.resolve(context.reportPath)}`);
        }
    });
}

export default {
    choice,
    options,
    run
};
