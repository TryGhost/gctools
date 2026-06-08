import inquirer from 'inquirer';
import inquirerDatepickerPrompt from 'inquirer-datepicker-prompt';
inquirer.registerPrompt('datetime', inquirerDatepickerPrompt);
import ghostAPICreds from '../lib/ghost-api-creds.js';
import seedDemo from '../tasks/seed-demo.js';
import {ui} from '@tryghost/pretty-cli';

const dateToday = new Date();

const choice = {
    name: 'Seed demo content',
    value: 'seedDemo'
};

const options = [
    ...ghostAPICreds,
    {
        type: 'input',
        name: 'count',
        message: 'Number of demo posts to create:',
        default: () => 10,
        filter: val => parseInt(val, 10),
        validate: (val) => {
            const n = parseInt(val, 10);
            return Number.isInteger(n) && n > 0 ? true : 'Enter an integer greater than 0';
        }
    },
    {
        type: 'rawlist',
        name: 'featureImages',
        message: 'Feature images:',
        choices: [
            {name: 'All posts', value: 'all'},
            {name: 'Half of posts', value: '50%'},
            {name: 'None', value: 'none'}
        ]
    },
    {
        type: 'confirm',
        name: 'imageCards',
        message: 'Insert in-post image cards (0-3 per post)?',
        default: true
    },
    {
        type: 'input',
        name: 'extraTags',
        message: 'Extra random tags to generate (0-30):',
        default: () => 0,
        filter: val => parseInt(val, 10),
        validate: (val) => {
            const n = parseInt(val, 10);
            return Number.isInteger(n) && n >= 0 && n <= 30 ? true : 'Enter an integer between 0 and 30';
        }
    },
    {
        type: 'confirm',
        name: 'aboutPage',
        message: 'Create/overwrite the /about page?',
        default: true
    },
    {
        type: 'confirm',
        name: 'styleGuide',
        message: 'Create the Style Guide post?',
        default: true
    },
    {
        type: 'confirm',
        name: 'addAuthor',
        message: 'Create a dummy author? (requires a staff access token; an integration key will be skipped with importable JSON)',
        default: false
    },
    {
        type: 'input',
        name: 'authorName',
        message: 'Dummy author name:',
        default: () => 'Sam Example',
        when: answers => answers.addAuthor === true
    },
    {
        type: 'input',
        name: 'authorEmail',
        message: 'Dummy author email (blank to derive from name):',
        default: () => '',
        filter: (val) => {
            return (val && val.trim()) ? val.trim() : false;
        },
        when: answers => answers.addAuthor === true
    },
    {
        type: 'rawlist',
        name: 'authorRole',
        message: 'Dummy author role:',
        choices: ['Contributor', 'Author', 'Editor', 'Administrator'],
        default: 0,
        when: answers => answers.addAuthor === true
    },
    {
        type: 'input',
        name: 'authorShare',
        message: 'Percentage of posts where the dummy author is primary (0-100):',
        default: () => 30,
        filter: val => parseInt(val, 10),
        validate: (val) => {
            const n = parseInt(val, 10);
            return Number.isInteger(n) && n >= 0 && n <= 100 ? true : 'Enter an integer between 0 and 100';
        },
        when: answers => answers.addAuthor === true
    },
    {
        type: 'select',
        name: 'dateRange',
        message: 'Distribute post dates over a range (spread with jitter)?',
        choices: [
            {
                name: 'No — date every post now',
                value: false
            },
            {
                name: 'Past year',
                value: {
                    start: new Date(dateToday.getFullYear() - 1, dateToday.getMonth(), dateToday.getDate()),
                    end: dateToday
                }
            },
            {
                name: 'Past month',
                value: {
                    start: new Date(dateToday.getFullYear(), dateToday.getMonth() - 1, dateToday.getDate()),
                    end: dateToday
                }
            },
            {
                name: 'Custom',
                value: 'custom'
            }
        ]
    },
    {
        type: 'datetime',
        name: 'dateRangeStart',
        message: 'Start date:',
        format: ['dd', ' ', 'mmmm', ' ', 'yyyy'],
        initial: new Date(dateToday.getFullYear(), dateToday.getMonth() - 6, dateToday.getDate()),
        when: function (answers) {
            return answers.dateRange === 'custom';
        }
    },
    {
        type: 'datetime',
        name: 'dateRangeEnd',
        message: 'End date:',
        format: ['dd', ' ', 'mmmm', ' ', 'yyyy'],
        initial: dateToday,
        when: function (answers) {
            return answers.dateRange === 'custom';
        }
    },
    {
        type: 'confirm',
        name: 'nav',
        message: 'Update the navigation menu? (requires a staff access token; an integration key will be skipped with paste-able JSON)',
        default: true
    }
];

async function run() {
    await inquirer.prompt(options).then(async (answers) => {
        // Collapse the custom datetime pickers into a {start, end} dateRange.
        if (answers.dateRange === 'custom' && answers.dateRangeStart && answers.dateRangeEnd) {
            answers.dateRange = {
                start: answers.dateRangeStart,
                end: answers.dateRangeEnd
            };
            delete answers.dateRangeStart;
            delete answers.dateRangeEnd;
        }

        let timer = Date.now();
        let context = {errors: []};

        try {
            let runner = seedDemo.getTaskRunner(answers);
            await runner.run(context);

            if (context.warnings && context.warnings.length) {
                context.warnings.forEach((warning) => {
                    ui.log.warn(warning.message);
                    if (warning.navigation) {
                        ui.log.info(JSON.stringify(warning.navigation, null, 2));
                    }
                    if (warning.importFile) {
                        ui.log.info(JSON.stringify(warning.importFile, null, 2));
                    }
                });
            }

            const s = context.summary || {posts: 0};
            ui.log.ok(`Seeded ${s.posts} posts${s.aboutPage ? ', /about page' : ''}${s.styleGuide ? ', style guide' : ''}${s.author ? ', author' : ''}${s.navigation ? ', navigation' : ''} in ${Date.now() - timer}ms.`);
        } catch (error) {
            ui.log.error('Done with errors', context.errors);
        }
    });
}

export default {
    choice,
    options,
    run
};
