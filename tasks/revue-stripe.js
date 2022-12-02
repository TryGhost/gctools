import {makeTaskRunner} from '@tryghost/listr-smart-renderer';
import _ from 'lodash';
import {join, dirname} from 'node:path';
import fs from 'fs-extra';
import fsUtils from '@tryghost/mg-fs-utils';

const initialise = (options) => {
    return {
        title: 'Initialising',
        task: async (ctx, task) => {
            ctx.destDir = dirname(options.revueCSV);

            ctx.revueMembers = await fsUtils.csv.parseCSV(options.revueCSV);
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
                ctx.revueMembers.forEach((member) => {
                    const stripeMember = _.find(ctx.stripeMembers, {Email: member.email});

                    member.created_at = new Date(member.created_at).toISOString();
                    member.name = [member.first_name, member.last_name].join(' ').trim();

                    delete member.first_name;
                    delete member.last_name;

                    if (stripeMember) {
                        member.stripe_customer_id = stripeMember.id;
                        member.label = 'revue-paid';
                        ctx.newPaidMembers.push(member);
                    } else {
                        member.label = 'revue-free';
                        ctx.newFreeMembers.push(member);
                    }
                });
            }
        },
        {
            title: 'Write new CSVs',
            task: async (ctx) => {
                let theFiles = [
                    {
                        name: 'Free members',
                        fileName: 'revue-free-members.csv',
                        data: fsUtils.csv.jsonToCSV(ctx.newFreeMembers)
                    },
                    {
                        name: 'Paid members',
                        fileName: 'revue-paid-members.csv',
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
