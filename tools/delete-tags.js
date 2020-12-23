const inquirer = require('inquirer');
const deleteTags = require('../tasks/delete-tags');
const batchGhostDiscover = require('../lib/batch-ghost-discover');
const ghostAPICreds = require('../lib/ghost-api-creds');
const ui = require('@tryghost/pretty-cli').ui;

const choice = {
    name: 'Delete tags',
    value: 'deleteTags'
};

async function getGhostTags() {
    const url = process.env.GC_TOOLS_apiURL;
    const key = process.env.GC_TOOLS_adminAPIKey;

    let apiTags = await batchGhostDiscover({
        type: 'tags',
        url: url,
        key: key
    });

    let tags = [];

    apiTags.forEach(function (tag){
        tags.push({
            name: `${tag.name} (${tag.count.posts} posts)`,
            value: tag.name
        });
    });

    return tags;
}

const options = [
    ...ghostAPICreds,
    {
        type: 'checkbox',
        name: 'tag',
        message: 'Filter by tag:',
        pageSize: 20,
        choices: function () {
            return getGhostTags();
        }
    }
];

async function run() {
    await inquirer.prompt(options).then(async (answers) => {
        let timer = Date.now();
        let context = {errors: []};

        try {
            let runner = deleteTags.getTaskRunner(answers);
            await runner.run(context);
            ui.log.ok(`Successfully deleted ${context.deleted.length} tags in ${Date.now() - timer}ms.`);
        } catch (error) {
            ui.log.error('Done with errors', context.errors);
        }
    });
}

module.exports.choice = choice;
module.exports.doit = options;
module.exports.run = run;
