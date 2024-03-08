import inquirer from 'inquirer';
import inquirerDatepickerPrompt from 'inquirer-datepicker-prompt';
inquirer.registerPrompt('datetime', inquirerDatepickerPrompt);
import chalk from 'chalk';
import addMemberComp from '../tasks/add-member-comp-subscription.js';
import {getAPITiers, getAPIMemberLabels} from '../lib/ghost-api-choices.js';
import ghostAPICreds from '../lib/ghost-api-creds.js';
import {ui} from '@tryghost/pretty-cli';

const choice = {
    name: 'Add member complimentary subscription',
    value: 'addMemberCompSubscription'
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
    },
    {
        type: 'datetime',
        name: 'expireAt',
        message: 'End date (UTC):',
        format: ['dd', ' ', 'mmmm', ' ', 'yyyy'],
        initial: onYearToday
    }
];

async function run() {
    await inquirer.prompt(options).then(async (answers) => {
        let timer = Date.now();
        let context = {errors: []};

        answers.onlyForLabelSlugs = [answers.onlyForLabelSlugs];

        try {
            let runner = addMemberComp.getTaskRunner(answers);
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
