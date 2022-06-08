import Promise from 'bluebird';
import GhostAdminAPI from '@tryghost/admin-api';
import makeTaskRunner from '../lib/task-runner.js';
import _ from 'lodash';
import {transformToCommaString} from '../lib/utils.js';
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

            const url = options.apiURL;
            const key = options.adminAPIKey;
            const api = new GhostAdminAPI({
                url,
                key,
                version: 'v5.0'
            });

            ctx.args = _.mergeWith(defaults, options);
            ctx.api = api;
            ctx.posts = [];
            ctx.updated = [];

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
                    formats: 'html,mobiledoc',
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
                    let updatedMobiledoc = JSON.parse(post.mobiledoc);

                    const hasPaywallCard = Object.keys(updatedMobiledoc.cards).some((key) => {
                        return updatedMobiledoc.cards[key][0] === 'paywall';
                    });

                    tasks.push({
                        title: `${post.title}`,
                        skip: () => {
                            if (hasPaywallCard) {
                                return `${post.title} (${post.slug}) already has a paywall card`;
                            }
                        },
                        task: async () => {
                            const newCardsLength = updatedMobiledoc.cards.push(['paywall', {}]);
                            const paywallCardIndex = newCardsLength - 1;
                            const sectionsBeforePaywall = updatedMobiledoc.sections.slice(0, options.previewPosition);
                            const sectionsAfterPaywall = updatedMobiledoc.sections.slice(options.previewPosition);

                            updatedMobiledoc.sections = [];
                            updatedMobiledoc.sections.push(...sectionsBeforePaywall);
                            updatedMobiledoc.sections.push(...[[10, paywallCardIndex]]); // `10` signifies this is a card
                            updatedMobiledoc.sections.push(...sectionsAfterPaywall);
                            updatedMobiledoc = JSON.stringify(updatedMobiledoc);

                            try {
                                let result = await ctx.api.posts.edit({
                                    id: post.id,
                                    updated_at: post.updated_at,
                                    mobiledoc: updatedMobiledoc
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
}
