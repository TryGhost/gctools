const inquirer = require('inquirer');

async function ask(args = {}) {
    const options = [
        {
            type: 'input',
            name: 'theQuestion',
            message: args.message,
            filter: (val) => {
                let trimmedVal = val.trim();
                return trimmedVal;
            }
        }
    ];

    return await inquirer.prompt(options).then(async (answers) => {
        return {
            result: answers.theQuestion
        };
    });
}

module.exports.ask = ask;
