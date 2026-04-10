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
            ctx.pages = [];
            ctx.changed = [];

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
                let discoveryFilter = [];

                if (ctx.args.visibility && ctx.args.visibility !== 'all') {
                    discoveryFilter.push(`visibility:[${ctx.args.visibility}]`);
                }

                if (ctx.args.tag && ctx.args.tag.length > 0) {
                    discoveryFilter.push(`tags:[${transformToCommaString(ctx.args.tag, 'slug')}]`);
                }

                if (ctx.args.author && ctx.args.author.length > 0) {
                    discoveryFilter.push(`author:[${transformToCommaString(ctx.args.author, 'slug')}]`);
                }

                let discoveryOptions = {
                    api: ctx.api,
                    type: 'pages',
                    fields: 'id,name,title,slug,url,status,visibility,updated_at',
                    limit: 50,
                    filter: discoveryFilter.join('+') // Combine filters, so it's pages by author AND tag, not pages by author OR tag
                };

                try {
                    ctx.pages = await discover(discoveryOptions);
                    task.output = `Found ${ctx.pages.length} pages`;
                } catch (error) {
                    ctx.errors.push(error);
                    throw error;
                }
            }
        },
        {
            title: 'Updating visibility',
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
                                    visibility: ctx.args.new_visibility,
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
