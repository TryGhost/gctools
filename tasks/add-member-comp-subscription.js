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

            const url = options.apiURL.replace(/\/$/, '');
            const key = options.adminAPIKey;
            const api = new GhostAdminAPI({
                url: url.replace('localhost', '127.0.0.1'),
                key,
                version: 'v5.0'
            });

            ctx.args = _.mergeWith(defaults, options);
            ctx.api = api;
            ctx.updated = [];

            task.output = `Initialised API connection for ${options.apiURL}`;
        }
    };
};

const getFullTaskList = (options) => {
    return [
        initialise(options),
        {
            title: 'Fetch members from Ghost API',
            task: async (ctx, task) => {
                let discoveryFilter = [];

                if (options.onlyForLabelSlugs.length) {
                    discoveryFilter.push(`label:[${options.onlyForLabelSlugs.join(',')}]`);
                }

                let discoveryOptions = {
                    api: ctx.api,
                    type: 'members',
                    filter: discoveryFilter.join('+')
                };

                try {
                    ctx.members = await discover(discoveryOptions);
                    task.output = `Found ${ctx.members.length} members`;
                } catch (error) {
                    ctx.errors.push(error);
                    throw error;
                }
            }
        },
        {
            title: 'Updating members',
            task: async (ctx) => {
                let tasks = [];

                await Promise.mapSeries(ctx.members, async (member) => {
                    tasks.push({
                        title: `Updating ${member.email}`,
                        task: async () => {
                            let newMemberObject = {
                                id: member.id,
                                tiers: [
                                    {
                                        id: options.tierId,
                                        expiry_at: options.expireAt
                                    }
                                ]
                            };

                            try {
                                let result = await ctx.api.members.edit(newMemberObject);
                                ctx.updated.push(result);
                                return Promise.delay(options.delayBetweenCalls).return(result);
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
