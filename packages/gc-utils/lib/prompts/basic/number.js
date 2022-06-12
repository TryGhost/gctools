import inquirer from 'inquirer';

async function number(args = {}) {
    const options = [
        {
            type: 'number',
            name: 'question',
            message: args.message || 'Number',
            default: args.default || 0
        }
    ];

    return await inquirer.prompt(options).then(async (answers) => {
        return answers.question;
    });
}

export default number;
