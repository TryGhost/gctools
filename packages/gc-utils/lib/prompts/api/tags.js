import inquirer from 'inquirer';
import inquirerSearchCheckbox from 'inquirer-search-checkbox';
inquirer.registerPrompt('search-checkbox', inquirerSearchCheckbox);
import chalk from 'chalk';
import {getResources} from '../../batch-ops.js';

async function fetchTags(args = {}) {
    let apiTags = await getResources({
        api: args.api,
        type: 'tags',
        order: 'slug ASC'
    });

    let theTags = [];

    apiTags.forEach(function (tag){
        theTags.push({
            name: `${tag.name} - ${tag.slug} - ${tag.count.posts} posts`,
            value: tag
        });
    });

    return theTags;
}

async function tags(args = {}) {
    const options = [
        {
            type: 'search-checkbox',
            name: 'tags',
            message: args.message || `Tags ${chalk.yellow('[Type to search]')}`,
            pageSize: 20,
            choices: function () {
                return fetchTags({
                    api: args.api
                });
            }
        }
    ];

    return await inquirer.prompt(options).then(async (answers) => {
        return answers.tags;
    });
}

export default tags;
