const inquirer = require('inquirer');
const deletePosts = require('../tools/delete-posts');
const ui = require('@tryghost/pretty-cli').ui;

const choice = {
    name: 'Delete posts',
    value: 'deletePosts'
};

const options = [
    {
        type: 'input',
        name: 'apiURL',
        message: 'Enter the URL to your Ghost API',
        filter: function (val) {
            return val.trim();
        }
    },
    {
        type: 'input',
        name: 'adminAPIKey',
        message: 'Enter the Admin API key',
        filter: function (val) {
            return val.trim();
        }
    },
    {
        type: 'input',
        name: 'tag',
        message: 'Delete content with this tag slug? (leave blank to skip)',
        default: function () {
            return false;
        },
        filter: function (val) {
            return val.replace(/#/g, 'hash-');
        }
    },
    {
        type: 'input',
        name: 'author',
        message: 'Delete content with this author slug? (leave blank to skip)',
        default: function () {
            return false;
        }
    }
];

function run() {
    let opts = {};

    inquirer.prompt(options).then(async (answers) => {
        Object.assign(opts, answers);

        let timer = Date.now();
        let context = {errors: []};

        try {
            let runner = deletePosts.getTaskRunner(opts);
            await runner.run(context);
            ui.log.ok(`Successfully deleted ${context.deleted.length} posts in ${Date.now() - timer}ms.`);
        } catch (error) {
            ui.log.error('Done with errors', context.errors);
        }
    });
}

module.exports.choice = choice;
module.exports.doit = options;
module.exports.run = run;
