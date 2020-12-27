const Promise = require('bluebird');
const GhostAdminAPI = require('@tryghost/admin-api');
const makeTaskRunner = require('../lib/task-runner');
const _ = require('lodash');

async function discover(ctx) {
    let response = null;
    let page = 0;
    let results = [];

    let filterStringParts = new Array();

    if (ctx.tags) {
        filterStringParts.push(`tag:[${ctx.tags}]`);
    }

    if (ctx.authors) {
        filterStringParts.push(`author:[${ctx.authors}]`);
    }

    const filterString = filterStringParts.join('+');

    do {
        response = await ctx.api.posts.browse({
            fields: 'id,title,url',
            limit: 15,
            page: page,
            filter: filterString
        });
        results = results.concat(response);
        page = response.meta.pagination.next;
    } while (response.meta.pagination.next);

    return await results;
}

module.exports.initialise = (options) => {
    return {
        title: 'Initialising API connection',
        task: (ctx, task) => {
            var defaults = {
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
                version: 'v2'
            });

            ctx.options = _.mergeWith(defaults, options);
            ctx.api = api;
            ctx.tags = [];
            ctx.authors = [];
            ctx.posts = [];
            ctx.deleted = [];

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
                    if (typeof ctx.options.tag === 'object') {
                        ctx.tags = ctx.options.tag.join(',');
                    } else {
                        ctx.tags = ctx.options.tag;
                    }

                    if (typeof ctx.options.author === 'object') {
                        ctx.authors = ctx.options.author.join(',');
                    } else {
                        ctx.authors = ctx.options.author;
                    }

                    ctx.posts = await discover(ctx);
                    task.output = `Found ${ctx.posts.length} posts`;
                } catch (error) {
                    ctx.errors.push(error);
                    throw error;
                }
            }
        },
        {
            title: 'Deleting posts from Ghost',
            task: async (ctx) => {
                let tasks = [];

                await Promise.mapSeries(ctx.posts, async (post) => {
                    tasks.push({
                        title: `${post.title}`,
                        task: async () => {
                            try {
                                let result = await ctx.api.posts.delete({id: post.id});
                                ctx.deleted.push(result.url);
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
