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
                delayBetweenCalls: 50
            };

            const url = options.apiURL.replace(/\/$/, '');
            const key = options.adminAPIKey;
            const api = new GhostAdminAPI({
                url: url.replace('localhost', '127.0.0.1'),
                key,
                version: 'v5.0'
            });

            ctx.args = _.mergeWith(defaults, options);
            ctx.api = api;
            ctx.posts = [];
            ctx.toUpdate = [];
            ctx.updated = [];
            ctx.regex = new RegExp(ctx.args.find, 'g');

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
                try {
                    ctx.posts = await discover({
                        api: ctx.api,
                        type: 'posts'
                    });

                    task.output = `Found ${ctx.posts.length} posts`;
                } catch (error) {
                    ctx.errors.push(error);
                    throw error;
                }
            }
        },
        {
            title: 'Finding matches',
            task: async (ctx) => {
                await Promise.mapSeries(ctx.posts, async (post) => {
                    let matches = [];

                    ctx.args.where.forEach((key) => {
                        if (post[key]) {
                            let match = post[key].match(ctx.regex);
                            if (match) {
                                matches.push(...match);
                            }
                        }
                    });

                    if (matches.length > 0) {
                        post.matches = matches;
                        ctx.toUpdate.push(post);
                    }
                });
            }
        },
        {
            title: 'Replacing text',
            task: async (ctx) => {
                let tasks = [];

                await Promise.mapSeries(ctx.toUpdate, async (post) => {
                    tasks.push({
                        title: `Replacing ${post.matches.length} matches in "${post.title}": ${post.url}`,
                        task: async () => {
                            ctx.args.where.forEach((key) => {
                                if (post[key]) {
                                    post[key] = post[key].replace(ctx.regex, ctx.args.replace);
                                }
                            });

                            // Delete the matches object or else the request gets denied
                            delete post.matches;

                            try {
                                let result = await ctx.api.posts.edit(post);
                                ctx.updated.push(result.url);
                                return Promise.delay(options.delayBetweenCalls).return(result);
                            } catch (error) {
                                error.resource = {
                                    title: post.title
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
