import inquirer from 'inquirer';

async function list(args = {}) {
    const checkedChoices = args.choices.map((choice) => {
        return {
            value: choice,
            checked: (args.default === choice) ? true : false
        };
    });

    const options = [
        {
            type: 'list',
            name: 'question',
            message: args.message || 'List',
            choices: checkedChoices || [],
            default: args.default || false
        }
    ];

    return await inquirer.prompt(options).then(async (answers) => {
        return answers.question;
    });
}

export default list;
