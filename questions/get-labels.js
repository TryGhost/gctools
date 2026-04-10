import inquirer from 'inquirer';
import inquirerSearchCheckbox from 'inquirer-search-checkbox';
inquirer.registerPrompt('search-checkbox', inquirerSearchCheckbox);
import {getAPIMemberLabels} from '../lib/ghost-api-choices.js';

const getLabels = async (args = {}) => {
    const message = args?.message ?? 'Pick labels:';

    let prompts = [{
        type: 'search-checkbox',
        name: 'labels',
        message: message,
        choices: () => {
            return getAPIMemberLabels({returnKey: false});
        }
    }];

    let result = await inquirer.prompt(prompts).then(async (answers) => {
        return answers.labels;
    });

    if (result) {
        return result;
    } else {
        return false;
    }
};

export {
    getLabels
};
