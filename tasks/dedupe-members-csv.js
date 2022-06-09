import makeTaskRunner from '../lib/task-runner.js';
import _ from 'lodash';
import path from 'path';
import fs from 'fs-extra';
import {csv} from '@tryghost/mg-fs-utils';

const csvParse = csv.parse;
const jsonToCSV = csv.jsonToCSV;

const determineIfUpdated = (ctx) => {
    ctx.newCombined.forEach((member) => {
        let foundExistingMember = _.find(ctx.existingMembers, {
            email: member.email
        });

        if (foundExistingMember) {
            const wasPaid = foundExistingMember.stripe_customer_id !== '';
            const isNowPaid = member.stripe_customer_id !== '';

            const wasComp = foundExistingMember.complimentary_plan === 'true';
            const isNowComp = member.complimentary_plan === 'true';

            if (wasPaid !== isNowPaid) {
                ctx.combinedNewMembers.push(member);
            } else if (wasComp !== isNowComp) {
                ctx.combinedNewMembers.push(member);
            }
        } else {
            ctx.combinedNewMembers.push(member);
        }
    });

    return ctx;
};

const splitByStatus = (ctx) => {
    ctx.combinedNewMembers.forEach((member) => {
        if ((member.complimentary_plan === 'false' || member.complimentary_plan === '') && member.stripe_customer_id === '') {
            ctx.newFreeMembers.push(member);
        } else if (member.complimentary_plan === 'true') {
            ctx.newCompMembers.push(member);
        } else if (member.stripe_customer_id !== '') {
            ctx.newPaidMembers.push(member);
        } else {
            ctx.errors.push({
                title: 'Unhandled member',
                member: member
            });
            throw 'Unhandled member';
        }
    });

    return ctx;
};

const initialise = (options) => {
    return {
        title: 'Initialising',
        task: async (ctx, task) => {
            ctx.destDir = path.dirname(options.existingMembers);

            ctx.existingMembers = await csvParse(options.existingMembers);

            ctx.newFree = (options.newFree) ? await csvParse(options.newFree) : [];
            ctx.newComp = (options.newComp) ? await csvParse(options.newComp) : [];
            ctx.newPaid = (options.newPaid) ? await csvParse(options.newPaid) : [];

            ctx.newCombined = [...ctx.newFree, ...ctx.newComp, ...ctx.newPaid];

            ctx.combinedNewMembers = [];

            ctx.newFreeMembers = [];
            ctx.newCompMembers = [];
            ctx.newPaidMembers = [];

            task.output = `Initialised`;
        }
    };
};

const getFullTaskList = (options) => {
    return [
        initialise(options),
        {
            title: 'Finding new members',
            task: async (ctx, task) => {
                ctx = determineIfUpdated(ctx);

                task.output = `Found ${ctx.combinedNewMembers.length} new members`;
            }
        },
        {
            title: 'Create separate free, comp, & paid objects',
            task: async (ctx, task) => {
                ctx = splitByStatus(ctx);

                task.output = `Free: ${ctx.newFreeMembers.length}, Comp: ${ctx.newCompMembers.length}, Paid: ${ctx.newPaidMembers.length}`;
            }
        },
        {
            title: 'Write new CSVs',
            task: async (ctx) => {
                let theFiles = [];

                if (ctx.newFreeMembers.length) {
                    theFiles.push(
                        {
                            name: 'Free members',
                            fileName: 'deduped-free-members.csv',
                            data: jsonToCSV(ctx.newFreeMembers)
                        }
                    );
                }

                if (ctx.newCompMembers.length) {
                    theFiles.push(
                        {
                            name: 'Comp members',
                            fileName: 'deduped-comp-members.csv',
                            data: jsonToCSV(ctx.newCompMembers)
                        }
                    );
                }

                if (ctx.newPaidMembers.length) {
                    theFiles.push(
                        {
                            name: 'Paid members',
                            fileName: 'deduped-paid-members.csv',
                            data: jsonToCSV(ctx.newPaidMembers)
                        }
                    );
                }

                let tasks = [];

                theFiles.forEach((file) => {
                    tasks.push({
                        title: `Writing ${file.fileName}`,
                        task: async () => {
                            try {
                                const dest = path.join(ctx.destDir, file.fileName);
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
    getTaskRunner,
    determineIfUpdated,
    splitByStatus
};
