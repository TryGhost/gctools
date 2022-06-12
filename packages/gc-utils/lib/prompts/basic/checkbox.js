import inquirer from 'inquirer';

async function checkbox(args = {}) {
    const checkedChoices = args.choices.map((choice) => {
        return {
            value: choice,
            checked: (args.default === choice) ? true : false
        };
    });

    const options = [
        {
            type: 'checkbox',
            name: 'question',
            message: args.message || 'Checkbox',
            choices: checkedChoices || [],
            default: args.default || false,
            validate: (val) => {
                if (val.length === 0) {
                    return 'Please select at least one value';
                } else {
                    return true;
                }
            }
        }
    ];

    return await inquirer.prompt(options).then(async (answers) => {
        return answers.question;
    });
}

export default checkbox;
