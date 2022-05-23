const inquirer = require('inquirer');

async function ask(args = {}) {
    const options = [
        {
            type: (args.single) ? 'list' : 'checkbox',
            name: 'visibility',
            message: args.message || 'Visibility',
            choices: [
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
            ],
            validate: (answers) => {
                if (answers.length === 0) {
                    return args.validationMessage || 'Please select at least one option';
                } else {
                    return true;
                }
            }
        }
    ];

    if (args.allowNew) {
        options[0].choices.unshift({
            name: 'All',
            value: 'all'
        });
    }

    return await inquirer.prompt(options).then(async (answers) => {
        return {
            result: answers.visibility
        };
    });
}

module.exports.ask = ask;
