import inquirer from 'inquirer';
import {ui} from '@tryghost/pretty-cli';
import zipCreate from '../tasks/zip-create.js';

const choice = {
    name: 'Zip Create',
    value: 'zipCreate'
};

const options = [
    {
        type: 'input',
        name: 'dirPath',
        message: 'Path to the large directory (drag into this window):',
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
            let runner = zipCreate.getTaskRunner(opts);
            await runner.run(context);
            ui.log.ok(`Successfully split directory in ${Date.now() - timer}ms.`);
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
