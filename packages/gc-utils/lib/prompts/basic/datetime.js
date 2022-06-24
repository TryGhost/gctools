import inquirer from 'inquirer';
import inquirerDateTime from 'inquirer-datepicker-prompt';
inquirer.registerPrompt('datetime', inquirerDateTime);

const dateNow = new Date();

async function datetime(args = {}) {
    const options = [
        {
            type: 'datetime',
            name: 'question',
            message: args.message || 'Date',
            format: ['dd', ' ', 'mmmm', ' ', 'yyyy'],
            initial: args.initial || new Date(dateNow.getFullYear(), dateNow.getMonth() - 6, dateNow.getDate())
        }
    ];

    return await inquirer.prompt(options).then(async (answers) => {
        return answers.question;
    });
}

export default datetime;
