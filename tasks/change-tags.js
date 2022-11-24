import path from 'node:path';
import Promise from 'bluebird';
import GhostAdminAPI from '@tryghost/admin-api';
import {makeTaskRunner} from '@tryghost/listr-smart-renderer';
import _ from 'lodash';
import {maybeStringToArray} from '../lib/utils.js';
import {discover} from '../lib/batch-ghost-discover.js';
import fsUtils from '@tryghost/mg-fs-utils';

const initialise = (options) => {
    return {
        title: 'Initialising API connection',
        task: (ctx, task) => {
            let defaults = {
                verbose: false,
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
            ctx.csvData = null;
            ctx.selectedPosts = [];
            ctx.updated = [];

            task.output = `Initialised API connection for ${options.apiURL}`;
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
                    include: 'tags',
                    fields: 'id,title,slug,url,updated_at'
                };

                try {
                    ctx.posts = await discover(postDiscoveryOptions);
                    task.output = `Found ${ctx.posts.length} posts in Ghost`;
                } catch (error) {
                    ctx.errors.push(error);
                    throw error;
                }
            }
        },
        {
            title: 'Read CSV file',
            task: async (ctx, task) => {
                ctx.csvData = await fsUtils.csv.parseCSV(options.csvFile);
                task.output = `Found ${ctx.csvData.length} posts in CSV`;

                ctx.csvData = ctx.csvData.map((item) => {
                    const myURL = new URL(item.url);
                    const parsedPathname = path.parse(myURL.pathname);
                    item.slug = parsedPathname.name;

                    item.delete_tags = maybeStringToArray(item.delete_tags);
                    item.add_tags = maybeStringToArray(item.add_tags);
                    return item;
                });
            }
        },
        {
            title: 'Filter content',
            task: async (ctx, task) => {
                ctx.csvData.forEach((csvPost) => {
                    let foundInGhost = _.find(ctx.posts, {slug: csvPost.slug});

                    if (foundInGhost) {
                        ctx.selectedPosts.push({
                            csvData: csvPost,
                            ghostData: foundInGhost
                        });
                    } else {
                        ctx.errors.push({
                            message: `No live post found for ${csvPost.url}`
                        });
                    }
                });

                task.output = `Found ${ctx.selectedPosts.length} posts wth the same URL in CSV and Ghost`;
            }
        },
        {
            title: 'Changing tags',
            task: async (ctx) => {
                let tasks = [];

                await Promise.mapSeries(ctx.selectedPosts, async (post) => {
                    let csvPost = post.csvData;
                    let ghostPost = post.ghostData;
                    let tagsToDelete = csvPost.delete_tags;
                    let tagsToAdd = csvPost.add_tags.reverse(); // Reverse this, so the first in the list gets added last. This is required for `addAsPrimaryTag` to add the first tag in the array the primary tag

                    tasks.push({
                        title: `${ghostPost.url}`,
                        task: async () => {
                            try {
                                let postTags = ghostPost.tags;

                                let newTags = [];

                                // If `addAsPrimaryTag` is true, delete the tag if it exists, so it can be added as primary instead
                                if (options.addAsPrimaryTag) {
                                    newTags = postTags.filter((item) => {
                                        if (tagsToAdd.includes(item.name)) {
                                            return false;
                                        } else {
                                            return true;
                                        }
                                    });
                                }

                                newTags = postTags.filter((item) => {
                                    if (tagsToDelete.includes(item.name)) {
                                        return false;
                                    } else {
                                        return true;
                                    }
                                });

                                tagsToAdd.forEach((item) => {
                                    if (options.addAsPrimaryTag) {
                                        newTags.unshift(item); // Add to start of tags (i.e. make this the new `primary_tag`)
                                    } else {
                                        newTags.push(item); // Add to end of tags
                                    }
                                });

                                let result = await ctx.api.posts.edit({
                                    id: ghostPost.id,
                                    updated_at: ghostPost.updated_at,
                                    tags: newTags
                                });

                                ctx.updated.push(result.url);
                                return Promise.delay(options.delayBetweenCalls).return(result);
                            } catch (error) {
                                error.resource = {
                                    url: ghostPost.url
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
    let tasks = [];

    tasks = getFullTaskList(options);

    return makeTaskRunner(tasks, Object.assign({topLevel: true}, options));
};

export default {
    initialise,
    getFullTaskList,
    getTaskRunner
};
