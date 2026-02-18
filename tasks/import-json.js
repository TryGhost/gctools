import fs from 'fs-extra';
import GhostAdminAPI from '@tryghost/admin-api';
import {makeTaskRunner} from '@tryghost/listr-smart-renderer';
import _ from 'lodash';
import {ui} from '@tryghost/pretty-cli';
import {discover} from '../lib/batch-ghost-discover.js';
import {sleep} from '../lib/utils.js';
import {
    openDatabase,
    refreshCache,
    postExistsBySlug,
    findTagBySlug,
    findUserBySlug,
    findUserByEmail,
    addPost,
    wasSlugImported,
    markSlugImported,
    closeDatabase
} from '../lib/import-db.js';

/**
 * Normalize a date value to ISO 8601 format
 * Handles: ISO strings, Unix timestamps (ms), Date objects
 */
const normalizeDate = (value) => {
    if (!value) {
        return null;
    }

    // Already a valid ISO string
    if (typeof value === 'string' && value.includes('T') && value.includes('Z')) {
        return value;
    }

    // Try to parse as a date
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
        return date.toISOString();
    }

    return null;
};

const initialise = (options) => {
    return {
        title: 'Initialising API connection',
        task: (ctx, task) => {
            let defaults = {
                verbose: false,
                delayBetweenCalls: 50,
                dryRun: false,
                contentType: 'all',
                skipCacheRefresh: false
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
            ctx.db = openDatabase(url, options.jsonFile);
            ctx.imported = [];
            ctx.skipped = [];
            ctx.warnings = [];
            ctx.newPosts = [];
            ctx.duplicatePosts = [];

            task.output = `Initialised API connection for ${options.apiURL}`;
        }
    };
};

const refreshCacheTask = (options) => {
    return {
        title: 'Refreshing content cache from Ghost API',
        skip: (ctx) => {
            if (ctx.args.skipCacheRefresh) {
                return 'Skipping cache refresh (--skipCacheRefresh)';
            }
            return false;
        },
        task: async (ctx, task) => {
            try {
                const counts = await refreshCache(ctx.db, ctx.api, discover, {
                    verbose: ctx.args.verbose
                });
                task.output = `Cached ${counts.posts} posts/pages, ${counts.tags} tags, ${counts.users} users`;
            } catch (error) {
                ctx.errors.push(error);
                throw error;
            }
        }
    };
};

const readJsonFile = (options) => {
    return {
        title: 'Reading JSON import file',
        task: async (ctx, task) => {
            try {
                const jsonPath = options.jsonFile;

                if (!await fs.pathExists(jsonPath)) {
                    throw new Error(`File not found: ${jsonPath}`);
                }

                const fileContent = await fs.readJson(jsonPath);
                ctx.importData = fileContent;

                // Extract the data from Ghost export format
                if (fileContent.db && Array.isArray(fileContent.db) && fileContent.db[0]?.data) {
                    ctx.importData = fileContent.db[0].data;
                } else if (fileContent.data) {
                    ctx.importData = fileContent.data;
                }

                const postCount = ctx.importData.posts?.length || 0;
                task.output = `Read ${postCount} posts from JSON file`;
            } catch (error) {
                ctx.errors.push(error);
                throw error;
            }
        }
    };
};

const buildImportMaps = () => {
    return {
        title: 'Building import data maps',
        task: async (ctx, task) => {
            // Build tag ID to tag object map
            ctx.tagsById = new Map();
            if (ctx.importData.tags) {
                for (const tag of ctx.importData.tags) {
                    ctx.tagsById.set(tag.id, tag);
                }
            }

            // Build user ID to user object map
            ctx.usersById = new Map();
            if (ctx.importData.users) {
                for (const user of ctx.importData.users) {
                    ctx.usersById.set(user.id, user);
                }
            }

            // Build post ID to tag IDs map
            ctx.postsTags = new Map();
            if (ctx.importData.posts_tags) {
                for (const pt of ctx.importData.posts_tags) {
                    if (!ctx.postsTags.has(pt.post_id)) {
                        ctx.postsTags.set(pt.post_id, []);
                    }
                    ctx.postsTags.get(pt.post_id).push(pt.tag_id);
                }
            }

            // Build post ID to author IDs map
            ctx.postsAuthors = new Map();
            if (ctx.importData.posts_authors) {
                for (const pa of ctx.importData.posts_authors) {
                    if (!ctx.postsAuthors.has(pa.post_id)) {
                        ctx.postsAuthors.set(pa.post_id, []);
                    }
                    ctx.postsAuthors.get(pa.post_id).push(pa.author_id);
                }
            }

            // Build post ID to meta data map
            ctx.postsMeta = new Map();
            if (ctx.importData.posts_meta) {
                for (const meta of ctx.importData.posts_meta) {
                    ctx.postsMeta.set(meta.post_id, meta);
                }
            }

            task.output = `Built maps: ${ctx.tagsById.size} tags, ${ctx.usersById.size} users, ${ctx.postsTags.size} post-tag relations, ${ctx.postsAuthors.size} post-author relations, ${ctx.postsMeta.size} post meta`;
        }
    };
};

const analyzeImport = (options) => {
    return {
        title: 'Analyzing import data',
        task: async (ctx, task) => {
            const posts = ctx.importData.posts || [];

            for (const post of posts) {
                // Filter by content type
                const postType = post.type || 'post';
                if (options.contentType !== 'all') {
                    if (options.contentType === 'posts' && postType !== 'post') {
                        continue;
                    }
                    if (options.contentType === 'pages' && postType !== 'page') {
                        continue;
                    }
                }

                // Check if post already exists by slug OR was already imported
                if (postExistsBySlug(ctx.db, post.slug) || wasSlugImported(ctx.db, post.slug)) {
                    ctx.duplicatePosts.push(post);
                } else {
                    ctx.newPosts.push(post);
                }
            }

            task.output = `Found ${ctx.newPosts.length} new posts, ${ctx.duplicatePosts.length} duplicates`;
        }
    };
};

const showImportSummary = () => {
    return {
        title: 'Import Summary',
        task: async (ctx, task) => {
            const summary = [];
            summary.push(`New posts to import: ${ctx.newPosts.length}`);
            summary.push(`Duplicate posts (skipped): ${ctx.duplicatePosts.length}`);

            if (ctx.args.dryRun) {
                summary.push('DRY RUN: No changes will be made');
            }

            task.output = summary.join(' | ');
        }
    };
};

const importPosts = (options) => {
    return {
        title: 'Importing posts',
        skip: (ctx) => {
            if (ctx.newPosts.length === 0) {
                return 'No new posts to import';
            }
            if (ctx.args.dryRun) {
                return 'Dry run mode - skipping import';
            }
            return false;
        },
        task: async (ctx) => {
            let tasks = [];

            for (const post of ctx.newPosts) {
                tasks.push({
                    title: `${post.title}`,
                    task: async (innerCtx, task) => {
                        try {
                            // Resolve tags for this post
                            const tagIds = ctx.postsTags.get(post.id) || [];
                            const resolvedTags = [];

                            for (const tagId of tagIds) {
                                const importTag = ctx.tagsById.get(tagId);
                                if (importTag) {
                                    // Check if tag exists in Ghost
                                    const existingTag = findTagBySlug(ctx.db, importTag.slug);
                                    if (existingTag) {
                                        resolvedTags.push({id: existingTag.id});
                                    } else {
                                        // Tag will be created inline by Ghost
                                        resolvedTags.push({name: importTag.name, slug: importTag.slug});
                                    }
                                }
                            }

                            // Resolve authors for this post
                            const authorIds = ctx.postsAuthors.get(post.id) || [];
                            const resolvedAuthors = [];

                            for (const authorId of authorIds) {
                                const importUser = ctx.usersById.get(authorId);
                                if (importUser) {
                                    // Try to find by slug first, then by email
                                    let existingUser = findUserBySlug(ctx.db, importUser.slug);
                                    if (!existingUser && importUser.email) {
                                        existingUser = findUserByEmail(ctx.db, importUser.email);
                                    }

                                    if (existingUser) {
                                        resolvedAuthors.push({id: existingUser.id});
                                    }
                                }
                            }

                            // Skip post if no HTML content
                            if (!post.html || post.html.trim() === '') {
                                ctx.warnings.push({
                                    post: post.title,
                                    reason: 'No HTML content'
                                });
                                ctx.skipped.push(post);
                                task.skip('No HTML content');
                                return;
                            }

                            // Skip post if no author match
                            if (resolvedAuthors.length === 0) {
                                const authorInfo = authorIds.map(id => {
                                    const u = ctx.usersById.get(id);
                                    return u ? `${u.name || u.slug} (${u.email || 'no email'})` : id;
                                }).join(', ');

                                ctx.warnings.push({
                                    post: post.title,
                                    reason: `No matching author found: ${authorInfo}`
                                });
                                ctx.skipped.push(post);
                                task.skip(`No matching author: ${authorInfo}`);
                                return;
                            }

                            // Prepare post data for import
                            const postData = {
                                title: post.title,
                                slug: post.slug,
                                status: options.importStatus || post.status || 'draft',
                                feature_image: post.feature_image,
                                featured: post.featured,
                                type: post.type || 'post',
                                custom_excerpt: post.custom_excerpt,
                                codeinjection_head: post.codeinjection_head,
                                codeinjection_foot: post.codeinjection_foot,
                                custom_template: post.custom_template,
                                canonical_url: post.canonical_url,
                                tags: resolvedTags,
                                authors: resolvedAuthors
                            };

                            // Normalize date fields to ISO 8601 format
                            const createdAt = normalizeDate(post.created_at);
                            if (createdAt) {
                                postData.created_at = createdAt;
                            }

                            const publishedAt = normalizeDate(post.published_at);
                            if (publishedAt) {
                                postData.published_at = publishedAt;
                            }

                            const updatedAt = normalizeDate(post.updated_at);
                            if (updatedAt) {
                                postData.updated_at = updatedAt;
                            }

                            // Add meta fields from posts_meta table
                            const meta = ctx.postsMeta.get(post.id);
                            if (meta) {
                                if (meta.og_image) {
                                    postData.og_image = meta.og_image;
                                }
                                if (meta.og_title) {
                                    postData.og_title = meta.og_title;
                                }
                                if (meta.og_description) {
                                    postData.og_description = meta.og_description;
                                }
                                if (meta.twitter_image) {
                                    postData.twitter_image = meta.twitter_image;
                                }
                                if (meta.twitter_title) {
                                    postData.twitter_title = meta.twitter_title;
                                }
                                if (meta.twitter_description) {
                                    postData.twitter_description = meta.twitter_description;
                                }
                                if (meta.meta_title) {
                                    postData.meta_title = meta.meta_title;
                                }
                                if (meta.meta_description) {
                                    postData.meta_description = meta.meta_description;
                                }
                                if (meta.email_subject) {
                                    postData.email_subject = meta.email_subject;
                                }
                                if (meta.feature_image_alt) {
                                    postData.feature_image_alt = meta.feature_image_alt;
                                }
                                if (meta.feature_image_caption) {
                                    postData.feature_image_caption = meta.feature_image_caption;
                                }
                            }

                            // Use HTML content with source: html
                            if (post.html) {
                                postData.html = post.html;
                            }

                            // Determine which API to use based on type
                            const apiType = postData.type === 'page' ? 'pages' : 'posts';
                            const result = await ctx.api[apiType].add(postData, {source: 'html'});

                            // Add to cache with actual slug from API
                            addPost(ctx.db, {
                                id: result.id,
                                slug: result.slug,
                                title: result.title,
                                type: result.type || postData.type
                            });

                            // Mark the ORIGINAL JSON slug as imported
                            // so we don't re-import if Ghost changed the slug (e.g., added -2)
                            markSlugImported(ctx.db, post.slug);

                            ctx.imported.push(result);
                            task.output = `Imported: ${result.slug}`;

                            await sleep(ctx.args.delayBetweenCalls);
                        } catch (error) {
                            error.resource = {title: post.title, slug: post.slug};
                            // Log full error details for debugging
                            console.error('\n--- Import Error ---');
                            console.error('Post:', post.title, `(${post.slug})`);
                            console.error('Error:', error.message);
                            if (error.context) {
                                console.error('Context:', error.context);
                            }
                            if (error.details) {
                                console.error('Details:', JSON.stringify(error.details, null, 2));
                            }
                            if (error.response?.data) {
                                console.error('Response:', JSON.stringify(error.response.data, null, 2));
                            }
                            console.error('--------------------\n');
                            ctx.errors.push(error);
                            throw error;
                        }
                    }
                });
            }

            let taskOptions = {concurrent: 1};
            return makeTaskRunner(tasks, taskOptions);
        }
    };
};

const showResults = () => {
    return {
        title: 'Import complete',
        task: async (ctx, task) => {
            const results = [];
            results.push(`Imported: ${ctx.imported.length}`);
            results.push(`Skipped (no author): ${ctx.skipped.length}`);
            results.push(`Duplicates: ${ctx.duplicatePosts.length}`);

            if (ctx.warnings.length > 0) {
                results.push(`Warnings: ${ctx.warnings.length}`);
            }

            task.output = results.join(' | ');
        }
    };
};

const getFullTaskList = (options) => {
    return [
        initialise(options),
        refreshCacheTask(options),
        readJsonFile(options),
        buildImportMaps(),
        analyzeImport(options),
        showImportSummary(),
        importPosts(options),
        showResults()
    ];
};

const getTaskRunner = (options) => {
    let tasks = getFullTaskList(options);
    return makeTaskRunner(tasks, Object.assign({topLevel: true}, options));
};

const cleanup = (ctx) => {
    if (ctx && ctx.db) {
        closeDatabase(ctx.db);
    }
};

const printWarnings = (ctx) => {
    if (ctx.warnings && ctx.warnings.length > 0) {
        ui.log.warn('Posts skipped due to missing authors:');
        for (const warning of ctx.warnings) {
            ui.log.warn(`  - ${warning.post}: ${warning.reason}`);
        }
    }
};

export default {
    initialise,
    getFullTaskList,
    getTaskRunner,
    cleanup,
    printWarnings
};
