import inquirer from 'inquirer';
import {getAPINewslettersObj} from '../lib/ghost-api-choices.js';

const getNewsletters = async (args = {}) => {
    const message = args?.message ?? 'Pick newsletter:';

    let prompts = [{
        type: 'list',
        name: 'newsletter',
        message,
        choices: () => {
            return getAPINewslettersObj({returnKey: false});
        }
    }];

    let result = await inquirer.prompt(prompts).then(async (answers) => {
        return answers.newsletter;
    });

    if (result) {
        return [result];
    } else {
        return false;
    }
};

export {
    getNewsletters
};
