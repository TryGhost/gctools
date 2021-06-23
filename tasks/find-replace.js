const Promise = require('bluebird');
const GhostAdminAPI = require('@tryghost/admin-api');
const makeTaskRunner = require('../lib/task-runner');
const _ = require('lodash');
const discover = require('../lib/discover');

module.exports.initialise = (options) => {
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
                version: 'v2'
            });

            ctx.options = _.mergeWith(defaults, options);
            ctx.api = api;
            ctx.posts = [];
            ctx.toUpdate = [];
            ctx.updated = [];
            ctx.regex = new RegExp(ctx.options.find, 'g');

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
                    ctx.posts = await discover('posts', ctx);
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

                    ctx.options.where.forEach((key) => {
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
                            ctx.options.where.forEach((key) => {
                                if (post[key]) {
                                    post[key] = post[key].replace(ctx.regex, ctx.options.replace);
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

module.exports.getTaskRunner = (options) => {
    let tasks = [];

    tasks = this.getFullTaskList(options);

    return makeTaskRunner(tasks, Object.assign({topLevel: true}, options));
};
