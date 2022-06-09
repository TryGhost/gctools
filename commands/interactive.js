import inquirer from 'inquirer';
import _ from 'lodash';
import {ui} from '@tryghost/pretty-cli';
import os from 'os';
import path from 'path';

import * as allTools from './index.js';

const sitesJSONFile = path.join(os.homedir(), '.gctools', 'gctools_sites.json');

// Internal ID in case we need one.
export const id = 'i';

export const group = 'Tools:';

// The command to run and any params
export const flags = 'i';

// Description for the top level command
export const desc = 'An interactive tool to work with Ghost content';

// Configure all the options
export const setup = (sywac) => {
    sywac.boolean('-V --verbose', {
        defaultValue: false,
        desc: 'Show verbose output'
    });
};

// What to do when this command is executed
export const run = async () => {
    let tasksPrompt = {
        type: 'rawlist',
        name: 'task',
        message: 'Which tool would you like to use?',
        pageSize: 30,
        choices: []
    };

    // Filter commands to find tools that have explicity set `interactive` to true
    const onlyInteractive = _.filter(allTools, {interactive: true});

    // Group tools in the same way they are in the traditional CLI
    const groupedTools = _.groupBy(onlyInteractive, 'group');

    // For each group
    _.forEach(groupedTools, (tools, groupName) => {
        // Push the group separator
        tasksPrompt.choices.push(new inquirer.Separator(`--- ${groupName} ---`));

        // Push each tool in the group to the list
        tools.forEach((item) => {
            tasksPrompt.choices.push({
                name: item.name || item.id,
                value: item.id
            });
        });
    });

    tasksPrompt.choices.push(new inquirer.Separator('--- Settings ---'));
    tasksPrompt.choices.push({
        name: 'Show saved credentials path',
        value: 'showSavedCredsPath'
    });
    tasksPrompt.choices.push({
        name: 'Abort',
        value: 'abort'
    });

    function mainMenu() {
        inquirer.prompt(tasksPrompt).then(async (answers) => {
            if (answers.task === 'showSavedCredsPath') {
                ui.log(`Saved credentials: \n${sitesJSONFile}`);
                mainMenu();
            } else if (answers.task === 'abort') {
                ui.log('Aborted. Good bye! 👋');
                process.exit(0);
            } else {
                try {
                    let thisTask = _.find(onlyInteractive, {id: answers.task});
                    await thisTask.run({
                        interactive: true
                    });

                    // When the task is run, return to the main menu
                    mainMenu();
                } catch (error) {
                    ui.log.warn(`There was a problem`, error);
                }
            }
        });
    }

    mainMenu();
};
