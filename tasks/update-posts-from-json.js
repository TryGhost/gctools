import Promise from 'bluebird';
import GhostAdminAPI from '@tryghost/admin-api';
import {makeTaskRunner} from '@tryghost/listr-smart-renderer';
import _ from 'lodash';
import fs from 'fs-extra';
import {discover} from '../lib/batch-ghost-discover.js';

const UPDATABLE_FIELDS = [
    {name: 'Title', value: 'title'},
    {name: 'Slug', value: 'slug'},
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
            ctx.updated = [];
            ctx.skipped = [];

            // Generate tag once for the entire batch
            let timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            ctx.editTag = `#edited-${timestamp}`;

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

                ctx.jsonPosts.forEach((jsonPost) => {
                    let ghostPost = ghostPostMap.get(jsonPost.slug);
                    if (ghostPost) {
                        ctx.matched.push({jsonPost, ghostPost});
                    } else {
                        ctx.errors.push({
                            message: `No matching Ghost post found for slug "${jsonPost.slug}"`
                        });
                    }
                });

                let unmatched = ctx.jsonPosts.length - ctx.matched.length;
                task.output = `Matched ${ctx.matched.length} of ${ctx.jsonPosts.length} posts (${unmatched} unmatched)`;
            }
        },
        {
            title: 'Updating posts',
            skip: (ctx) => {
                return ctx.matched.length === 0;
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

                                // Add the edit tag to existing tags
                                let updatedTags = [...ghostPost.tags, {name: ctx.editTag}];
                                editPayload.tags = updatedTags;

                                let result = await ctx.api.posts.edit(editPayload);

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
