import Promise from 'bluebird';
import GhostAdminAPI from '@tryghost/admin-api';
import {makeTaskRunner} from '@tryghost/listr-smart-renderer';
import errors from '@tryghost/errors';
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
            ctx.tags = [];
            ctx.updated = [];

            task.output = `Initialised API connection for ${options.apiURL}`;
        }
    };
};

const getFullTaskList = (options) => {
    return [
        initialise(options),
        {
            title: 'Fetch tag data',
            task: async (ctx, task) => {
                try {
                    ctx.tags = await discover({
                        api: ctx.api,
                        type: 'tags'
                    });
                    task.output = `Found ${ctx.tags.length} tags`;
                } catch (error) {
                    ctx.errors.push(error);
                    throw error;
                }
            }
        },
        {
            title: 'Fetch posts with Tag B',
            task: async (ctx, task) => {
                // Resolve tagA and tagB - they could be slug strings (CLI) or objects (interactive)
                const tagASlug = typeof ctx.args.tagA === 'string' ? ctx.args.tagA : ctx.args.tagA.slug;
                const tagBSlug = typeof ctx.args.tagB === 'string' ? ctx.args.tagB : ctx.args.tagB.slug;

                ctx.tagAObject = _.find(ctx.tags, {slug: tagASlug});
                ctx.tagBSlug = tagBSlug;

                if (!ctx.tagAObject) {
                    throw new errors.NotFoundError({message: `Tag with slug '${tagASlug}' not found`});
                }

                let postDiscoveryOptions = {
                    api: ctx.api,
                    type: 'posts',
                    limit: 100,
                    include: 'tags',
                    fields: 'id,title,slug,visibility,updated_at',
                    filter: `tags:[${tagBSlug}]`
                };

                try {
                    ctx.posts = await discover(postDiscoveryOptions);
                    task.output = `Found ${ctx.posts.length} posts with tag '${tagBSlug}'`;
                } catch (error) {
                    ctx.errors.push(error);
                    throw error;
                }
            }
        },
        {
            title: 'Merging tags on posts',
            skip: (ctx) => {
                return ctx.posts.length === 0;
            },
            task: async (ctx) => {
                let tasks = [];

                ctx.posts.forEach((post) => {
                    tasks.push({
                        title: post.title,
                        task: async () => {
                            try {
                                // Re-read post for latest updated_at and current tags
                                let currentPost = await ctx.api.posts.read({id: post.id, include: 'tags'});

                                let updatedTags = [...currentPost.tags];
                                const tagBIndex = updatedTags.findIndex((t) => {
                                    return t.slug === ctx.tagBSlug;
                                });
                                const hasTagA = updatedTags.some((t) => {
                                    return t.slug === ctx.tagAObject.slug;
                                });

                                if (tagBIndex >= 0) {
                                    if (hasTagA) {
                                        // Post has both tags: just remove Tag B
                                        updatedTags.splice(tagBIndex, 1);
                                    } else {
                                        // Post has Tag B but not Tag A: replace Tag B with Tag A at same position
                                        updatedTags[tagBIndex] = ctx.tagAObject;
                                    }
                                }

                                let result = await ctx.api.posts.edit({
                                    id: post.id,
                                    updated_at: currentPost.updated_at,
                                    tags: updatedTags
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
