import Promise from 'bluebird';
import GhostAdminAPI from '@tryghost/admin-api';
import {makeTaskRunner} from '@tryghost/listr-smart-renderer';
import _ from 'lodash';
import {transformToCommaString} from '../lib/utils.js';
import {discover} from '../lib/batch-ghost-discover.js';

const initialise = (options) => {
    return {
        title: 'Initialising API connection',
        task: async (ctx, task) => {
            let defaults = {
                verbose: false,
                author: false,
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
            ctx.pages = [];
            ctx.changed = [];

            // If the `author` and `new_author` answers are not objects, get an object for each
            if (typeof ctx.args.author !== 'object' && typeof ctx.args.new_author !== 'object') {
                let discoveredAuthors = await discover({
                    api: ctx.api,
                    type: 'users'
                });

                ctx.args.author = _.find(discoveredAuthors, {slug: ctx.args.author});
                ctx.args.new_author = _.find(discoveredAuthors, {slug: ctx.args.new_author});
            }

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
                    let discoveryFilter = [];

                    if (ctx.args.author) {
                        discoveryFilter.push(`author:[${ctx.args.author.slug}]`);
                    }

                    if (ctx.args.tag && ctx.args.tag.length > 0) {
                        discoveryFilter.push(`tags:[${transformToCommaString(ctx.args.tag, 'slug')}]`);
                    }

                    ctx.posts = await discover({
                        api: ctx.api,
                        type: 'posts',
                        filter: discoveryFilter.join('+') // Combine filters, so it's posts by author AND tag, not posts by author OR tag
                    });

                    ctx.pages = await discover({
                        api: ctx.api,
                        type: 'pages',
                        filter: discoveryFilter.join('+') // Combine filters, so it's posts by author AND tag, not posts by author OR tag
                    });

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
                                // Get the current authors
                                let currentAuthors = post.authors;

                                // Loop over them and replace the specified author with the new author
                                // This maintains the author sort order (and primary author)
                                currentAuthors = currentAuthors.map((author) => {
                                    if (author.id === ctx.args.author.id) {
                                        author = ctx.args.new_author;
                                    }
                                    return author;
                                });

                                // Create a minimal object we send back to Ghost
                                let slimPost = {
                                    authors: currentAuthors,
                                    id: post.id,
                                    updated_at: post.updated_at
                                };

                                // And now we send the updated post back to Ghost
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
                taskOptions.concurrent = 1;
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
                                    authors: [ctx.args.new_author],
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
