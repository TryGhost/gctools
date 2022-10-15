import inquirer from 'inquirer';
import {ui} from '@tryghost/pretty-cli';
import dedupeMembersCsv from '../tasks/dedupe-members-csv.js';

const choice = {
    name: 'Dedupe Members Csv',
    value: 'dedupeMembersCsv'
};

const options = [
    {
        type: 'input',
        name: 'existingMembers',
        message: 'The current members CSV (drag file into this window):',
        filter: function (val) {
            return val.trim();
        }
    },
    {
        type: 'input',
        name: 'newFree',
        message: 'New free members CSV (drag file into this window):',
        filter: function (val) {
            return val.trim();
        }
    },
    {
        type: 'input',
        name: 'newComp',
        message: 'New comp members CSV (drag file into this window):',
        filter: function (val) {
            return val.trim();
        }
    },
    {
        type: 'input',
        name: 'newPaid',
        message: 'New paid members CSV (drag file into this window):',
        filter: function (val) {
            return val.trim();
        }
    }
];

async function run() {
    await inquirer.prompt(options).then(async (answers) => {
        let timer = Date.now();
        let context = {errors: []};

        try {
            let runner = dedupeMembersCsv.getTaskRunner(answers);
            await runner.run(context);
            ui.log.ok(`Successfully found ${context.combinedNewMembers.length} new members in ${Date.now() - timer}ms.`);
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
