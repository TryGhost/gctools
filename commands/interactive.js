const inquirer = require('inquirer');
const _ = require('lodash');
const ui = require('@tryghost/pretty-cli').ui;
const os = require('os');
const path = require('path');
const tasks = require('../tools');

const sitesJSONFile = path.join(os.homedir(), '.gctools', 'gctools_sites.json');

// Internal ID in case we need one.
exports.id = 'i';

exports.group = 'Tools:';

// The command to run and any params
exports.flags = 'i';

// Description for the top level command
exports.desc = 'An interactive tool to work with Ghost content';

// Configure all the options
exports.setup = (sywac) => {
    sywac.boolean('-V --verbose', {
        defaultValue: false,
        desc: 'Show verbose output'
    });
};

// What to do when this command is executed
exports.run = async () => {
    const tasksMap = new Map(Object.entries(tasks));
    const choices = [];
    for (let value of tasksMap.values()) {
        choices.push(value.choice);
    }

    let tasksPrompt = {
        type: 'rawlist',
        name: 'task',
        message: 'Which tool would you like to use?',
        pageSize: 20,
        choices: [
            ...choices,
            new inquirer.Separator(),
            {
                name: 'Show saved credentials path',
                value: 'show_saved_creds_path'
            },
            new inquirer.Separator(),
            {
                name: 'Abort',
                value: 'abort'
            }
        ]
    };

    function mainMenu() {
        inquirer.prompt(tasksPrompt).then(async (answers) => {
            if (answers.task === 'show_saved_creds_path') {
                ui.log.info(`Saved credentials: ${sitesJSONFile}`);
                mainMenu();
            } else if (answers.task === 'abort') {
                ui.log.info('Aborted');
                process.exit(1);
            } else {
                try {
                    let thisTask = _.filter(tasks, x => x.choice.value === answers.task);
                    await thisTask[0].run();

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
