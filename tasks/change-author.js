const Promise = require('bluebird');
const GhostAdminAPI = require('@tryghost/admin-api');
const makeTaskRunner = require('../lib/task-runner');
const _ = require('lodash');
const discover = require('../lib/discover');

module.exports.initialise = (options) => {
    return {
        title: 'Initialising API connection',
        task: async (ctx, task) => {
            let defaults = {
                verbose: false,
                author: false,
                delayBetweenCalls: 50
            };

            const url = options.apiURL;
            const key = options.adminAPIKey;
            const api = new GhostAdminAPI({
                url,
                key,
                version: 'v2'
            });

            ctx.options = _.mergeWith(defaults, options);
            ctx.api = api;
            ctx.posts = [];
            ctx.pages = [];
            ctx.changed = [];

            // If the `author` and `new_author` answers are not objects, get an object for each
            if (typeof ctx.options.author !== 'object' && typeof ctx.options.new_author !== 'object') {
                let discoveredAuthors = await discover('users', ctx);
                ctx.options.author = _.find(discoveredAuthors, {slug: ctx.options.author});
                ctx.options.new_author = _.find(discoveredAuthors, {slug: ctx.options.new_author});
            }

            task.output = `Initialised API connection for ${options.apiURL}`;
        }
    };
};

module.exports.getFullTaskList = (options) => {
    return [
        this.initialise(options),
        {
            title: 'Fetch Content from Ghost API',
            task: async (ctx, task) => {
                try {
                    if (ctx.options.author) {
                        ctx.options.author = ctx.options.author.slug;
                    }

                    ctx.posts = await discover('posts', ctx);
                    ctx.pages = await discover('pages', ctx);
                    task.output = `Found ${ctx.posts.length} posts and ${ctx.pages.length} pages`;
                } catch (error) {
                    ctx.errors.push(error);
                    throw error;
                }
            }
        },
        {
            title: 'Updating post authors',
            task: async (ctx) => {
                let tasks = [];

                await Promise.mapSeries(ctx.posts, async (post) => {
                    tasks.push({
                        title: `${post.title}`,
                        task: async () => {
                            try {
                                // We only want to send minimal data to the API, to reduce the chance of unintentionally changing anything,
                                // so lets create a slimmed down version with only what we need
                                let slimPost = {
                                    authors: [ctx.options.new_author],
                                    id: post.id,
                                    updated_at: post.updated_at
                                };

                                let result = await ctx.api.posts.edit(slimPost);

                                ctx.changed.push(result.url);
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
        },
        {
            title: 'Updating page authors',
            task: async (ctx) => {
                let tasks = [];

                await Promise.mapSeries(ctx.pages, async (post) => {
                    tasks.push({
                        title: `${post.title}`,
                        task: async () => {
                            try {
                                // We only want to send minimal data to the API, to reduce the chance of unintentionally changing anything,
                                // so lets create a slimmed down version with only what we need
                                let slimPost = {
                                    authors: [ctx.options.new_author],
                                    id: post.id,
                                    updated_at: post.updated_at
                                };

                                let result = await ctx.api.pages.edit(slimPost);

                                ctx.changed.push(result.url);
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

module.exports.getTaskRunner = (options) => {
    let tasks = [];

    tasks = this.getFullTaskList(options);

    return makeTaskRunner(tasks, Object.assign({topLevel: true}, options));
};
