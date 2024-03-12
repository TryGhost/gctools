import inquirer from 'inquirer';
import chalk from 'chalk';
import removeMemberComp from '../tasks/remove-member-comp-subscription.js';
import {getAPITiers, getAPIMemberLabels} from '../lib/ghost-api-choices.js';
import ghostAPICreds from '../lib/ghost-api-creds.js';
import {ui} from '@tryghost/pretty-cli';

const choice = {
    name: 'Remove member complimentary subscription',
    value: 'removeMemberCompSubscription'
};

const onYearToday = new Date();
onYearToday.setFullYear(onYearToday.getFullYear() + 1);

const options = [
    ...ghostAPICreds,
    {
        type: 'list',
        name: 'onlyForLabelSlugs',
        message: `Select member label: ${chalk.yellow('[Type to search]')}`,
        pageSize: 20,
        choices: function () {
            return getAPIMemberLabels({returnKey: 'slug'});
        }
    },
    {
        type: 'list',
        name: 'tierId',
        message: `Select tier: ${chalk.yellow('[Type to search]')}`,
        pageSize: 20,
        choices: function () {
            return getAPITiers({returnKey: 'id'});
        }
    }
];

async function run() {
    await inquirer.prompt(options).then(async (answers) => {
        let timer = Date.now();
        let context = {errors: []};

        answers.onlyForLabelSlugs = [answers.onlyForLabelSlugs];

        try {
            let runner = removeMemberComp.getTaskRunner(answers);
            await runner.run(context);
            ui.log.ok(`Successfully removed ${context.updated.length} subscriptions in ${Date.now() - timer}ms.`);
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
