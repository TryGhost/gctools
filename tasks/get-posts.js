import fsUtils from '@tryghost/mg-fs-utils';
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
                tag: false,
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

            ctx.fileCache = new fsUtils.FileCache(options.apiURL);
            ctx.args = _.mergeWith(defaults, options);
            ctx.api = api;
            ctx.posts = [];
            ctx.found = 0;

            task.output = `Workspace initialised at ${ctx.fileCache.cacheDir}`;
        }
    };
};

const getFullTaskList = (options) => {
    return [
        initialise(options),
        {
            title: 'Fetch Post Content from Ghost API',
            task: async (ctx, task) => {
                let postDiscoveryOptions = {
                    api: ctx.api,
                    type: 'posts',
                    limit: 100,
                    include: 'tags,authors',
                    progress: (options.verbose) ? true : false
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
            title: 'Saving as JSON file',
            task: async (ctx) => {
                await ctx.fileCache.saveFile(`${ctx.fileCache.tmpDir}/posts.json`, JSON.stringify({posts: ctx.posts}, null, 2));
                ctx.found = ctx.posts.length;
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
