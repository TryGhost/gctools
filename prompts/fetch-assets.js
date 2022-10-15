import inquirer from 'inquirer';
import {ui} from '@tryghost/pretty-cli';
import fetchAssets from '../tasks/fetch-assets.js';

const choice = {
    name: 'Fetch assets',
    value: 'fetchAssets'
};

// sywac.array('-s --scrape', {
//     choices: ['all', 'img', 'web', 'media', 'files', 'none'],
//     defaultValue: 'all',
//     desc: 'Configure scraping tasks'
// });
// sywac.number('--sizeLimit', {
//     defaultValue: false,
//     desc: 'Assets larger than this size (defined in MB) will be ignored'
// });

const options = [
    {
        type: 'input',
        name: 'jsonFile',
        message: 'Path to JSON file (drag file into this window):',
        filter: function (val) {
            return val.trim();
        }
    },
    {
        type: 'input',
        name: 'url',
        message: 'Provide a URL (without trailing slash) to scrape assets from:',
        filter: function (val) {
            return val.trim();
        }
    },
    {
        type: 'checkbox',
        name: 'scrape',
        message: 'Scrape these assets:',
        choices: [
            {
                name: 'All',
                value: 'all'
            },
            {
                name: 'Images',
                value: 'img'
            },
            {
                name: 'Media',
                value: 'media'
            },
            {
                name: 'Files',
                value: 'files'
            }
        ]
    },
    {
        type: 'input',
        name: 'sizeLimit',
        message: 'Maximum asset size in MB (Larger will be ignored):',
        default: function () {
            return null;
        }
    },
    {
        type: 'confirm',
        name: 'zip',
        message: 'Create a zip file (set to false to skip)',
        default: true
    }
];

async function run() {
    let opts = {};

    await inquirer.prompt(options).then(async (answers) => {
        Object.assign(opts, answers);

        let timer = Date.now();
        let context = {errors: []};

        try {
            let runner = fetchAssets.getTaskRunner(opts);
            await runner.run(context);
            ui.log.ok(`Successfully fetched assets in ${Date.now() - timer}ms.`);

            if (opts.zip) {
                ui.log.ok(`Zip file (${(context.outputFile.size / (1024 * 1024)).toFixed(2)}MB) saved at: ${context.outputFile.path}`);
            }
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
