const fs = require('fs-extra');
const Promise = require('bluebird');
const GhostAdminAPI = require('@tryghost/admin-api');
const makeTaskRunner = require('../lib/task-runner');
const _ = require('lodash');
const {discover} = require('../lib/batch-ghost-discover');

module.exports.initialise = (options) => {
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
            ctx.tags = [];
            ctx.updated = [];

            ctx.postGroups = [];

            task.output = `Initialised API connection for ${options.apiURL}`;
        }
    };
};

module.exports.getFullTaskList = (options) => {
    return [
        this.initialise(options),
        {
            title: 'Fetch Post Content from Ghost API',
            task: async (ctx) => {
                const jsonFileData = await fs.readJson(options.jsonFile);

                let targetTags = [];

                jsonFileData.forEach((group) => {
                    targetTags.push(group.target);

                    ctx.postGroups.push({
                        target: group.target,
                        incorporate: group.incorporate,
                        posts: []
                    });
                });
            }
        },
        {
            title: 'Fetch tag data',
            task: async (ctx, task) => {
                let tagDiscoveryOptions = {
                    api: ctx.api,
                    type: 'tags'
                };

                try {
                    ctx.tags = await discover(tagDiscoveryOptions);
                    task.output = `Found ${ctx.tags.length} tags`;
                } catch (error) {
                    ctx.errors.push(error);
                    throw error;
                }
            }
        },
        {
            title: 'Fetch post data',
            task: async (ctx) => {
                let tasks = [];

                ctx.postGroups.forEach((group) => {
                    tasks.push({
                        title: `Fetching posts that will have the '${group.target}' tag added`,
                        task: async (ctx, task) => { // eslint-disable-line no-shadow
                            let postDiscoveryFilter = [];

                            if (group.incorporate && group.incorporate.length > 0) {
                                postDiscoveryFilter.push(`tags:[${group.incorporate.join(',')}]`);
                            }

                            let postDiscoveryOptions = {
                                api: ctx.api,
                                type: 'posts',
                                limit: 100,
                                include: 'tags',
                                fields: 'id,title,slug,visibility,updated_at',
                                filter: postDiscoveryFilter.join('+') // Combine filters, so it's posts by author AND tag, not posts by author OR tag
                            };

                            try {
                                group.posts = await discover(postDiscoveryOptions);
                                task.output = `Found ${group.posts.length} posts`;
                            } catch (error) {
                                ctx.errors.push(error);
                                throw error;
                            }
                        }
                    });
                });

                let postTaskOptions = options;
                postTaskOptions.concurrent = 1;
                return makeTaskRunner(tasks, postTaskOptions);
            }
        },
        {
            title: 'Adding tags to posts',
            task: async (ctx) => {
                let tasks = [];

                ctx.postGroups.forEach((group) => {
                    const groupTarget = group.target;
                    const groupTargetAsName = _.startCase(groupTarget);
                    const groupTargetObject = _.find(ctx.tags, {slug: groupTarget}) || groupTargetAsName;

                    group.posts.forEach((post) => {
                        tasks.push({
                            title: `Adding '${groupTargetAsName}' (${groupTarget}) to ${post.title}`,
                            task: async (ctx) => { // eslint-disable-line no-shadow
                                try {
                                    // The post may have had a tag already added to it, so we need to
                                    // fetch the post data again to get the new `updated_at` value
                                    let currentPost = await ctx.api.posts.read({id: post.id});

                                    let result = await ctx.api.posts.edit({
                                        id: post.id,
                                        updated_at: currentPost.updated_at,
                                        tags: [groupTargetObject,...currentPost.tags]
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
                });

                let tagAddTaskOptions = options;
                tagAddTaskOptions.concurrent = 1;
                return makeTaskRunner(tasks, tagAddTaskOptions);
            }
        }
    ];
};

module.exports.getTaskRunner = (options) => {
    let tasks = [];

    tasks = this.getFullTaskList(options);

    return makeTaskRunner(tasks, Object.assign({topLevel: true}, options));
};
