import inquirer from 'inquirer';
import inquirerSearchCheckbox from 'inquirer-search-checkbox';
inquirer.registerPrompt('search-checkbox', inquirerSearchCheckbox);
import chalk from 'chalk';
import {getAPIAuthorsObj} from '../../ghost-api-choices.js';

async function authors(args = {}) {
    const options = [
        {
            type: 'search-checkbox',
            name: 'authors',
            message: args.message || `Authors ${chalk.yellow('[Type to search]')}`,
            pageSize: 20,
            choices: function () {
                return getAPIAuthorsObj({
                    api: args.api
                });
            }
        }
    ];

    return await inquirer.prompt(options).then(async (answers) => {
        return answers.authors;
    });
}

export default authors;
