import inquirer from 'inquirer';
import {ui} from '@tryghost/pretty-cli';
import zipSplit from '../tasks/zip-split.js';

const choice = {
    name: 'Zip split',
    value: 'zipSplit'
};

const options = [
    {
        type: 'input',
        name: 'zipFile',
        message: 'Path to zip file (drag file into this window):',
        filter: function (val) {
            return val.trim();
        }
    },
    {
        type: 'number',
        name: 'maxSize',
        message: 'Maximum zip size (in MB):',
        default: function () {
            return 50;
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
            let runner = zipSplit.getTaskRunner(opts);
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
