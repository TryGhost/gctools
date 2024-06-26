import inquirer from 'inquirer';
import chalk from 'chalk';
import {ui} from '@tryghost/pretty-cli';
import postTiers from '../tasks/post-tiers.js';
import ghostAPICreds from '../lib/ghost-api-creds.js';
import {getAPITiers} from '../lib/ghost-api-choices.js';

const choice = {
    name: 'Add tier to post',
    value: 'postTiers'
};

const options = [
    ...ghostAPICreds,
    {
        type: 'list',
        name: 'tierOrVisibility',
        message: 'Filter by post visibility or a specific tier:',
        choices: [
            {
                name: 'Visibility',
                value: 'visibility'
            },
            {
                name: 'Tier',
                value: 'tier'
            }
        ]
    },
    {
        type: 'list',
        name: 'visibility',
        message: 'Filter by visibility:',
        when: (answers) => {
            return answers.tierOrVisibility === 'visibility';
        },
        choices: [
            {
                name: 'All',
                value: 'all'
            },
            {
                name: 'Public',
                value: 'public'
            },
            {
                name: 'Members',
                value: 'members'
            },
            {
                name: 'Paid',
                value: 'paid'
            }
        ]
    },
    {
        type: 'list',
        name: 'filterTierId',
        message: 'Filter by tier:',
        when: (answers) => {
            return answers.tierOrVisibility === 'tier';
        },
        choices: async function () {
            let tiers = await getAPITiers({returnKey: 'id'});

            tiers = tiers.map((tier) => {
                tier.value = [tier.value, 'tiers'];
                return tier;
            });

            return tiers;
        }
    },
    {
        type: 'list',
        name: 'addTierId',
        message: `Select tier to add to these posts: ${chalk.yellow('[Type to search]')}`,
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

        try {
            let runner = postTiers.getTaskRunner(answers);
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
