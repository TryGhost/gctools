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
    },
    {
        type: 'confirm',
        name: 'useGhostApi',
        message: 'Auto-update users from a Ghost site?',
        default: false
    },
    {
        type: 'input',
        name: 'ghostApiUrl',
        message: 'Ghost site URL (e.g. https://example.ghost.io):',
        when: answers => answers.useGhostApi,
        filter: val => val.trim()
    },
    {
        type: 'input',
        name: 'ghostAdminKey',
        message: 'Ghost Admin API key (id:secret):',
        when: answers => answers.useGhostApi,
        filter: val => val.trim()
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
