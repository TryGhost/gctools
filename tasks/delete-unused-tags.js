import GhostAdminAPI from '@tryghost/admin-api';
import { makeTaskRunner } from '@tryghost/listr-smart-renderer';
import _ from 'lodash';
import Table from 'tty-table';
import { discover } from '../lib/batch-ghost-discover.js';
import { sleep } from '../lib/utils.js';

const initialise = (options) => {
    return {
        title: 'Initialising API connection',
        task: (ctx, task) => {
            let defaults = {
                verbose: false,
                tag: false,
                maxPostCount: 0,
                delayBetweenCalls: 50,
            };

            const url = options.apiURL.replace(/\/$/, '');
            const key = options.adminAPIKey;
            const api = new GhostAdminAPI({
                url: url.replace('localhost', '127.0.0.1'),
                key,
                version: 'v5.0',
            });

            ctx.args = _.mergeWith(defaults, options);
            ctx.args.dryRun = Boolean(options.dryRun || options['dry-run']);
            ctx.api = api;
            ctx.tags = [];
            ctx.tagsToDelete = [];
            ctx.deleted = [];
            ctx.previewTable = '';

            task.output = `Initialised API connection for ${options.apiURL}`;
        },
    };
};

const getFullTaskList = (options) => {
    return [
        initialise(options),
        {
            title: 'Fetch tags from Ghost API',
            task: async (ctx, task) => {
                ctx.tags = await discover({
                    api: ctx.api,
                    type: 'tags',
                });

                task.output = `Found ${ctx.tags.length} tags`;
            },
        },
        {
            title: 'Finding tags with no posts',
            task: async (ctx, task) => {
                ctx.tagsToDelete = ctx.tags.filter((item) => {
                    return item.count.posts <= ctx.args.maxPostCount;
                });
                task.output = `Found ${ctx.tagsToDelete.length} tags with low or no posts`;
            },
        },
        {
            title:
                options.dryRun || options['dry-run']
                    ? 'Preparing deletion preview'
                    : 'Deleting tags from Ghost',
            task: async (ctx) => {
                if (ctx.args.dryRun) {
                    ctx.previewTable = Table(
                        [
                            { value: 'Tag', width: '40%' },
                            { value: 'Slug', width: '40%' },
                            { value: 'Post count', width: '20%', align: 'right' },
                        ],
                        ctx.tagsToDelete.map((tag) => [tag.name, tag.slug, tag.count.posts]),
                        {
                            compact: true,
                            align: 'left',
                            headerAlign: 'left',
                            truncate: false,
                        },
                    ).render();
                    return;
                }

                const tasks = ctx.tagsToDelete.map((tag) => ({
                    title: `${tag.name}`,
                    task: async () => {
                        try {
                            let result = await ctx.api.tags.delete({ id: tag.id });
                            ctx.deleted.push(result.name);
                            await sleep(ctx.args.delayBetweenCalls);
                            return result;
                        } catch (error) {
                            error.resource = {
                                name: tag.name,
                            };
                            ctx.errors.push(error);
                            throw error;
                        }
                    },
                }));

                return makeTaskRunner(tasks, { ...options, concurrent: 3 });
            },
        },
    ];
};

const getTaskRunner = (options) => {
    let tasks = [];

    tasks = getFullTaskList(options);

    return makeTaskRunner(tasks, Object.assign({ topLevel: true }, options));
};

export default {
    initialise,
    getFullTaskList,
    getTaskRunner,
};
