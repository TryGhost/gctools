import inquirer from 'inquirer';
import {ui} from '@tryghost/pretty-cli';
import jsonClean from '../tasks/json-clean.js';

const choice = {
    name: 'JSON clean',
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

export default {
    choice,
    options,
    run
};
