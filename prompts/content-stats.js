const inquirer = require('inquirer');
const contentStats = require('../tasks/content-stats');
const ghostAPICreds = require('../lib/ghost-api-creds');
const ui = require('@tryghost/pretty-cli').ui;

const choice = {
    name: 'Content Stats',
    value: 'contentStats'
};

const options = [
    ...ghostAPICreds
];

async function run() {
    await inquirer.prompt(options).then(async (answers) => {
        let timer = Date.now();
        let context = {errors: []};

        try {
            let runner = contentStats.getTaskRunner(answers);
            await runner.run(context);

            // Show the tables
            ui.log(context.tables.stats);
            ui.log(context.tables.users);

            // Report success
            ui.log.ok(`Successfully showed stats in ${Date.now() - timer}ms.`);
        } catch (error) {
            ui.log.error('There were errors', context.errors);
        }
    });
}

module.exports.choice = choice;
module.exports.doit = options;
module.exports.run = run;
