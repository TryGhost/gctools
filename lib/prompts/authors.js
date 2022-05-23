const inquirer = require('inquirer');
inquirer.registerPrompt('search-checkbox', require('inquirer-search-checkbox'));
const chalk = require('chalk');
const {getAPIAuthorsObj} = require('../ghost-api-choices.js');

async function ask(args = {}) {
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
        return {
            result: answers.authors
        };
    });
}

module.exports.ask = ask;
