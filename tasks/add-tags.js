import Promise from 'bluebird';
import GhostAdminAPI from '@tryghost/admin-api';
import {makeTaskRunner} from '@tryghost/listr-smart-renderer';
import _ from 'lodash';
import {transformToCommaString} from '../lib/utils.js';
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
                url: url.replace('localhost', '127.0.0.1'),
                key,
                version: 'v5.0'
            });

            ctx.args = _.mergeWith(defaults, options);
            ctx.api = api;
            ctx.posts = [];
            ctx.pages = [];
            ctx.updated = [];

            task.output = `Initialised API connection for ${options.apiURL}`;
        }
    };
};

const getFullTaskList = (options) => {
    return [
        initialise(options),
        {
            title: 'Fetch Post Content from Ghost API',
            skip: () => {
                return !options.type.includes('posts') && !options.type.includes('all');
            },
            task: async (ctx, task) => {
                let postDiscoveryFilter = [];

                if (options.customFilter) {
                    postDiscoveryFilter.push(options.customFilter);
                } else {
                    if (ctx.args.visibility && ctx.args.visibility !== 'all') {
                        postDiscoveryFilter.push(`visibility:[${ctx.args.visibility}]`);
                    }

                    if (ctx.args.tag && ctx.args.tag.length > 0) {
                        postDiscoveryFilter.push(`tags:[${transformToCommaString(ctx.args.tag, 'slug')}]`);
                    }

                    if (ctx.args.author && ctx.args.author.length > 0) {
                        postDiscoveryFilter.push(`author:[${transformToCommaString(ctx.args.author, 'slug')}]`);
                    }

                    if (ctx.args.dateFilterStart && ctx.args.dateFilterEnd) {
                        postDiscoveryFilter.push(`published_at:>='${ctx.args.dateFilterStart.toISOString()}'`);
                        postDiscoveryFilter.push(`published_at:<='${ctx.args.dateFilterEnd.toISOString()}'`);
                    }
                }

                let postDiscoveryOptions = {
                    api: ctx.api,
                    type: 'posts',
                    limit: 100,
                    include: 'tags',
                    fields: 'id,title,slug,visibility,updated_at,published_at',
                    filter: postDiscoveryFilter.join('+') // Combine filters, so it's posts by author AND tag, not posts by author OR tag
                };

                try {
                    ctx.posts = await discover(postDiscoveryOptions);
                    task.output = `Found ${ctx.posts.length} posts`;
                } catch (error) {
                    ctx.errors.push(error);
                    throw error;
                }
            }
        },
        {
            title: 'Fetch Page Content from Ghost API',
            skip: () => {
                return !options.type.includes('pages') && !options.type.includes('all');
            },
            task: async (ctx, task) => {
                let pageDiscoveryFilter = [];

                if (options.customFilter) {
                    pageDiscoveryFilter.push(options.customFilter);
                } else {
                    if (ctx.args.visibility && ctx.args.visibility !== 'all') {
                        pageDiscoveryFilter.push(`visibility:[${ctx.args.visibility}]`);
                    }

                    if (ctx.args.tag && ctx.args.tag.length > 0) {
                        pageDiscoveryFilter.push(`tags:[${transformToCommaString(ctx.args.tag, 'slug')}]`);
                    }

                    if (ctx.args.author && ctx.args.author.length > 0) {
                        pageDiscoveryFilter.push(`author:[${transformToCommaString(ctx.args.author, 'slug')}]`);
                    }

                    if (ctx.args.dateFilterStart && ctx.args.dateFilterEnd) {
                        pageDiscoveryFilter.push(`published_at:>='${ctx.args.dateFilterStart.toISOString()}'`);
                        pageDiscoveryFilter.push(`published_at:<='${ctx.args.dateFilterEnd.toISOString()}'`);
                    }
                }

                let pageDiscoveryOptions = {
                    api: ctx.api,
                    type: 'pages',
                    limit: 100,
                    include: 'tags',
                    fields: 'id,title,slug,visibility,updated_at',
                    filter: pageDiscoveryFilter.join('+') // Combine filters, so it's posts by author AND tag, not posts by author OR tag
                };

                try {
                    ctx.pages = await discover(pageDiscoveryOptions);
                    task.output = `Found ${ctx.pages.length} pages`;
                } catch (error) {
                    ctx.errors.push(error);
                    throw error;
                }
            }
        },
        {
            title: 'Adding tags to posts',
            task: async (ctx) => {
                let tasks = [];

                await Promise.mapSeries(ctx.posts, async (post) => {
                    tasks.push({
                        title: `${post.title}`,
                        task: async () => {
                            try {
                                ctx.args.new_tags.forEach((item) => {
                                    post.tags.push(item); // Add to end of tags
                                    // post.tags.unshift(item); // Add to start of tags (i.e. make this the new `primary_tag`)
                                });

                                let result = await ctx.api.posts.edit({
                                    id: post.id,
                                    updated_at: post.updated_at,
                                    tags: post.tags
                                });

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

                let postTaskOptions = options;
                postTaskOptions.concurrent = 1;
                return makeTaskRunner(tasks, postTaskOptions);
            }
        },
        {
            title: 'Adding tags to pages',
            task: async (ctx) => {
                let tasks = [];

                await Promise.mapSeries(ctx.pages, async (page) => {
                    tasks.push({
                        title: `${page.title}`,
                        task: async () => {
                            try {
                                ctx.args.new_tags.forEach((item) => {
                                    page.tags.push(item); // Add to end of tags
                                    // page.tags.unshift(item); // Add to start of tags (i.e. make this the new `primary_tag`)
                                });

                                let result = await ctx.api.pages.edit({
                                    id: page.id,
                                    updated_at: page.updated_at,
                                    tags: page.tags
                                });

                                ctx.updated.push(result.url);
                                return Promise.delay(options.delayBetweenCalls).return(result);
                            } catch (error) {
                                error.resource = {
                                    title: page.title
                                };
                                ctx.errors.push(error);
                                throw error;
                            }
                        }
                    });
                });

                let pageTaskOptions = options;
                pageTaskOptions.concurrent = 1;
                return makeTaskRunner(tasks, pageTaskOptions);
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
