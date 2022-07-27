const inquirer = require('inquirer');
const apiImport = require('../tasks/api-import');
const ghostAPICreds = require('../lib/ghost-api-creds');
const ui = require('@tryghost/pretty-cli').ui;

const choice = {
    name: 'API Import',
    value: 'apiImport'
};

const options = [
    ...ghostAPICreds,
    {
        type: 'input',
        name: 'jsonFile',
        message: 'Path to JSON file (drag file into this window):',
        filter: function (val) {
            return val.trim();
        }
    },
    {
        type: 'confirm',
        name: 'check_duplicates',
        message: 'Check for duplicated content (by slug) before importing:',
        default: true
    },
    {
        type: 'number',
        name: 'delayBetweenCalls',
        message: 'The delay between API calls, in ms:',
        default: 100,
        filter: function (val) {
            return parseInt(val);
        }
    }
];

async function run() {
    let opts = {};

    await inquirer.prompt(options).then(async (answers) => {
        Object.assign(opts, answers);

        let timer = Date.now();
        let context = {errors: []};

        try {
            let runner = apiImport.getTaskRunner(opts);
            await runner.run(context);
            ui.log.ok(`Successfully imported in ${Date.now() - timer}ms.`);
        } catch (error) {
            ui.log.error('Done with errors', context.errors);
        }
    });
}

module.exports.choice = choice;
module.exports.doit = options;
module.exports.run = run;
