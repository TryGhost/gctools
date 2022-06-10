import inquirer from 'inquirer';

async function input(args = {}) {
    const options = [
        {
            type: 'input',
            name: 'question',
            message: args.message || 'Input',
            filter: (val) => {
                let trimmedVal = val.trim();
                return (trimmedVal.length) ? trimmedVal : false;
            }
        }
    ];

    return await inquirer.prompt(options).then(async (answers) => {
        return answers.question;
    });
}

export default input;
