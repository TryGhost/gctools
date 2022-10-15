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
                // If `ctx.args.tags` is an array of tag objects
                if (ctx.args.tags[0].id) {
                    ctx.tags = ctx.args.tags;
                } else {
                    let allTags = await discover({
                        api: ctx.api,
                        type: 'tags'
                    });

                    ctx.args.tags.forEach((tag) => {
                        let tagObject = _.find(allTags, {slug: tag});

                        if (tagObject) {
                            ctx.tags.push(tagObject);
                        } else {
                            ctx.errors.push(`No tag found for "${tag}"`);
                        }
                    });
                }

                task.output = `Found ${ctx.tags.length} tags`;
            }
        },
        {
            title: 'Deleting tags from Ghost',
            skip: (ctx) => {
                return ctx.tags.length === 0;
            },
            task: async (ctx) => {
                let tasks = [];

                await Promise.mapSeries(ctx.tags, async (tag) => {
                    tasks.push({
                        title: `Delete tag ${tag.name} (${tag.slug})`,
                        task: async () => {
                            try {
                                let result = await ctx.api.tags.delete({id: tag.id});
                                ctx.deleted.push(result.name);
                                return Promise.delay(options.delayBetweenCalls).return(result);
                            } catch (error) {
                                error.resource = {
                                    name: tag.name
                                };
                                error.object = tag;
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
