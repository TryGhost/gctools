import inquirer from 'inquirer';

async function input(args = {}) {
    const options = [
        {
            type: 'input',
            name: 'question',
            message: args.message || 'Input',
            filter: (val) => {
                let trimmedVal = val.trim();
                return trimmedVal;
            }
        }
    ];

    return await inquirer.prompt(options).then(async (answers) => {
        return answers.question;
    });
}

async function confirm(args = {}) {
    const options = [
        {
            type: 'confirm',
            name: 'question',
            message: args.message || 'Confirm',
            default: args.default || false
        }
    ];

    return await inquirer.prompt(options).then(async (answers) => {
        return answers.question;
    });
}

export {
    input,
    confirm
};
