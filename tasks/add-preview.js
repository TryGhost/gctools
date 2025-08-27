import Promise from 'bluebird';
import GhostAdminAPI from '@tryghost/admin-api';
import {makeTaskRunner} from '@tryghost/listr-smart-renderer';
import _ from 'lodash';
import {transformToCommaString} from '../lib/utils.js';
import {discover} from '../lib/batch-ghost-discover.js';
import errors from '@tryghost/errors';

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

            ctx.args = _.mergeWith(defaults, options);
            ctx.api = api;
            ctx.posts = [];
            ctx.updated = [];

            ctx.previewPosition = null;
            ctx.previewPositionType = null;

            // If options.previewPosition contains a percent character
            if (options.previewPosition.includes('%')) {
                ctx.previewPositionType = 'percentage';
                ctx.previewPosition = parseFloat(options.previewPosition.replace('%', ''));
            } else {
                ctx.previewPositionType = 'index';
                ctx.previewPosition = parseInt(options.previewPosition);
            }

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
                    type: 'posts',
                    formats: 'mobiledoc,lexical',
                    filter: discoveryFilter.join('+') // Combine filters, so it's posts by author AND tag, not posts by author OR tag
                };

                try {
                    ctx.posts = await discover(discoveryOptions);
                    task.output = `Found ${ctx.posts.length} posts`;
                } catch (error) {
                    ctx.errors.push(error);
                    throw error;
                }
            }
        },
        {
            title: 'Adding previews to posts',
            task: async (ctx) => {
                let tasks = [];

                await Promise.mapSeries(ctx.posts, async (post) => {
                    const isMobiledoc = post.mobiledoc ?? false;
                    const isLexical = post.lexical ?? false;

                    if (isMobiledoc) {
                        throw new errors.IncorrectUsageError({message: 'Mobiledoc is not supported yet. Convert post to Lexical.'});
                    } else if (isLexical) {
                        let updatedLexical = JSON.parse(post.lexical);

                        const hasPaywallCard = Object.entries(updatedLexical.root.children).some((item) => {
                            const [, value] = item;
                            return value.type === 'paywall';
                        });

                        tasks.push({
                            title: `${post.title}`,
                            skip: () => {
                                if (hasPaywallCard) {
                                    return `${post.title} (${post.slug}) already has a paywall card`;
                                }
                            },
                            task: async () => {
                                if (ctx.previewPositionType === 'percentage') {
                                    const childrenLength = updatedLexical.root.children.length;
                                    const percentageAsDecimal = ctx.previewPosition / 100;
                                    ctx.previewPosition = Math.floor(childrenLength * percentageAsDecimal) + 1;
                                }

                                updatedLexical.root.children.splice(ctx.previewPosition, 0, {type: 'paywall', version: 1});

                                updatedLexical = JSON.stringify(updatedLexical, null, 2);

                                try {
                                    let result = await ctx.api.posts.edit({
                                        id: post.id,
                                        updated_at: post.updated_at,
                                        lexical: updatedLexical
                                    });

                                    ctx.updated.push(result.url);
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
                    }
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

    return makeTaskRunner(tasks, Object.assign({topLevel: true}, options));
};

export default {
    initialise,
    getFullTaskList,
    getTaskRunner
};
