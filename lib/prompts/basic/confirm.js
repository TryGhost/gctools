import inquirer from 'inquirer';

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

export default confirm;
