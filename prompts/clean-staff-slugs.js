import inquirer from 'inquirer';
import {ui} from '@tryghost/pretty-cli';
import cleanStaffSlugs from '../tasks/clean-staff-slugs.js';
import ghostAPICreds from '../lib/ghost-api-creds.js';

const choice = {
    name: 'Clean staff user slugs with Ghost ID suffixes',
    value: 'cleanStaffSlugs'
};

const options = [
    ...ghostAPICreds,
    {
        type: 'select',
        name: 'dryRun',
        message: 'What would you like to do?',
        choices: [
            {
                name: 'Preview changes only',
                value: true
            },
            {
                name: 'Update safe staff slugs',
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
        let timer = Date.now();
        let context = {errors: []};

        try {
            let runner = cleanStaffSlugs.getTaskRunner(answers);
            await runner.run(context);

            const candidateCount = context.usersWithIdSuffix ? context.usersWithIdSuffix.length : 0;
            const updateableCount = context.usersToUpdate ? context.usersToUpdate.length : 0;
            const updatedCount = context.updated ? context.updated.length : 0;
            const skippedCount = context.skipped ? context.skipped.length : 0;
            const skippedText = skippedCount > 0 ? `, skipped ${skippedCount}` : '';

            if (answers.dryRun) {
                ui.log.ok(`Dry run complete: ${updateableCount} of ${candidateCount} candidate staff slugs would be updated${skippedText} in ${Date.now() - timer}ms.`);
            } else if (updatedCount > 0) {
                ui.log.ok(`Successfully updated ${updatedCount} staff slug${updatedCount === 1 ? '' : 's'}${skippedText} in ${Date.now() - timer}ms.`);
            } else if (candidateCount > 0) {
                ui.log.ok(`No staff slugs were updated; ${skippedCount} candidate${skippedCount === 1 ? '' : 's'} would not be unique in ${Date.now() - timer}ms.`);
            } else {
                ui.log.ok(`No staff slugs needed cleaning in ${Date.now() - timer}ms.`);
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
