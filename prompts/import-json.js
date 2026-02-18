import inquirer from 'inquirer';
import {ui} from '@tryghost/pretty-cli';
import importJson from '../tasks/import-json.js';
import ghostAPICreds from '../lib/ghost-api-creds.js';

const choice = {
    name: 'Import posts from Ghost JSON export',
    value: 'importJson'
};

const options = [
    ...ghostAPICreds,
    {
        type: 'input',
        name: 'jsonFile',
        message: 'Path to the Ghost JSON export file:',
        validate: (val) => {
            if (!val || val.trim() === '') {
                return 'Please enter a file path';
            }
            return true;
        }
    },
    {
        type: 'list',
        name: 'contentType',
        message: 'Type of content to import:',
        choices: [
            {
                name: 'All (posts and pages)',
                value: 'all'
            },
            {
                name: 'Posts only',
                value: 'posts'
            },
            {
                name: 'Pages only',
                value: 'pages'
            }
        ]
    },
    {
        type: 'list',
        name: 'dryRun',
        message: 'Dry run mode (preview without making changes)?',
        choices: [
            {
                name: 'No - perform actual import',
                value: false
            },
            {
                name: 'Yes - preview only',
                value: true
            }
        ]
    }
];

async function run() {
    await inquirer.prompt(options).then(async (answers) => {
        let timer = Date.now();
        let context = {errors: []};

        try {
            let runner = importJson.getTaskRunner(answers);
            await runner.run(context);

            // Print any warnings about skipped posts
            importJson.printWarnings(context);

            if (answers.dryRun) {
                ui.log.info(`Dry run complete. ${context.newPosts?.length || 0} posts would be imported.`);
            } else {
                ui.log.ok(`Successfully imported ${context.imported?.length || 0} posts in ${Date.now() - timer}ms.`);
            }

            if (context.skipped?.length > 0) {
                ui.log.warn(`${context.skipped.length} posts skipped due to missing authors.`);
            }

            if (context.duplicatePosts?.length > 0) {
                ui.log.info(`${context.duplicatePosts.length} duplicate posts were skipped.`);
            }
        } catch (error) {
            ui.log.error('Done with errors', context.errors);
        } finally {
            importJson.cleanup(context);
        }
    });
}

export default {
    choice,
    options,
    run
};
