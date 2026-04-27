import Promise from 'bluebird';
import GhostAdminAPI from '@tryghost/admin-api';
import {makeTaskRunner} from '@tryghost/listr-smart-renderer';
import _ from 'lodash';
import fs from 'fs-extra';
import {discover} from '../lib/batch-ghost-discover.js';

const UPDATABLE_FIELDS = [
    {name: 'Title', value: 'title'},
    {name: 'Slug', value: 'slug'},
    {name: 'HTML', value: 'html'},
    {name: 'Lexical', value: 'lexical'},
    {name: 'Feature Image', value: 'feature_image'},
    {name: 'Feature Image Alt', value: 'feature_image_alt'},
    {name: 'Feature Image Caption', value: 'feature_image_caption'},
    {name: 'Custom Excerpt', value: 'custom_excerpt'},
    {name: 'Meta Title', value: 'meta_title'},
    {name: 'Meta Description', value: 'meta_description'},
    {name: 'Open Graph Title', value: 'og_title'},
    {name: 'Open Graph Description', value: 'og_description'},
    {name: 'Open Graph Image', value: 'og_image'},
    {name: 'Twitter Title', value: 'twitter_title'},
    {name: 'Twitter Description', value: 'twitter_description'},
    {name: 'Twitter Image', value: 'twitter_image'},
    {name: 'Status', value: 'status'},
    {name: 'Visibility', value: 'visibility'},
    {name: 'Canonical URL', value: 'canonical_url'},
    {name: 'Codeinjection Head', value: 'codeinjection_head'},
    {name: 'Codeinjection Foot', value: 'codeinjection_foot'}
];

const normalizeValue = (val) => {
    if (val === null || val === undefined || val === '') {
        return null;
    }
    return val;
};

const initialise = (options) => {
    return {
        title: 'Initialising API connection',
        task: (ctx, task) => {
            let defaults = {
                verbose: false,
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
            ctx.jsonPosts = [];
            ctx.ghostPosts = [];
            ctx.matched = [];
            ctx.unmatched = [];
            ctx.updated = [];
            ctx.created = [];
            ctx.skipped = [];

            // Generate tag once for the entire batch
            let timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            ctx.editTag = `#edited-${timestamp}`;
            ctx.addedTag = `#added-${timestamp}`;

            task.output = `Initialised API connection for ${options.apiURL}`;
        }
    };
};

const getFullTaskList = (options) => {
    return [
        initialise(options),
        {
            title: 'Reading JSON file',
            task: async (ctx, task) => {
                try {
                    const jsonFileData = await fs.readJson(options.jsonFile.trim());
                    const json = (jsonFileData.data) ? jsonFileData : jsonFileData.db[0];
                    ctx.jsonPosts = json.data.posts;

                    // Build post-id -> author emails map from users + posts_authors join
                    let usersById = new Map();
                    (json.data.users || []).forEach((user) => {
                        usersById.set(user.id, user);
                    });

                    let postAuthors = new Map();
                    (json.data.posts_authors || [])
                        .slice()
                        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
                        .forEach((row) => {
                            let user = usersById.get(row.author_id);
                            if (!user || !user.email) {
                                return;
                            }
                            if (!postAuthors.has(row.post_id)) {
                                postAuthors.set(row.post_id, []);
                            }
                            postAuthors.get(row.post_id).push(user.email);
                        });
                    ctx.postAuthors = postAuthors;

                    // Build post-id -> tags map from tags + posts_tags join
                    let tagsById = new Map();
                    (json.data.tags || []).forEach((tag) => {
                        tagsById.set(tag.id, tag);
                    });

                    let postTags = new Map();
                    (json.data.posts_tags || [])
                        .slice()
                        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
                        .forEach((row) => {
                            let tag = tagsById.get(row.tag_id);
                            if (!tag) {
                                return;
                            }
                            if (!postTags.has(row.post_id)) {
                                postTags.set(row.post_id, []);
                            }
                            postTags.get(row.post_id).push(tag);
                        });
                    ctx.postTags = postTags;

                    task.output = `Found ${ctx.jsonPosts.length} posts in JSON file`;
                } catch (error) {
                    ctx.errors.push(error);
                    throw error;
                }
            }
        },
        {
            title: 'Fetch posts from Ghost API',
            task: async (ctx, task) => {
                let discoveryOptions = {
                    api: ctx.api,
                    type: 'posts',
                    limit: 100,
                    include: 'tags',
                    formats: 'lexical',
                    fields: 'id,url,title,slug,status,visibility,updated_at,feature_image,feature_image_alt,feature_image_caption,custom_excerpt,meta_title,meta_description,og_title,og_description,og_image,twitter_title,twitter_description,twitter_image,canonical_url,codeinjection_head,codeinjection_foot'
                };

                if (options.slug) {
                    discoveryOptions.filter = `slug:${options.slug}`;
                }

                try {
                    ctx.ghostPosts = await discover(discoveryOptions);
                    task.output = `Found ${ctx.ghostPosts.length} posts in Ghost`;
                } catch (error) {
                    ctx.errors.push(error);
                    throw error;
                }
            }
        },
        {
            title: 'Matching posts by slug',
            task: async (ctx, task) => {
                let ghostPostMap = new Map();
                ctx.ghostPosts.forEach((post) => {
                    ghostPostMap.set(post.slug, post);
                });

                let jsonPostsToMatch = ctx.jsonPosts;
                if (options.slug) {
                    jsonPostsToMatch = jsonPostsToMatch.filter(p => p.slug === options.slug);
                }

                jsonPostsToMatch.forEach((jsonPost) => {
                    let ghostPost = ghostPostMap.get(jsonPost.slug);
                    if (ghostPost) {
                        ctx.matched.push({jsonPost, ghostPost});
                    } else if (options.insertMissing) {
                        ctx.unmatched.push(jsonPost);
                    } else {
                        ctx.errors.push({
                            message: `No matching Ghost post found for slug "${jsonPost.slug}"`
                        });
                    }
                });

                let unmatchedCount = jsonPostsToMatch.length - ctx.matched.length;
                task.output = `Matched ${ctx.matched.length} of ${jsonPostsToMatch.length} posts (${unmatchedCount} unmatched)`;
            }
        },
        {
            title: 'Updating posts',
            skip: (ctx) => {
                return options.skipExisting || ctx.matched.length === 0;
            },
            task: async (ctx) => {
                let tasks = [];

                await Promise.mapSeries(ctx.matched, async (pair) => {
                    let {jsonPost, ghostPost} = pair;

                    tasks.push({
                        title: ghostPost.title,
                        task: async (ctx, task) => { // eslint-disable-line no-shadow
                            try {
                                let editPayload = {
                                    id: ghostPost.id,
                                    updated_at: ghostPost.updated_at
                                };

                                let changedFields = [];

                                ctx.args.fields.forEach((field) => {
                                    // Skip if the field is not present in the JSON post
                                    if (jsonPost[field] === undefined) {
                                        return;
                                    }

                                    if (normalizeValue(jsonPost[field]) !== normalizeValue(ghostPost[field])) {
                                        editPayload[field] = jsonPost[field];
                                        changedFields.push(field);
                                    }
                                });

                                if (changedFields.length === 0) {
                                    ctx.skipped.push(ghostPost.title);
                                    return;
                                }

                                if (options.dryRun) {
                                    task.output = `${ghostPost.url} — would update: ${changedFields.join(', ')}`;
                                    ctx.updated.push(ghostPost.url);
                                    return;
                                }

                                let editOptions = {};
                                if (changedFields.includes('html')) {
                                    editOptions.source = 'html';
                                }

                                // Add the edit tag to existing tags
                                let updatedTags = [...ghostPost.tags, {name: ctx.editTag}];
                                editPayload.tags = updatedTags;

                                let result = await ctx.api.posts.edit(editPayload, editOptions);

                                ctx.updated.push(result.url);
                                return Promise.delay(options.delayBetweenCalls).return(result);
                            } catch (error) {
                                error.resource = {
                                    title: ghostPost.title
                                };
                                ctx.errors.push(error);
                                throw error;
                            }
                        }
                    });
                });

                return makeTaskRunner(tasks, {
                    concurrent: 1,
                    verbose: options.verbose
                });
            }
        },
        {
            title: 'Creating missing posts',
            skip: (ctx) => {
                return !options.insertMissing || ctx.unmatched.length === 0;
            },
            task: async (ctx) => {
                let tasks = [];

                await Promise.mapSeries(ctx.unmatched, async (jsonPost) => {
                    tasks.push({
                        title: jsonPost.title || jsonPost.slug,
                        task: async (ctx, task) => { // eslint-disable-line no-shadow
                            try {
                                let addPayload = {
                                    status: 'draft'
                                };

                                ctx.args.fields.forEach((field) => {
                                    if (jsonPost[field] === undefined) {
                                        return;
                                    }
                                    addPayload[field] = jsonPost[field];
                                });

                                // Always include slug so the created post matches the JSON
                                if (jsonPost.slug) {
                                    addPayload.slug = jsonPost.slug;
                                }

                                // Preserve original timestamps from the JSON export
                                if (jsonPost.published_at) {
                                    addPayload.published_at = jsonPost.published_at;
                                }
                                if (jsonPost.created_at) {
                                    addPayload.created_at = jsonPost.created_at;
                                }
                                if (jsonPost.updated_at) {
                                    addPayload.updated_at = jsonPost.updated_at;
                                }

                                // Map authors from JSON export by email
                                let authorEmails = ctx.postAuthors.get(jsonPost.id) || [];
                                if (authorEmails.length > 0) {
                                    addPayload.authors = authorEmails.map(email => ({email}));
                                }

                                if (options.dryRun) {
                                    task.output = `would create: ${addPayload.slug || jsonPost.title}`;
                                    ctx.created.push(addPayload.slug || jsonPost.title);
                                    return;
                                }

                                let postTags = ctx.postTags.get(jsonPost.id) || [];
                                addPayload.tags = [
                                    ...postTags.map(tag => ({name: tag.name, slug: tag.slug})),
                                    {name: ctx.addedTag}
                                ];

                                let addOptions = {};
                                if (addPayload.html) {
                                    addOptions.source = 'html';
                                }

                                let result = await ctx.api.posts.add(addPayload, addOptions);

                                ctx.created.push(result.url);
                                return Promise.delay(options.delayBetweenCalls).return(result);
                            } catch (error) {
                                error.resource = {
                                    title: jsonPost.title || jsonPost.slug
                                };
                                ctx.errors.push(error);
                                throw error;
                            }
                        }
                    });
                });

                return makeTaskRunner(tasks, {
                    concurrent: 1,
                    verbose: options.verbose
                });
            }
        }
    ];
};

const getTaskRunner = (options) => {
    let tasks = getFullTaskList(options);
    return makeTaskRunner(tasks, Object.assign({topLevel: true}, options));
};

export default {
    initialise,
    getFullTaskList,
    getTaskRunner,
    UPDATABLE_FIELDS
};
