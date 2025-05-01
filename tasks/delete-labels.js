import Promise from 'bluebird';
import axios from 'axios';
import GhostAdminAPI from '@tryghost/admin-api';
import {makeTaskRunner} from '@tryghost/listr-smart-renderer';
import _ from 'lodash';
import {apiAuthTokenHeaders} from '../lib/admin-api-call.js';
import {getAPIMemberLabels} from '../lib/ghost-api-choices.js';

const initialise = (options) => {
    return {
        title: 'Initialising API connection',
        task: (ctx, task) => {
            let defaults = {
                verbose: false,
                labels: false,
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
            ctx.labels = [];
            ctx.deleted = [];

            task.output = `Initialised API connection for ${options.apiURL}`;
        }
    };
};

const getFullTaskList = (options) => {
    return [
        initialise(options),
        {
            title: 'Fetch labels from Ghost API',
            task: async (ctx) => {
                if (ctx.args.labels[0].id) {
                    ctx.labels = ctx.args.labels;
                } else {
                    const allLabels = await getAPIMemberLabels({returnKey: false, options});

                    ctx.args.labels.forEach((label) => {
                        let labelsObject = allLabels.find((labelObj) => {
                            return labelObj.value.name === label;
                        });

                        if (labelsObject) {
                            ctx.labels.push(labelsObject.value);
                        } else {
                            ctx.errors.push(`No label found for "${label}"`);
                        }
                    });
                }
            }
        },
        {
            title: 'Deleting labels from Ghost',
            skip: (ctx) => {
                return ctx.labels.length === 0;
            },
            task: async (ctx) => {
                let tasks = [];

                const headers = apiAuthTokenHeaders(options);

                await Promise.mapSeries(ctx.labels, async (label) => {
                    tasks.push({
                        title: `Delete label ${label.name}`,
                        task: async () => {
                            let urlString = `${options.apiURL}/ghost/api/admin/labels/${label.id}/`;

                            try {
                                let result = await axios.delete(urlString, {headers});
                                ctx.deleted.push(label.name);
                                return Promise.delay(options.delayBetweenCalls).return(result);
                            } catch (error) {
                                error.resource = {
                                    name: label.name
                                };
                                error.object = label;
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

const getTaskRunner = (options) => {
    let tasks = [];

    tasks = getFullTaskList(options);

    return makeTaskRunner(tasks, Object.assign({topLevel: true}, {...options, verbose: true}));
};

export default {
    initialise,
    getFullTaskList,
    getTaskRunner
};
