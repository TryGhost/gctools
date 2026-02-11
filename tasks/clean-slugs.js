import GhostAdminAPI from '@tryghost/admin-api';
import {makeTaskRunner} from '@tryghost/listr-smart-renderer';

import {ui} from '@tryghost/pretty-cli';
import _ from 'lodash';
import {discover} from '../lib/batch-ghost-discover.js';
import {sleep} from '../lib/utils.js';

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
            ctx.tags = [];
            ctx.tagsWithIds = [];
            ctx.updated = [];
            ctx.updatedTags = [];

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
            title: 'Cleaning post slugs',
            skip: ctx => ctx.postsWithIds.length === 0,
            task: async (ctx) => {
                if (ctx.args['dry-run']) {
                    ctx.updated = ctx.postsWithIds;
                    ui.log.info('\n[DRY RUN] Would update the following post slugs:');
                    ctx.postsWithIds.forEach((post) => {
                        ui.log.info(`  • "${post.title}": ${post.slug} → ${post.cleanSlug}`);
                    });
                    return;
                }

                let tasks = ctx.postsWithIds.map(post => ({
                    title: `Updating "${post.title}": ${post.slug} → ${post.cleanSlug}`,
                    task: async () => {
                        try {
                            const updatedPost = {
                                id: post.id,
                                slug: post.cleanSlug,
                                updated_at: post.updated_at
                            };

                            let result = await ctx.api.posts.edit(updatedPost);
                            ctx.updated.push(result);
                            await sleep(ctx.args.delayBetweenCalls);
                            return result;
                        } catch (error) {
                            error.resource = {
                                title: post.title,
                                slug: post.slug
                            };
                            ctx.errors.push(error);
                            throw error;
                        }
                    }
                }));

                let taskOptions = options;
                taskOptions.concurrent = 3;
                return makeTaskRunner(tasks, taskOptions);
            }
        },
        {
            title: 'Fetch Tags from Ghost API',
            task: async (ctx, task) => {
                try {
                    ctx.tags = await discover({
                        api: ctx.api,
                        type: 'tags'
                    });

                    task.output = `Found ${ctx.tags.length} tags`;
                } catch (error) {
                    ctx.errors.push(error);
                    throw error;
                }
            }
        },
        {
            title: 'Finding tags with IDs in slugs',
            task: async (ctx, task) => {
                ctx.tagsWithIds = ctx.tags.filter((tag) => {
                    if (tag.slug && ctx.idRegex.test(tag.slug)) {
                        const match = tag.slug.match(ctx.idRegex);
                        tag.extractedId = match[1];
                        tag.cleanSlug = tag.slug.replace(ctx.idRegex, '');
                        return true;
                    }
                    return false;
                });

                task.output = `Found ${ctx.tagsWithIds.length} tags with IDs in slugs`;

                if (ctx.tagsWithIds.length === 0) {
                    task.output = 'No tags found with IDs in slugs';
                    return;
                }

                // Display the tags found
                if (ctx.args.verbose || ctx.tagsWithIds.length <= 20) {
                    ui.log.info('\nTags with IDs in slugs:');
                    ctx.tagsWithIds.forEach((tag) => {
                        ui.log.info(`  • "${tag.name}"`);
                        ui.log.info(`    Current slug: ${tag.slug}`);
                        ui.log.info(`    Clean slug: ${tag.cleanSlug}`);
                        ui.log.info(`    Extracted ID: ${tag.extractedId}`);
                        ui.log.info('');
                    });
                } else {
                    ui.log.info(`\nFound ${ctx.tagsWithIds.length} tags with IDs in slugs. Use --verbose to see full list.`);
                    ui.log.info('\nFirst 5 examples:');
                    ctx.tagsWithIds.slice(0, 5).forEach((tag) => {
                        ui.log.info(`  • "${tag.name}": ${tag.slug} → ${tag.cleanSlug}`);
                    });
                }
            }
        },
        {
            title: 'Cleaning tag slugs',
            skip: ctx => ctx.tagsWithIds.length === 0,
            task: async (ctx) => {
                if (ctx.args['dry-run']) {
                    ctx.updatedTags = ctx.tagsWithIds;
                    ui.log.info('\n[DRY RUN] Would update the following tag slugs:');
                    ctx.tagsWithIds.forEach((tag) => {
                        ui.log.info(`  • "${tag.name}": ${tag.slug} → ${tag.cleanSlug}`);
                    });
                    return;
                }

                let tasks = ctx.tagsWithIds.map(tag => ({
                    title: `Updating "${tag.name}": ${tag.slug} → ${tag.cleanSlug}`,
                    task: async () => {
                        try {
                            const updatedTag = {
                                id: tag.id,
                                slug: tag.cleanSlug,
                                updated_at: tag.updated_at
                            };

                            let result = await ctx.api.tags.edit(updatedTag);
                            ctx.updatedTags.push(result);
                            await sleep(ctx.args.delayBetweenCalls);
                            return result;
                        } catch (error) {
                            error.resource = {
                                name: tag.name,
                                slug: tag.slug
                            };
                            ctx.errors.push(error);
                            throw error;
                        }
                    }
                }));

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