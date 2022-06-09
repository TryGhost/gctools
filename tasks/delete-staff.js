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
                tag: false,
                author: false,
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
            ctx.users = [];
            ctx.deleted = [];

            task.output = `Initialised API connection for ${options.apiURL}`;
        }
    };
};

const getFullTaskList = (options) => {
    return [
        initialise(options),
        {
            title: 'Fetch Content from Ghost API',
            task: async (ctx, task) => {
                let discoveryOptions = {
                    api: ctx.api,
                    type: 'users',
                    limit: 50
                };

                try {
                    ctx.users = await discover(discoveryOptions);
                    task.output = `Found ${ctx.users.length} users`;
                } catch (error) {
                    ctx.errors.push(error);
                    throw error;
                }

                // Filter out the owner role, as this cannot be deleted
                ctx.users = _.filter(ctx.users, (user) => {
                    const isOwner = _.find(user.roles, {name: 'Owner'});

                    if (!isOwner) {
                        return user;
                    }
                });
            }
        },
        {
            title: 'Filter staff roles',
            skip: () => !options.filterRole.length,
            task: (ctx, task) => {
                ctx.users = ctx.users.filter((user) => {
                    if (options.filterRole.includes(user.roles[0].name)) {
                        return true;
                    } else {
                        return false;
                    }
                });
                task.output = `Found ${ctx.users.length} users with specific roles`;
            }
        },
        {
            title: 'Filter staff with no posts',
            skip: () => !options.filterNoPosts,
            task: (ctx, task) => {
                ctx.users = ctx.users.filter(user => user.count.posts === 0);
                task.output = `Found ${ctx.users.length} users with no posts`;
            }
        },
        {
            title: 'Enforcing max number of staff users',
            skip: () => !options.maxStaff,
            task: (ctx, task) => {
                ctx.users = ctx.users.slice(0, options.maxStaff);
                task.output = `Only ${ctx.users.length} users with will be deleted`;
            }
        },
        {
            title: 'Deleting users from Ghost',
            task: async (ctx) => {
                let tasks = [];

                await Promise.mapSeries(ctx.users, async (user) => {
                    tasks.push({
                        title: `Deleting ${user.slug}`,
                        task: async () => {
                            try {
                                let result = await ctx.api.users.delete({id: user.id});
                                ctx.deleted.push(result);
                                return Promise.delay(options.delayBetweenCalls).return(result);
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
