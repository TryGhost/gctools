const Promise = require('bluebird');
const GhostAdminAPI = require('@tryghost/admin-api');
const makeTaskRunner = require('../lib/task-runner');
const _ = require('lodash');
const discover = require('../lib/discover');

module.exports.initialise = (options) => {
    return {
        title: 'Initialising API connection',
        task: (ctx, task) => {
            var defaults = {
                verbose: false,
                delayBetweenCalls: 50
            };

            const url = options.apiURL;
            const key = options.adminAPIKey;
            const api = new GhostAdminAPI({
                url,
                key,
                version: 'v3'
            });

            ctx.options = _.mergeWith(defaults, options);

            // NOTE: In the future, adding `users` into this means adding 'profile_image', 'cover_image' to this array
            ctx.options.where = ['mobiledoc', 'html', 'excerpt', 'feature_image', 'og_image', 'twitter_image'];

            ctx.api = api;

            ctx.posts = [];
            ctx.postsToUpdate = [];

            ctx.pages = [];
            ctx.pagesToUpdate = [];

            ctx.tags = [];
            ctx.tagsToUpdate = [];

            ctx.updated = [];
            ctx.regex = new RegExp(ctx.options.find, 'g');

            task.output = `Initialised API connection for ${options.apiURL}`;
        }
    };
};

function cleanPostObject(post) {
    delete post.matches;
    delete post.url;
    delete post.authors;
    delete post.primary_author;
    delete post.primary_tag;
    delete post.tags;
    delete post.slug;
    delete post.comment_id;
    delete post.featured;
    delete post.status;
    delete post.visibility;
    delete post.codeinjection_head;
    delete post.codeinjection_foot;
    delete post.custom_template;
    delete post.canonical_url;
    delete post.og_title;
    delete post.og_description;
    delete post.twitter_title;
    delete post.twitter_description;
    delete post.meta_title;
    delete post.meta_description;
    delete post.uuid;
    delete post.email;
    delete post.bio;
    delete post.website;
    delete post.location;
    delete post.facebook;
    delete post.twitter;
    delete post.accessibility;
    delete post.tour;
    delete post.last_seen;
    delete post.created_at;

    return post;
}

async function findMatches(ctx, posts) {
    let results = [];

    await Promise.mapSeries(posts, async (post) => {
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
            results.push(post);
        }
    });

    return results;
}

async function createReplacementTasks(ctx, options, endpoint, posts) {
    let tasks = [];

    await Promise.mapSeries(posts, async (post) => {
        tasks.push({
            title: `Replacing ${post.matches.length} matches in "${post.title || post.name}": ${post.url}`,
            task: async () => {
                ctx.options.where.forEach((key) => {
                    if (post[key]) {
                        post[key] = post[key].replace(ctx.regex, ctx.options.replace);
                    }
                });

                // Clean the object of values we don't need or want to send
                post = cleanPostObject(post);

                try {
                    let result = await endpoint.edit(post);
                    ctx.updated.push(result.url);
                    return Promise.delay(options.delayBetweenCalls).return(result);
                } catch (error) {
                    error.resource = {
                        title: post.title || post.name
                    };
                    ctx.errors.push(error);
                    throw error;
                }
            }
        });
    });

    return tasks;
}

module.exports.getFullTaskList = (options) => {
    return [
        this.initialise(options),
        {
            title: 'Fetch Content from Ghost API',
            task: async (ctx, task) => {
                try {
                    ctx.posts = await discover('posts', ctx);
                    ctx.pages = await discover('pages', ctx);
                    ctx.tags = await discover('tags', ctx);
                    task.output = `Found ${ctx.posts.length} posts, ${ctx.pages.length} pages, ${ctx.tags.length} tags`;
                } catch (error) {
                    ctx.errors.push(error);
                    throw error;
                }
            }
        },
        {
            title: 'Finding Post matches',
            task: async (ctx) => {
                ctx.postsToUpdate = await findMatches(ctx, ctx.posts);
            }
        },
        {
            title: 'Finding Page matches',
            task: async (ctx) => {
                ctx.pagesToUpdate = await findMatches(ctx, ctx.pages);
            }
        },
        {
            title: 'Finding Tag matches',
            task: async (ctx) => {
                ctx.tagsToUpdate = await findMatches(ctx, ctx.tags);
            }
        },
        {
            title: 'Info',
            enabled: () => options.info,
            task: (ctx, task) => {
                task.output = `Found ${ctx.postsToUpdate.length} posts, ${ctx.pagesToUpdate.length} pages, and ${ctx.tagsToUpdate.length} tags to update`;
                return true;
            }
        },
        {
            title: 'Replacing image paths in Posts',
            enabled: () => options.info === false,
            task: async (ctx) => {
                let tasks = await createReplacementTasks(ctx, options, ctx.api.posts, ctx.postsToUpdate);
                let taskOptions = options;
                taskOptions.concurrent = 3;
                return makeTaskRunner(tasks, taskOptions);
            }
        },
        {
            title: 'Replacing image paths in Pages',
            enabled: () => options.info === false,
            task: async (ctx) => {
                let tasks = await createReplacementTasks(ctx, options, ctx.api.pages, ctx.pagesToUpdate);
                let taskOptions = options;
                taskOptions.concurrent = 3;
                return makeTaskRunner(tasks, taskOptions);
            }
        },
        {
            title: 'Replacing image paths in Tags',
            enabled: () => options.info === false,
            task: async (ctx) => {
                let tasks = await createReplacementTasks(ctx, options, ctx.api.tags, ctx.tagsToUpdate);
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
