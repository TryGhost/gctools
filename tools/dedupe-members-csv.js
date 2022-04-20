const inquirer = require('inquirer');
const dedupeMembersCsv = require('../tasks/dedupe-members-csv');
const ui = require('@tryghost/pretty-cli').ui;

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

module.exports.choice = choice;
module.exports.doit = options;
module.exports.run = run;
