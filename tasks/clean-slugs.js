import Promise from 'bluebird';
import GhostAdminAPI from '@tryghost/admin-api';
import {makeTaskRunner} from '@tryghost/listr-smart-renderer';

import {ui} from '@tryghost/pretty-cli';
import _ from 'lodash';
import {discover} from '../lib/batch-ghost-discover.js';

const initialise = (options) => {
    return {
        title: 'Initialising API connection',
        task: (ctx, task) => {
            let defaults = {
                verbose: false,
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
            ctx.postsWithIds = [];
            ctx.updated = [];

            // Regex to match alphanumeric IDs at the end of slugs (24+ characters)
            // This matches strings like "684a32da145d7d001be71b4f" at the end of slugs
            ctx.idRegex = /-([a-f0-9]{24,})$/i;

            task.output = `Initialised API connection for ${options.apiURL}`;
        }
    };
};

const getFullTaskList = (options) => {
    return [
        initialise(options),
        {
            title: 'Fetch Posts from Ghost API',
            task: async (ctx, task) => {
                try {
                    ctx.posts = await discover({
                        api: ctx.api,
                        type: 'posts',
                        include: 'tags,authors'
                    });

                    task.output = `Found ${ctx.posts.length} posts`;
                } catch (error) {
                    ctx.errors.push(error);
                    throw error;
                }
            }
        },
        {
            title: 'Finding posts with IDs in slugs',
            task: async (ctx, task) => {
                ctx.postsWithIds = ctx.posts.filter((post) => {
                    if (post.slug && ctx.idRegex.test(post.slug)) {
                        const match = post.slug.match(ctx.idRegex);
                        post.extractedId = match[1];
                        post.cleanSlug = post.slug.replace(ctx.idRegex, '');
                        return true;
                    }
                    return false;
                });

                task.output = `Found ${ctx.postsWithIds.length} posts with IDs in slugs`;

                if (ctx.postsWithIds.length === 0) {
                    task.output = 'No posts found with IDs in slugs';
                    return;
                }

                // Display the posts found
                if (ctx.args.verbose || ctx.postsWithIds.length <= 20) {
                    ui.log.info('\nPosts with IDs in slugs:');
                    ctx.postsWithIds.forEach((post) => {
                        ui.log.info(`  • "${post.title}"`);
                        ui.log.info(`    Current slug: ${post.slug}`);
                        ui.log.info(`    Clean slug: ${post.cleanSlug}`);
                        ui.log.info(`    Extracted ID: ${post.extractedId}`);
                        ui.log.info('');
                    });
                } else {
                    ui.log.info(`\nFound ${ctx.postsWithIds.length} posts with IDs in slugs. Use --verbose to see full list.`);
                    ui.log.info('\nFirst 5 examples:');
                    ctx.postsWithIds.slice(0, 5).forEach((post) => {
                        ui.log.info(`  • "${post.title}": ${post.slug} → ${post.cleanSlug}`);
                    });
                }
            }
        },

        {
            title: 'Cleaning slugs',
            skip: ctx => ctx.postsWithIds.length === 0,
            task: async (ctx) => {
                if (ctx.args['dry-run']) {
                    ctx.updated = ctx.postsWithIds;
                    ui.log.info('\n[DRY RUN] Would update the following slugs:');
                    ctx.postsWithIds.forEach((post) => {
                        ui.log.info(`  • "${post.title}": ${post.slug} → ${post.cleanSlug}`);
                    });
                    return;
                }

                let tasks = [];

                await Promise.mapSeries(ctx.postsWithIds, async (post) => {
                    tasks.push({
                        title: `Updating "${post.title}": ${post.slug} → ${post.cleanSlug}`,
                        task: async () => {
                            try {
                                // Update the post with the clean slug
                                const updatedPost = {
                                    id: post.id,
                                    slug: post.cleanSlug,
                                    updated_at: post.updated_at
                                };

                                let result = await ctx.api.posts.edit(updatedPost);
                                ctx.updated.push(result);
                                return Promise.delay(ctx.args.delayBetweenCalls).return(result);
                            } catch (error) {
                                error.resource = {
                                    title: post.title,
                                    slug: post.slug
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