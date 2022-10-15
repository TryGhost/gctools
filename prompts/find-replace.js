import inquirer from 'inquirer';
import {ui} from '@tryghost/pretty-cli';
import findReplace from '../tasks/find-replace.js';
import ghostAPICreds from '../lib/ghost-api-creds.js';

const choice = {
    name: 'Find & Replace',
    value: 'findReplace'
};

const options = [
    ...ghostAPICreds,
    {
        type: 'input',
        name: 'find',
        message: 'Find:'
    },
    {
        type: 'input',
        name: 'replace',
        message: 'Replace with:'
    },
    {
        type: 'checkbox',
        name: 'where',
        message: 'In these locations:',
        pageSize: 20,
        choices: [
            {
                name: 'Content',
                value: 'mobiledoc',
                checked: true
            },
            {
                name: 'Title',
                value: 'title'
            },
            {
                name: 'Slug',
                value: 'slug'
            },
            {
                name: 'Custom Excerpt',
                value: 'custom_excerpt'
            },
            {
                name: 'Meta Title',
                value: 'meta_title'
            },
            {
                name: 'Meta Description',
                value: 'meta_description'
            },
            {
                name: 'Twitter Title',
                value: 'twitter_title'
            },
            {
                name: 'Twitter Description',
                value: 'twitter_description'
            },
            {
                name: 'Open Graph Title',
                value: 'og_title'
            },
            {
                name: 'Open Graph Description',
                value: 'og_description'
            }
        ]
    }
];

async function run() {
    ui.log.warn('BE CAREFUL - This can be dangerous, please backup your content first.');

    await inquirer.prompt(options).then(async (answers) => {
        let timer = Date.now();
        let context = {errors: []};

        try {
            let runner = findReplace.getTaskRunner(answers);
            await runner.run(context);
            ui.log.ok(`Successfully updated ${context.updated.length} posts in ${Date.now() - timer}ms.`);
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
