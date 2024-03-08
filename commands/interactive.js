import {join} from 'node:path';
import {homedir} from 'node:os';
import inquirer from 'inquirer';
import _ from 'lodash';
import {ui} from '@tryghost/pretty-cli';
import tasks from '../prompts/index.js';

const sitesJSONFile = join(homedir(), '.gctools', 'gctools_sites.json');

// Internal ID in case we need one.
const id = 'i';

const group = 'Interactive:';

// The command to run and any params
const flags = 'i';

// Description for the top level command
const desc = 'An interactive tool to work with Ghost content';

// Configure all the options
const setup = (sywac) => {
    sywac.boolean('-V --verbose', {
        defaultValue: false,
        desc: 'Show verbose output'
    });
};

// What to do when this command is executed
const run = async () => {
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
                name: tasks.fetchAssets.choice.name,
                value: tasks.fetchAssets.choice.value
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
                name: tasks.combineTags.choice.name,
                value: tasks.combineTags.choice.value
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
                name: tasks.changeVisibilityPosts.choice.name,
                value: tasks.changeVisibilityPosts.choice.value
            },
            {
                name: tasks.changeVisibilityPages.choice.name,
                value: tasks.changeVisibilityPages.choice.value
            },
            {
                name: tasks.changeStatus.choice.name,
                value: tasks.changeStatus.choice.value
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
                name: tasks.deletePages.choice.name,
                value: tasks.deletePages.choice.value
            },
            {
                name: tasks.deleteTags.choice.name,
                value: tasks.deleteTags.choice.value
            },
            {
                name: tasks.deleteUnusedTags.choice.name,
                value: tasks.deleteUnusedTags.choice.value
            },
            {
                name: tasks.addMemberCompSubscription.choice.name,
                value: tasks.addMemberCompSubscription.choice.value
            },
            {
                name: tasks.addMemberNewsletterSubscription.choice.name,
                value: tasks.addMemberNewsletterSubscription.choice.value
            },
            {
                name: tasks.changeRole.choice.name,
                value: tasks.changeRole.choice.value
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

export default {
    id,
    group,
    flags,
    desc,
    setup,
    run
};
