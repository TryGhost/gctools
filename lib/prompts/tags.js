const inquirer = require('inquirer');
inquirer.registerPrompt('search-checkbox', require('inquirer-search-checkbox'));
const chalk = require('chalk');
const {getAPITagsObj} = require('../ghost-api-choices.js');

async function ask(args = {}) {
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
        return {
            result: answers.tags
        };
    });
}

module.exports.ask = ask;
