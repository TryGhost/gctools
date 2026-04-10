import inquirer from 'inquirer';
import {ui} from '@tryghost/pretty-cli';
import getPosts from '../tasks/get-posts.js';
import ghostAPICreds from '../lib/ghost-api-creds.js';

const choice = {
    name: 'Get all posts',
    value: 'getPosts'
};

const options = [
    ...ghostAPICreds
];

async function run() {
    await inquirer.prompt(options).then(async (answers) => {
        let timer = Date.now();
        let context = {errors: []};

        try {
            let runner = getPosts.getTaskRunner(answers);
            await runner.run(context);
            ui.log.ok(`Successfully got ${context.found.length} posts in ${Date.now() - timer}ms.`);
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
