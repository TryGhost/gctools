import inquirer from 'inquirer';
import inquirerSearchCheckbox from 'inquirer-search-checkbox';
inquirer.registerPrompt('search-checkbox', inquirerSearchCheckbox);
import chalk from 'chalk';
import {getAPITagsObj} from '../../ghost-api-choices.js';

async function tags(args = {}) {
    const options = [
        {
            type: 'search-checkbox',
            name: 'tags',
            message: args.message || `Tags ${chalk.yellow('[Type to search]')}`,
            pageSize: 20,
            choices: function () {
                return getAPITagsObj({
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
