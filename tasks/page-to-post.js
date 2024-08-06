import Promise from 'bluebird';
import _ from 'lodash';
import GhostAdminAPI from '@tryghost/admin-api';
import {makeTaskRunner} from '@tryghost/listr-smart-renderer';
import {discover} from '../lib/batch-ghost-discover.js';

const initialise = (options) => {
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
                url: url.replace('localhost', '127.0.0.1'),
                key,
                version: 'v5.0'
            });

            ctx.args = _.mergeWith(defaults, options);
            ctx.api = api;
            ctx.updated = [];
            ctx.fromTo = [];

            task.output = `Initialised API connection for ${options.apiURL}`;
        }
    };
};

const getFullTaskList = (options) => {
    return [
        initialise(options),
        {
            title: 'Find pages',
            task: async (ctx) => {
                let thePages = null;

                if (ctx.args.id) {
                    thePages = await ctx.api.pages.browse({id: ctx.args.id});
                } else if (ctx.args.tagSlug) {
                    thePages = await discover({
                        api: ctx.api,
                        type: 'pages',
                        filter: `tag:[${ctx.args.tagSlug}]`
                    });
                } else {
                    thePages = await discover({
                        api: ctx.api,
                        type: 'pages'
                    });
                }

                thePages.forEach((page) => {
                    let pageId = page.id;
                    delete page.id;
                    delete page.uuid;

                    ctx.fromTo.push({
                        id: pageId,
                        data: page
                    });
                });
            }
        },
        {
            title: 'Convert pages into posts',
            task: async (ctx) => {
                let tasks = [];

                await Promise.mapSeries(ctx.fromTo, async (item) => {
                    tasks.push({
                        title: `Changing to "${item.data.title}" a post`,
                        task: async () => {
                            try {
                                // First add the post
                                // Is successful (and we get an ID back), delete the page
                                // Use the new ID to update the slug, otherwise we'll get something like `slug-2`

                                let result = await ctx.api.posts.add(item.data);

                                if (result.id) {
                                    await ctx.api.pages.delete({id: item.id});

                                    let updateResult = await ctx.api.posts.edit({
                                        id: result.id,
                                        updated_at: item.data.updated_at,
                                        slug: item.data.slug
                                    });

                                    ctx.updated.push(updateResult);

                                    return Promise.delay(options.delayBetweenCalls).return(updateResult);
                                } else {
                                    ctx.errors.push({
                                        message: 'Failed to create post'
                                    });
                                }
                            } catch (error) {
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
