import {makeTaskRunner} from '@tryghost/listr-smart-renderer';
import fsUtils from '@tryghost/mg-fs-utils';
import axios from 'axios';
import _ from 'lodash';
import {apiAuthTokenHeaders, getMemberLabels} from '../lib/admin-api-call.js';
import {sleep} from '../lib/utils.js';

const initialise = (options) => {
    return {
        title: 'Initialising',
        task: (ctx) => {
            ctx.options = Object.assign({
                delayBetweenCalls: 50,
                batchSize: 50
            }, options);
            ctx.errors = ctx.errors || [];
            ctx.successful = 0;
            ctx.unsuccessful = 0;
        }
    };
};

const findOrCreateLabel = () => {
    return {
        title: 'Finding label',
        task: async (ctx, task) => {
            // If the label value looks like a hex ID, use it directly
            if (/^[0-9a-f]{24}$/i.test(ctx.options.label)) {
                ctx.labelId = ctx.options.label;
                task.output = `Using label ID directly: ${ctx.labelId}`;
                return;
            }

            const labels = await getMemberLabels(ctx.options);
            const existing = labels.find(l => l.name === ctx.options.label);

            if (existing) {
                ctx.labelId = existing.id;
                task.output = `Found existing label "${ctx.options.label}" (${existing.id})`;
            } else {
                // Create the label via the API
                const headers = apiAuthTokenHeaders(ctx.options);
                const apiURL = ctx.options.apiURL.replace('localhost', '127.0.0.1');
                const response = await axios.post(`${apiURL}/ghost/api/admin/labels/`, {
                    labels: [{name: ctx.options.label}]
                }, {
                    headers: {...headers, 'content-type': 'application/json'}
                });
                ctx.labelId = response.data.labels[0].id;
                task.output = `Created new label "${ctx.options.label}" (${ctx.labelId})`;
            }
        }
    };
};

const readCSV = (options) => {
    return {
        title: 'Reading members CSV',
        task: async (ctx, task) => {
            const members = await fsUtils.csv.parseCSV(options.csvPath);
            ctx.memberIds = members.map(m => m.id).filter(Boolean);
            task.output = `Found ${ctx.memberIds.length} members with IDs`;
        }
    };
};

const addLabelInBatches = () => {
    return {
        title: 'Adding label to members',
        task: async (ctx) => {
            const batches = _.chunk(ctx.memberIds, ctx.options.batchSize);
            const apiURL = ctx.options.apiURL.replace('localhost', '127.0.0.1');

            let tasks = [];

            batches.forEach((batch, i) => {
                tasks.push({
                    title: `Batch ${i + 1} of ${batches.length} (${batch.length} members)`,
                    task: async () => {
                        const headers = apiAuthTokenHeaders(ctx.options);
                        const filter = `id:[${batch.join(',')}]`;
                        const url = `${apiURL}/ghost/api/admin/members/bulk/?filter=${encodeURIComponent(filter)}`;

                        try {
                            const response = await axios.put(url, {
                                bulk: {
                                    action: 'addLabel',
                                    meta: {
                                        label: {
                                            id: ctx.labelId
                                        }
                                    }
                                }
                            }, {
                                headers: {...headers, 'content-type': 'application/json'}
                            });

                            const matched = response.data?.bulk?.meta?.stats?.successful ?? batch.length;
                            const failed = response.data?.bulk?.meta?.stats?.unsuccessful ?? 0;
                            ctx.successful += matched;
                            ctx.unsuccessful += failed;
                        } catch (error) {
                            ctx.unsuccessful += batch.length;
                            const message = error.response?.data?.errors?.[0]?.message || error.message;
                            ctx.errors.push(`Batch ${i + 1}: ${message}`);
                            throw error;
                        } finally {
                            await sleep(ctx.options.delayBetweenCalls);
                        }
                    }
                });
            });

            return makeTaskRunner(tasks, {concurrent: 1});
        }
    };
};

const getFullTaskList = (options) => {
    return [
        initialise(options),
        readCSV(options),
        findOrCreateLabel(),
        addLabelInBatches()
    ];
};

const getTaskRunner = (options) => {
    let tasks = getFullTaskList(options);
    return makeTaskRunner(tasks, Object.assign({topLevel: true}, options));
};

export default {
    initialise,
    getFullTaskList,
    getTaskRunner
};
