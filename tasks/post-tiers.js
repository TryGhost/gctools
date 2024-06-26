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
            ctx.csvData = null;
            ctx.selectedPosts = [];
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
            task: async (ctx, task) => {
                try {
                    let discoveryFilter = [];

                    if (ctx.args.visibility) {
                        discoveryFilter.push(`visibility:[${ctx.args.visibility}]`);
                    } else if (ctx.args.filterTierId) {
                        discoveryFilter.push(`visibility:[${ctx.args.filterTierId.join(',')}]`);
                    }

                    ctx.posts = await discover({
                        api: ctx.api,
                        type: 'posts',
                        filter: discoveryFilter.join('+')
                    });

                    task.output = `Found ${ctx.posts.length} posts`;
                } catch (error) {
                    ctx.errors.push(error);
                    throw error;
                }
            }
        },
        {
            title: 'Adding tier to posts',
            task: async (ctx) => {
                let tasks = [];

                await Promise.mapSeries(ctx.posts, async (post) => {
                    tasks.push({
                        title: post.title,
                        task: async () => {
                            let newTiersObj = [];

                            let newPostObj = {
                                id: post.id,
                                updated_at: post.updated_at
                            };

                            if (post.visibility === 'tiers') {
                                let theTiers = post.tiers;

                                theTiers.forEach((tier) => {
                                    newTiersObj.push({id: tier.id});
                                });
                            } else if (post.visibility === 'paid') {
                                newPostObj.visibility = 'tiers';
                            }

                            newTiersObj.push({id: ctx.args.addTierId});

                            newPostObj.tiers = newTiersObj;

                            try {
                                let result = await ctx.api.posts.edit(newPostObj);

                                ctx.updated.push(result.url);
                                return Promise.delay(options.delayBetweenCalls).return(result);
                            } catch (error) {
                                ctx.errors.push(error);
                                throw error;
                            }
                        }
                    });
                });

                return makeTaskRunner(tasks, {
                    concurrent: 1,
                    verbose: options.verbose
                });
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
