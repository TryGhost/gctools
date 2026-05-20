import Promise from 'bluebird';
import GhostAdminAPI from '@tryghost/admin-api';
import {makeTaskRunner} from '@tryghost/listr-smart-renderer';
import {ui} from '@tryghost/pretty-cli';
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
                newCanonicalUrl: null,
                dryRun: false,
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
            ctx.toUpdate = [];
            ctx.updated = [];

            task.output = `Initialised API connection for ${options.apiURL}`;
        }
    };
};

// Build the new canonical_url for a given post.
// Returns null when no template is provided (clear mode), otherwise replaces
// the {slug} placeholder in the template with the post's slug.
const buildNewCanonicalUrl = (template, post) => {
    if (!template) {
        return null;
    }
    return template.replace(/\{slug\}/g, post.slug);
};

const getFullTaskList = (options) => {
    const dryRun = options.dryRun === true;

    return [
        initialise(options),
        {
            title: 'Fetch Content from Ghost API',
            task: async (ctx, task) => {
                let discoveryFilter = [];

                if (ctx.args.status && ctx.args.status !== 'all') {
                    discoveryFilter.push(`status:[${ctx.args.status}]`);
                }

                if (ctx.args.visibility && ctx.args.visibility !== 'all') {
                    discoveryFilter.push(`visibility:[${ctx.args.visibility}]`);
                }

                if (ctx.args.tag && ctx.args.tag.length > 0) {
                    discoveryFilter.push(`tags:[${transformToCommaString(ctx.args.tag, 'slug')}]`);
                }

                if (ctx.args.author && ctx.args.author.length > 0) {
                    discoveryFilter.push(`author:[${transformToCommaString(ctx.args.author, 'slug')}]`);
                }

                if (ctx.args.dateRange === 'custom') {
                    discoveryFilter.push(`published_at:>='${ctx.args.dateRangeStart.toISOString().substring(0, 10)}'`);
                    discoveryFilter.push(`published_at:<='${ctx.args.dateRangeEnd.toISOString().substring(0, 10)}'`);
                }

                let discoveryOptions = {
                    api: ctx.api,
                    type: 'posts',
                    fields: 'id,name,title,slug,url,status,visibility,canonical_url,updated_at',
                    limit: 50,
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
            title: 'Computing changes',
            task: async (ctx, task) => {
                ctx.posts.forEach((post) => {
                    const newValue = buildNewCanonicalUrl(ctx.args.newCanonicalUrl, post);
                    const currentValue = post.canonical_url ?? null;

                    // Skip posts where the value would not change. Treat
                    // undefined and null as equivalent for comparison.
                    if (newValue === currentValue) {
                        return;
                    }

                    post.newCanonicalUrl = newValue;
                    post.previousCanonicalUrl = currentValue;
                    ctx.toUpdate.push(post);
                });

                task.output = `${ctx.toUpdate.length} of ${ctx.posts.length} posts will change`;
            }
        },
        {
            title: 'Reporting changes',
            enabled: () => dryRun,
            task: async (ctx, task) => {
                if (ctx.toUpdate.length === 0) {
                    task.title = 'No posts need updating';
                    return;
                }

                if (ctx.args.verbose) {
                    ui.log.info('');
                    for (const post of ctx.toUpdate) {
                        const from = post.previousCanonicalUrl === null ? '(none)' : post.previousCanonicalUrl;
                        const to = post.newCanonicalUrl === null ? '(none)' : post.newCanonicalUrl;
                        ui.log.info(`  ${post.title}: ${from} → ${to}`);
                    }
                    ui.log.info('');
                }

                task.title = `Would update canonical_url on ${ctx.toUpdate.length} posts`;
                task.output = `Re-run without --dryRun to apply changes.`;
            }
        },
        {
            title: 'Updating canonical URLs',
            enabled: () => !dryRun,
            task: async (ctx) => {
                let tasks = [];

                await Promise.mapSeries(ctx.toUpdate, async (post) => {
                    tasks.push({
                        title: `${post.title}`,
                        task: async () => {
                            try {
                                // Send only the minimal fields required to update
                                // canonical_url, matching the pattern used by
                                // change-status / change-visibility-posts.
                                let slimPost = {
                                    canonical_url: post.newCanonicalUrl,
                                    id: post.id,
                                    updated_at: post.updated_at
                                };

                                let result = await ctx.api.posts.edit(slimPost);
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
};
