import GhostAdminAPI from '@tryghost/admin-api';
import {makeTaskRunner} from '@tryghost/listr-smart-renderer';
import fsUtils from '@tryghost/mg-fs-utils';
import fs from 'fs-extra';
import _ from 'lodash';
import {discover} from '../lib/batch-ghost-discover.js';

function parseFilterFromURL(url) {
    const hashIndex = url.indexOf('#');
    if (hashIndex === -1) {
        return null;
    }
    const hashPart = url.substring(hashIndex + 1);
    const queryIndex = hashPart.indexOf('?');
    if (queryIndex === -1) {
        return null;
    }
    const params = new URLSearchParams(hashPart.substring(queryIndex + 1));
    return params.get('filter');
}

const initialise = (options) => {
    return {
        title: 'Initialising API connection',
        task: (ctx, task) => {
            let defaults = {
                verbose: false,
                output: '.',
                baseName: 'members',
                filter: null,
                filterURL: null
            };

            const url = options.apiURL;
            const key = options.adminAPIKey;
            const api = new GhostAdminAPI({
                url: url.replace('localhost', '127.0.0.1'),
                key,
                version: 'v5.0'
            });

            ctx.api = api;
            ctx.args = _.mergeWith(defaults, options);

            // Parse filter from URL if provided
            if (options.filterURL) {
                ctx.args.filter = parseFilterFromURL(options.filterURL);
            }

            ctx.members = [];
            ctx.membersA = [];
            ctx.membersB = [];

            task.output = `Initialised API connection for ${options.apiURL}`;
        }
    };
};

const fetchMembers = () => {
    return {
        title: 'Fetching members',
        task: async (ctx, task) => {
            try {
                ctx.members = await discover({
                    api: ctx.api,
                    type: 'members',
                    limit: 100,
                    filter: ctx.args.filter || undefined,
                    include: 'labels'
                });

                if (ctx.args.verbose) {
                    task.output = `Found ${ctx.members.length} members`;
                }
            } catch (error) {
                ctx.errors.push(error);
                throw error;
            }
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

function memberToCSVRow(member) {
    return {
        id: member.id,
        email: member.email,
        name: member.name || '',
        note: member.note || '',
        subscribed_to_emails: member.subscribed,
        complimentary_plan: member.comped || false,
        stripe_customer_id: member.stripe_customer_id || '',
        created_at: member.created_at,
        labels: member.labels?.map(l => l.name).join(', ') || ''
    };
}

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

            await fs.writeFile(allPath, fsUtils.csv.jsonToCSV(ctx.members.map(memberToCSVRow)));
            await fs.writeFile(aPath, fsUtils.csv.jsonToCSV(ctx.membersA.map(memberToCSVRow)));
            await fs.writeFile(bPath, fsUtils.csv.jsonToCSV(ctx.membersB.map(memberToCSVRow)));

            task.output = `Wrote ${allPath}, ${aPath}, ${bPath}`;
        }
    };
};

const getFullTaskList = (options) => {
    return [
        initialise(options),
        fetchMembers(options),
        sortAndSplit(),
        writeCSVFiles(options)
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
