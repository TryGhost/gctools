const inquirer = require('inquirer');
const fetchImages = require('../tasks/fetch-images');
const ui = require('@tryghost/pretty-cli').ui;

const choice = {
    name: 'Fetch images',
    value: 'fetchImages'
};

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
        message: 'Provide a URL (without trailing slash) to scrape images from:',
        filter: function (val) {
            return val.trim();
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
            let runner = fetchImages.getTaskRunner(opts);
            await runner.run(context);
            ui.log.ok(`Successfully fetched ${context.images.length} images in ${Date.now() - timer}ms.`);

            if (opts.zip) {
                ui.log.ok(`Zip file (${(context.outputFile.size / (1024 * 1024)).toFixed(2)}MB) saved at: ${context.outputFile.path}`);
            }
        } catch (error) {
            ui.log.error('Done with errors', context.errors);
        }
    });
}

module.exports.choice = choice;
module.exports.doit = options;
module.exports.run = run;
