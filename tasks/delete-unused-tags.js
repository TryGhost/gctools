import Promise from 'bluebird';
import GhostAdminAPI from '@tryghost/admin-api';
import {makeTaskRunner} from '@tryghost/listr-smart-renderer';
import _ from 'lodash';
import {discover} from '../lib/batch-ghost-discover.js';

const initialise = (options) => {
    return {
        title: 'Initialising API connection',
        task: (ctx, task) => {
            let defaults = {
                verbose: false,
                tag: false,
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
            ctx.tags = [];
            ctx.tagsToDelete = [];
            ctx.deleted = [];

            task.output = `Initialised API connection for ${options.apiURL}`;
        }
    };
};

const getFullTaskList = (options) => {
    return [
        initialise(options),
        {
            title: 'Fetch tags from Ghost API',
            task: async (ctx, task) => {
                ctx.tags = await discover({
                    api: ctx.api,
                    type: 'tags'
                });

                task.output = `Found ${ctx.tags.length} tags`;
            }
        },
        {
            title: 'Finding tags with no posts',
            task: async (ctx, task) => {
                ctx.tagsToDelete = ctx.tags.filter((item) => {
                    return item.count.posts <= options.maxPostCount;
                });
                task.output = `Found ${ctx.tagsToDelete.length} tags with low or no posts`;
            }
        },
        {
            title: 'Deleting tags from Ghost',
            task: async (ctx) => {
                let tasks = [];

                await Promise.mapSeries(ctx.tagsToDelete, async (tag) => {
                    tasks.push({
                        title: `${tag.name}`,
                        task: async () => {
                            try {
                                let result = await ctx.api.tags.delete({id: tag.id});
                                ctx.deleted.push(result.name);
                                return Promise.delay(options.delayBetweenCalls).return(result);
                            } catch (error) {
                                error.resource = {
                                    name: tag.name
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
};
