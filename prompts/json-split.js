import inquirer from 'inquirer';
import {ui} from '@tryghost/pretty-cli';
import jsonSplit from '../tasks/json-split.js';

const choice = {
    name: 'JSON Split',
    value: 'jsonSplit'
};

const options = [
    {
        type: 'input',
        name: 'jsonFile',
        message: 'Path to the large JSON file:',
        filter: function (val) {
            return val.trim();
        }
    },
    {
        type: 'number',
        name: 'maxPosts',
        message: 'Maximum number of posts per file:',
        default: function () {
            return 500;
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
            let runner = jsonSplit.getTaskRunner(opts);
            await runner.run(context);
            ui.log.ok(`Successfully split zip in ${Date.now() - timer}ms.`);
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
