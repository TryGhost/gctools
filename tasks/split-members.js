import GhostAdminAPI from '@tryghost/admin-api';
import {makeTaskRunner} from '@tryghost/listr-smart-renderer';
import fsUtils from '@tryghost/mg-fs-utils';
import fs from 'fs-extra';
import axios from 'axios';
import _ from 'lodash';
import {discover} from '../lib/batch-ghost-discover.js';
import {apiAuthTokenHeaders, getMemberLabels} from '../lib/admin-api-call.js';
import {sleep} from '../lib/utils.js';

// Accepts either a plain NQL filter (e.g. `status:free`) or a full Ghost Admin
// URL pasted straight from the members screen, e.g.
// `https://example.ghost.io/ghost/#/members?filter=created_at%3A%3C%3D...%2Bstatus%3Afree`
// and returns the decoded NQL filter the Admin API expects.
const parseFilter = (input) => {
    if (!input) {
        return null;
    }

    let value = String(input).trim();

    if (!value.length) {
        return null;
    }

    const match = value.match(/[?&]filter=([^&]+)/);
    if (match) {
        value = match[1];
    }

    try {
        value = decodeURIComponent(value);
    } catch (err) {
        // Not valid percent-encoding — assume it's already a plain filter
    }

    return value;
};

const mapMemberToRow = (member) => {
    return {
        id: member.id,
        email: member.email,
        name: member.name || '',
        note: member.note || '',
        subscribed_to_emails: Boolean(member.newsletters && member.newsletters.length),
        complimentary_plan: member.status === 'comped',
        stripe_customer_id: member.subscriptions?.[0]?.customer?.id || '',
        created_at: member.created_at,
        deleted_at: '',
        labels: member.labels ? member.labels.map(label => label.name).join(', ') : '',
        tiers: member.tiers ? member.tiers.map(tier => tier.name).join(', ') : ''
    };
};

const loadMembers = (options) => {
    return {
        title: 'Loading members',
        task: async (ctx, task) => {
            ctx.membersA = [];
            ctx.membersB = [];

            // Source 1: a members CSV already on disk
            if (options.csvPath) {
                ctx.members = await fsUtils.csv.parseCSV(options.csvPath);
                ctx.source = options.csvPath;
                task.output = `Read ${ctx.members.length} members from ${options.csvPath}`;
                return;
            }

            // Source 2: fetch live from the Ghost Admin API
            const api = new GhostAdminAPI({
                url: options.apiURL.replace('localhost', '127.0.0.1'),
                key: options.adminAPIKey,
                version: 'v5.0'
            });

            const filter = parseFilter(options.filter);

            const members = await discover({
                api,
                type: 'members',
                limit: 100,
                filter: filter || undefined,
                include: 'newsletters,tiers',
                // Show a progress bar while downloading, but only in verbose mode —
                // otherwise it fights the listr spinner for the same line
                progress: options.verbose
            });

            ctx.members = members.map(mapMemberToRow);
            ctx.source = 'Ghost Admin API';
            ctx.filter = filter;
            task.output = `Fetched ${ctx.members.length} members${filter ? ` matching "${filter}"` : ''}`;
        }
    };
};

const sortAndSplit = () => {
    return {
        title: 'Sorting and splitting members',
        task: (ctx, task) => {
            ctx.members.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

            ctx.membersA = ctx.members.filter((member, i) => i % 2 === 0);
            ctx.membersB = ctx.members.filter((member, i) => i % 2 === 1);

            task.output = `Split ${ctx.members.length} members into A (${ctx.membersA.length}) and B (${ctx.membersB.length})`;
        }
    };
};

const writeCSVFiles = (options) => {
    return {
        title: 'Writing CSV files',
        task: async (ctx, task) => {
            const outputDir = options.output || '.';
            const baseName = options.baseName || 'members';

            await fs.ensureDir(outputDir);

            const allPath = `${outputDir}/${baseName}-all.csv`;
            const aPath = `${outputDir}/${baseName}-a.csv`;
            const bPath = `${outputDir}/${baseName}-b.csv`;

            await fs.writeFile(allPath, fsUtils.csv.jsonToCSV(ctx.members));
            await fs.writeFile(aPath, fsUtils.csv.jsonToCSV(ctx.membersA));
            await fs.writeFile(bPath, fsUtils.csv.jsonToCSV(ctx.membersB));

            ctx.outputFiles = {all: allPath, a: aPath, b: bPath};

            task.output = `Wrote ${allPath}, ${aPath}, ${bPath}`;
        }
    };
};

// Resolve the configured label names (or pasted IDs) for groups A and B into
// label IDs the bulk endpoint can use, creating any that don't exist yet.
const resolveLabels = (options) => {
    return {
        title: 'Resolving labels',
        task: async (ctx, task) => {
            ctx.errors = ctx.errors || [];

            const apiURL = options.apiURL.replace('localhost', '127.0.0.1');
            const labelOptions = {...options, apiURL};
            const headers = apiAuthTokenHeaders(labelOptions);

            // Fetch the existing labels once and resolve both groups against it
            const existingLabels = await getMemberLabels(labelOptions);

            const resolve = async (labelValue) => {
                // A 24-char hex value is already a label ID — use it directly
                if (/^[0-9a-f]{24}$/i.test(labelValue)) {
                    return labelValue;
                }

                const found = existingLabels.find(label => label.name === labelValue);
                if (found) {
                    return found.id;
                }

                const response = await axios.post(`${apiURL}/ghost/api/admin/labels/`, {
                    labels: [{name: labelValue}]
                }, {
                    headers: {...headers, 'content-type': 'application/json'}
                });
                const created = response.data.labels[0];
                existingLabels.push(created); // in case both groups share a label
                return created.id;
            };

            ctx.labelAId = await resolve(options.labelA);
            ctx.labelBId = await resolve(options.labelB);

            task.output = `A: "${options.labelA}" → ${ctx.labelAId} · B: "${options.labelB}" → ${ctx.labelBId}`;
        }
    };
};

// Bulk-add label A to every member in group A and label B to group B, in
// chunks of `chunkSize` — each chunk is a single members/bulk request.
const addLabelsToGroups = (options) => {
    return {
        title: 'Adding labels to groups',
        task: (ctx, task) => {
            const apiURL = options.apiURL.replace('localhost', '127.0.0.1');
            const chunkSize = parseInt(options.chunkSize, 10) || 100;

            // Cap the bulk requests at `requestsPerSecond` (default 5) by spacing
            // the start of each one at least minInterval apart. Batches run with
            // concurrent: 1, so a single shared timestamp is all we need.
            const perSecond = Math.max(1, parseInt(options.requestsPerSecond, 10) || 5);
            const minInterval = Math.ceil(1000 / perSecond);
            let lastRequestAt = 0;
            const throttle = async () => {
                const wait = lastRequestAt + minInterval - Date.now();
                if (wait > 0) {
                    await sleep(wait);
                }
                lastRequestAt = Date.now();
            };

            ctx.labelled = {a: 0, b: 0};

            let groups = [
                {key: 'a', name: 'A', members: ctx.membersA, labelId: ctx.labelAId, labelName: options.labelA},
                {key: 'b', name: 'B', members: ctx.membersB, labelId: ctx.labelBId, labelName: options.labelB}
            ];

            let tasks = [];

            for (const group of groups) {
                const ids = group.members.map(member => member.id).filter(Boolean);
                let batches = _.chunk(ids, chunkSize);

                batches.forEach((batch, i) => {
                    tasks.push({
                        title: `Group ${group.name} "${group.labelName}" — batch ${i + 1}/${batches.length} (${batch.length} members)`,
                        task: async () => {
                            await throttle();

                            const headers = apiAuthTokenHeaders(options);
                            const filter = `id:[${batch.map(id => `'${id}'`).join(',')}]`;
                            const url = `${apiURL}/ghost/api/admin/members/bulk/?filter=${encodeURIComponent(filter)}`;

                            try {
                                const response = await axios.put(url, {
                                    bulk: {
                                        action: 'addLabel',
                                        meta: {
                                            label: {
                                                id: group.labelId
                                            }
                                        }
                                    }
                                }, {
                                    headers: {...headers, 'content-type': 'application/json'}
                                });

                                const successful = response.data?.bulk?.meta?.stats?.successful ?? batch.length;
                                ctx.labelled[group.key] += successful;
                            } catch (error) {
                                const message = error.response?.data?.errors?.[0]?.message || error.message;
                                ctx.errors.push(`Group ${group.name} batch ${i + 1}: ${message}`);
                                throw error;
                            }
                        }
                    });
                });
            }

            if (tasks.length === 0) {
                task.output = 'No members with IDs to label';
                return;
            }

            return makeTaskRunner(tasks, {concurrent: 1});
        }
    };
};

const getFullTaskList = (options) => {
    const tasks = [
        loadMembers(options),
        sortAndSplit(),
        writeCSVFiles(options)
    ];

    // Optional, off by default: tag each split group with its own label
    if (options.addLabels) {
        tasks.push(resolveLabels(options));
        tasks.push(addLabelsToGroups(options));
    }

    return tasks;
};

const getTaskRunner = (options) => {
    let tasks = getFullTaskList(options);
    return makeTaskRunner(tasks, Object.assign({topLevel: true}, options));
};

export default {
    parseFilter,
    mapMemberToRow,
    loadMembers,
    resolveLabels,
    addLabelsToGroups,
    getFullTaskList,
    getTaskRunner
};
