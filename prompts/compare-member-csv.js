import inquirer from 'inquirer';
import {ui} from '@tryghost/pretty-cli';
import compareMemberCsv from '../tasks/compare-member-csv.js';

const choice = {
    name: 'Compare member CSV files',
    value: 'compareMemberCsv'
};

const options = [
    {
        type: 'input',
        name: 'oldFile',
        message: 'Path to the old/existing members CSV file (drag file into this window):',
        filter: function (val) {
            // Remove backslash escapes that come from shell path escaping
            // Replace "\ " with just " "
            return val.trim().replace(/\\ /g, ' ');
        },
        validate: function (val) {
            if (val.length === 0) {
                return 'Please provide a file path';
            }
            return true;
        }
    },
    {
        type: 'input',
        name: 'newFile',
        message: 'Path to the new members CSV file (drag file into this window):',
        filter: function (val) {
            // Remove backslash escapes that come from shell path escaping
            // Replace "\ " with just " "
            return val.trim().replace(/\\ /g, ' ');
        },
        validate: function (val) {
            if (val.length === 0) {
                return 'Please provide a file path';
            }
            return true;
        }
    }
];

async function run() {
    await inquirer.prompt(options).then(async (answers) => {
        let timer = Date.now();
        let context = {errors: []};

        try {
            let runner = compareMemberCsv.getTaskRunner(answers);
            await runner.run(context);

            // Display summary
            ui.log.info('Summary:');
            ui.log.info(`- New members found: ${context.newMembersList.length}`);
            ui.log.info(`- Unsubscribed members found: ${context.unsubscribedList.length}`);
            ui.log.info(`- Updated members found: ${context.updatedList ? context.updatedList.length : 0}`);

            if (context.newMembersFile) {
                ui.log.ok(`New members exported to: ${context.newMembersFile}`);
            }
            if (context.unsubscribedFile) {
                ui.log.ok(`Unsubscribed members exported to: ${context.unsubscribedFile}`);
            }
            if (context.updatedFile) {
                ui.log.ok(`Updated members exported to: ${context.updatedFile}`);
            }

            ui.log.ok(`Comparison completed in ${Date.now() - timer}ms`);
        } catch (error) {
            ui.log.error('Error comparing CSV files:', error.message);
            if (context.errors && context.errors.length > 0) {
                ui.log.error('Additional errors:', context.errors);
            }
        }
    });
}

export default {
    choice,
    options,
    run
};
