import Promise from 'bluebird';
import GhostAdminAPI from '@tryghost/admin-api';
import makeTaskRunner from '../lib/task-runner.js';
import _ from 'lodash';
import {discover} from '../lib/batch-ghost-discover.js';

const initialise = (options) => {
    return {
        title: 'Initialising API connection',
        task: (ctx, task) => {
            let defaults = {
                verbose: false,
                delayBetweenCalls: 50
            };

            const url = options.apiURL;
            const key = options.adminAPIKey;
            const api = new GhostAdminAPI({
                url,
                key,
                version: 'v5.0'
            });

            ctx.args = _.mergeWith(defaults, options);
            ctx.api = api;
            ctx.membersCount = 0;
            ctx.members = [];
            ctx.deleted = [];

            task.output = `Initialised API connection for ${options.apiURL}`;
        }
    };
};

const getFullTaskList = (options) => {
    return [
        initialise(options),
        {
            title: 'Counting members',
            task: async (ctx, task) => {
                try {
                    // Quickly grab how many members there are
                    let countQuery = await ctx.api.members.browse();
                    ctx.membersCount = countQuery.meta.pagination.total;
                    task.output = `Counted ${ctx.membersCount} members`;
                } catch (error) {
                    ctx.errors.push(error);
                    throw error;
                }
            }
        },
        {
            title: 'Fetching members from Ghost',
            task: async (ctx, task) => {
                try {
                    ctx.members = await discover({
                        api: ctx.api,
                        type: 'members',
                        fields: 'id,uuid,email,name'
                    });

                    task.output = `Found ${ctx.members.length} members`;
                } catch (error) {
                    ctx.errors.push(error);
                    throw error;
                }
            }
        },
        {
            title: 'Deleting members from Ghost',
            task: async (ctx) => {
                let tasks = [];

                await Promise.mapSeries(ctx.members, async (member) => {
                    tasks.push({
                        title: `${member.email}`,
                        task: async () => {
                            try {
                                let result = await ctx.api.members.delete({id: member.id});
                                ctx.deleted.push(member.email);
                                return Promise.delay(options.delayBetweenCalls).return(result);
                            } catch (error) {
                                error.resource = {
                                    title: member.email
                                };
                                ctx.errors.push(error);
                                throw error;
                            }
                        }
                    });
                });

                let taskOptions = options;
                taskOptions.concurrent = 3;
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
}
