import inquirer from 'inquirer';
import inquirerSearchCheckbox from 'inquirer-search-checkbox';
inquirer.registerPrompt('search-checkbox', inquirerSearchCheckbox);
import chalk from 'chalk';
import {getResources} from '../../batch-ops.js';

async function fetchAuthors(args = {}) {
    const apiUsers = await getResources({
        api: args.api,
        type: 'users',
        order: 'slug ASC'
    });

    let users = [];

    apiUsers.forEach(function (author){
        users.push({
            name: `${author.name} - ${author.slug} - ${author.count.posts} posts`,
            value: author
        });
    });

    return users;
}

async function authors(args = {}) {
    const options = [
        {
            type: 'search-checkbox',
            name: 'authors',
            message: args.message || `Authors ${chalk.yellow('[Type to search]')}`,
            pageSize: 20,
            choices: function () {
                return fetchAuthors({
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
