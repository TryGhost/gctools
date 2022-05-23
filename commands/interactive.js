const inquirer = require('inquirer');
const _ = require('lodash');
const ui = require('@tryghost/pretty-cli').ui;
const os = require('os');
const path = require('path');
const tasks = require('../prompts');

const sitesJSONFile = path.join(os.homedir(), '.gctools', 'gctools_sites.json');

// Internal ID in case we need one.
exports.id = 'i';

exports.group = 'Beta:';

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
    let tasksPrompt = {
        type: 'rawlist',
        name: 'task',
        message: 'Which tool would you like to use?',
        pageSize: 30,
        choices: [
            new inquirer.Separator('--- File Utilities -----------'),
            {
                name: tasks.zipSplit.choice.name,
                value: tasks.zipSplit.choice.value
            },
            {
                name: tasks.zipCreate.choice.name,
                value: tasks.zipCreate.choice.value
            },
            {
                name: tasks.jsonSplit.choice.name,
                value: tasks.jsonSplit.choice.value
            },
            {
                name: tasks.fetchImages.choice.name,
                value: tasks.fetchImages.choice.value
            },
            {
                name: tasks.dedupeMembersCsv.choice.name,
                value: tasks.dedupeMembersCsv.choice.value
            },
            new inquirer.Separator('--- API Utilities ------------'),
            {
                name: tasks.randomPosts.choice.name,
                value: tasks.randomPosts.choice.value
            },
            {
                name: tasks.addTags.choice.name,
                value: tasks.addTags.choice.value
            },
            {
                name: tasks.addPreview.choice.name,
                value: tasks.addPreview.choice.value
            },
            {
                name: tasks.changeAuthor.choice.name,
                value: tasks.changeAuthor.choice.value
            },
            {
                name: tasks.changeVisibility.choice.name,
                value: tasks.changeVisibility.choice.value
            },
            {
                name: tasks.contentStats.choice.name,
                value: tasks.contentStats.choice.value
            },
            new inquirer.Separator('--- Dangerous Utilities ------'),
            {
                name: tasks.deletePosts.choice.name,
                value: tasks.deletePosts.choice.value
            },
            {
                name: tasks.deleteTags.choice.name,
                value: tasks.deleteTags.choice.value
            },
            {
                name: tasks.deleteEmptyTags.choice.name,
                value: tasks.deleteEmptyTags.choice.value
            },
            {
                name: tasks.deleteMembers.choice.name,
                value: tasks.deleteMembers.choice.value
            },
            {
                name: tasks.deleteStaff.choice.name,
                value: tasks.deleteStaff.choice.value
            },
            {
                name: tasks.findReplace.choice.name,
                value: tasks.findReplace.choice.value
            },
            new inquirer.Separator('--- Settings -----------------'),
            {
                name: 'Show saved credentials path',
                value: 'show_saved_creds_path'
            },
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
                process.exit(0);
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
