import inquirer from 'inquirer';
import _ from 'lodash';
import {ui} from '@tryghost/pretty-cli';
import os from 'os';
import path from 'path';
import chalk from 'chalk';

import * as allTools from '../lib/commands.js';

const sitesJSONFile = path.join(os.homedir(), '.gctools', 'gctools_sites.json');

const interactive = () => {
    let tasksPrompt = {
        type: 'list',
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
        name: 'Exit',
        value: 'exit'
    });

    function mainMenu() {
        inquirer.prompt(tasksPrompt).then(async (answers) => {
            if (answers.task === 'showSavedCredsPath') {
                ui.log(`${chalk.bold('Saved credentials:')} \n${chalk.cyan(sitesJSONFile)}`);
                mainMenu();
            } else if (answers.task === 'exit') {
                ui.log('Exited. Bye! 👋');
                process.exit(0);
            } else {
                try {
                    const thisTask = _.find(onlyInteractive, {id: answers.task});

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

export default interactive;
