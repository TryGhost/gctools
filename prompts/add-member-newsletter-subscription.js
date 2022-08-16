const inquirer = require('inquirer');
const addMemberNewsletterSubscription = require('../tasks/add-member-newsletter-subscription');
const {getAPINewslettersObj} = require('../lib/ghost-api-choices.js');
const ghostAPICreds = require('../lib/ghost-api-creds');
const ui = require('@tryghost/pretty-cli').ui;

const choice = {
    name: 'Add member newsletter subscription',
    value: 'addMemberNewsletterSubscription'
};

const options = [
    ...ghostAPICreds,
    {
        type: 'list',
        name: 'newsletterID',
        message: 'Newsletter to be subscribed from:',
        choices: () => {
            return getAPINewslettersObj();
        }
    },
    {
        type: 'input',
        name: 'onlyForLabelSlug',
        message: 'Only add subscriptions from members with this label slug:',
        filter: function (val) {
            return val.trim();
        }
    },
    {
        type: 'number',
        name: 'delayBetweenCalls',
        message: 'The delay between API calls, in ms:',
        default: 100
    }
];

async function run() {
    await inquirer.prompt(options).then(async (answers) => {
        let timer = Date.now();
        let context = {errors: []};

        try {
            let runner = addMemberNewsletterSubscription.getTaskRunner(answers);
            await runner.run(context);
            ui.log.ok(`Successfully added ${context.deleted.length} subscriptions in ${Date.now() - timer}ms.`);
        } catch (error) {
            ui.log.error('Done with errors', context.errors);
        }
    });
}

module.exports.choice = choice;
module.exports.doit = options;
module.exports.run = run;
