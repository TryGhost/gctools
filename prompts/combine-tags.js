const inquirer = require('inquirer');
const combineTags = require('../tasks/combine-tags');
const ghostAPICreds = require('../lib/ghost-api-creds');
const ui = require('@tryghost/pretty-cli').ui;

const choice = {
    name: 'Combine tags',
    value: 'combineTags'
};

const options = [
    ...ghostAPICreds,
    {
        type: 'input',
        name: 'jsonFile',
        message: 'Path to the large JSON file:',
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
            let runner = combineTags.getTaskRunner(answers);
            await runner.run(context);
            ui.log.ok(`Successfully updated ${context.updated.length} posts in ${Date.now() - timer}ms.`);
        } catch (error) {
            ui.log.error('Done with errors', context.errors);
        }
    });
}

module.exports.choice = choice;
module.exports.doit = options;
module.exports.run = run;
