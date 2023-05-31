import {makeTaskRunner} from '@tryghost/listr-smart-renderer';
import {join, dirname} from 'node:path';
import fs from 'fs-extra';
import fsUtils from '@tryghost/mg-fs-utils';

const initialise = (options) => {
    return {
        title: 'Initialising',
        task: async (ctx, task) => {
            ctx.destDir = dirname(options.letterdropCSV);

            ctx.letterdropMembers = await fsUtils.csv.parseCSV(options.letterdropCSV);
            ctx.stripeMembers = await fsUtils.csv.parseCSV(options.stripeCSV);

            ctx.newFreeMembers = [];
            ctx.newPaidMembers = [];

            task.output = `Initialised`;
        }
    };
};

const getFullTaskList = (options) => {
    return [
        initialise(options),
        {
            title: 'Create separate free, comp, & paid objects',
            task: async (ctx) => {
                ctx.letterdropMembers.forEach((member) => {
                    const memberEmail = member.email;

                    const stripeMember = ctx.stripeMembers.find((sMember) => {
                        return sMember['Customer Email'] === memberEmail;
                    });

                    let labels = [];

                    if (member.lists) {
                        let listItems = member.lists.split(',');
                        listItems.forEach((item) => {
                            labels.push(item);
                        });
                    }

                    let newMemberObj = {
                        email: memberEmail,
                        created_at: new Date(member.subscribed_on).toISOString()
                    };

                    if (stripeMember) {
                        labels.push('letterdrop-paid');
                        newMemberObj.stripe_customer_id = stripeMember.id;
                    } else {
                        labels.push('letterdrop-free');
                    }

                    newMemberObj.labels = labels.join(',');

                    if (stripeMember) {
                        ctx.newPaidMembers.push(newMemberObj);
                    } else {
                        ctx.newFreeMembers.push(newMemberObj);
                    }
                });
            }
        },
        {
            title: 'Write new CSVs',
            enabled: options.writeCSVs,
            task: async (ctx) => {
                let theFiles = [
                    {
                        fileName: 'letterdrop-free-members.csv',
                        data: fsUtils.csv.jsonToCSV(ctx.newFreeMembers)
                    },
                    {
                        fileName: 'letterdrop-paid-members.csv',
                        data: fsUtils.csv.jsonToCSV(ctx.newPaidMembers)
                    }
                ];

                let tasks = [];

                theFiles.forEach((file) => {
                    tasks.push({
                        title: `Writing ${file.fileName}`,
                        task: async () => {
                            try {
                                const dest = join(ctx.destDir, file.fileName);
                                await fs.writeFile(dest, file.data);
                            } catch (error) {
                                ctx.errors.push(error);
                                throw error;
                            }
                        }
                    });
                });

                let taskOptions = options;
                taskOptions.concurrent = 1;
                return makeTaskRunner(tasks, taskOptions);
            }
        }
    ];
};

const getTaskRunner = (options) => {
    let tasks = [];

    tasks = getFullTaskList(options);

    return makeTaskRunner(tasks, Object.assign({topLevel: true}, options));
};

export default {
    initialise,
    getFullTaskList,
    getTaskRunner
};
