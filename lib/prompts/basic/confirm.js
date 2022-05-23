const inquirer = require('inquirer');

async function ask(args = {}) {
    const options = [
        {
            type: 'confirm',
            name: 'theQuestion',
            message: args.message || 'Confirm',
            default: false
        }
    ];

    return await inquirer.prompt(options).then(async (answers) => {
        return answers.theQuestion;
    });
}

module.exports.ask = ask;
