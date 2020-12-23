const inquirer = require('inquirer');
const deletePosts = require('../tasks/delete-posts');
const ghostAPICreds = require('../lib/ghost-api-creds');
const ui = require('@tryghost/pretty-cli').ui;

const choice = {
    name: 'Delete posts',
    value: 'deletePosts'
};

const options = [
    ...ghostAPICreds,
    {
        type: 'input',
        name: 'tag',
        message: 'Filter by tag (comma separated list of tags):',
        filter: function (val) {
            return val.replace(/#/g, 'hash-');
        }
    },
    {
        type: 'input',
        name: 'author',
        message: 'Filter by author (single author slug):',
        default: function () {
            return false;
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
