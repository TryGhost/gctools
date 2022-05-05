const inquirer = require('inquirer');
const jsonClean = require('../tasks/json-clean');
const ui = require('@tryghost/pretty-cli').ui;

const choice = {
    name: 'JSON Clean',
    value: 'jsonClean'
};

const options = [
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
    let opts = {};

    await inquirer.prompt(options).then(async (answers) => {
        Object.assign(opts, answers);

        let timer = Date.now();
        let context = {errors: []};

        try {
            let runner = jsonClean.getTaskRunner(opts);
            await runner.run(context);
            ui.log.ok(`Successfully cleaned JSON file in ${Date.now() - timer}ms.`);
        } catch (error) {
            ui.log.error('Done with errors', context.errors);
        }
    });
}

module.exports.choice = choice;
module.exports.doit = options;
module.exports.run = run;
