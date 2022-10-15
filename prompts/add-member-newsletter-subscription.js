import inquirer from 'inquirer';
import {ui} from '@tryghost/pretty-cli';
import addMemberNewsletterSubscription from '../tasks/add-member-newsletter-subscription.js';
import {getAPINewslettersObj} from '../lib/ghost-api-choices.js';
import ghostAPICreds from '../lib/ghost-api-creds.js';

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

export default {
    choice,
    options,
    run
};
