import confirm from '@inquirer/confirm';
import chalk from 'chalk';
import {ui} from '@tryghost/pretty-cli';
import {makeTaskRunner} from '@tryghost/listr-smart-renderer';
import {transformToCommaString, sleep} from '../lib/utils.js';
import {adminClient} from '../lib/ghost-api-creds.js';
import {discover, discoverInfo} from '../lib/batch-ghost-discover.js';
import {filterBuilder} from '../lib/filter-builder.js';
import {getNewsletters} from '../questions/get-newsletters.js';
import {getLabels} from '../questions/get-labels.js';

const choice = {
    name: 'Add Member Newsletter Subscription',
    value: 'add-member-newsletter-subscription'
};

async function run() {
    let errors = [];

    // 1. Ensure we have site creds first & create a client
    const clientCreds = await adminClient();
    const apiClient = clientCreds.api;

    // 2. Get the ID of the newsletter to be subscribed to
    const newsletter = await getNewsletters({
        message: 'Newsletter to be subscribed to:'
    });

    // 3. Get the label slugs of the people who should be subbed
    const labels = await getLabels({
        message: `Select members with these labels: ${chalk.reset.grey('(Leave blank for all)')}`
    });

    // 4. Build discovery options object
    let discoveryOptions = {
        api: apiClient,
        type: 'members',
        filter: filterBuilder({
            notNewsletters: newsletter,
            labels: labels
        }),
        progress: true
    };

    // 5. Check how many members will be downloaded and prompt to continue
    // This is a nice-to-have if there's many thousands of members
    const checkMembersCount = await discoverInfo(discoveryOptions);
    const downloadMembers = await confirm({message: `Start downloading ${checkMembersCount} members?`, default: false});
    if (!downloadMembers) {
        return false;
    }

    // 6. Get selected members from the API
    const members = await discover(discoveryOptions);

    // 7. Prompt with final figures & info
    let messageParts = [];
    messageParts.push(`You're about to subscribe ${chalk.bold.green(members.length)} members`);
    if (labels && labels.length) {
        const labelNames = transformToCommaString(labels, 'name', ', ');
        messageParts.push(`that have the labels ${chalk.bold.yellow(`[${labelNames}]`)}`);
    }
    messageParts.push(`to newsletter ${chalk.bold.blue(`${newsletter[0].name} (${newsletter[0].slug})`)}`);
    ui.log(messageParts.join(' '));

    const runTask = await confirm({message: chalk.red.bold(`Do you want to do this?`), default: false});

    // 8. If all is well, run the task
    if (runTask) {
        let tasks = [];

        members.forEach((member) => {
            tasks.push({
                title: `Updating ${member.email}`,
                task: async () => {
                    let newMemberObject = {
                        id: member.id,
                        newsletters: member.newsletters || []
                    };

                    newMemberObject.newsletters.push(newsletter[0]);

                    try {
                        let result = await apiClient.members.edit(newMemberObject);
                        await sleep(100);
                        return result;
                    } catch (error) {
                        errors.push(error);
                        throw error;
                    }
                }
            });
        });

        let runner = makeTaskRunner(tasks, {
            concurrent: 1
        });

        await runner.run();
    } else {
        // Will return to the main menu
        return false;
    }

    if (errors.length) {
        ui.log(errors);
    }
}

export default {
    choice,
    run
};
