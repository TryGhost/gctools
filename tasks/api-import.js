const errors = require('@tryghost/errors');
const Promise = require('bluebird');
const GhostAdminAPI = require('@tryghost/admin-api');
const fs = require('fs-extra');
const path = require('path');
const _ = require('lodash');
const makeTaskRunner = require('../lib/task-runner');

function getPostAuthors(postID, ctx) {
    // Get all authors for a particular post
    const userAssignments = ctx.posts_authors.filter(item => item.post_id === postID);

    let theUsers = [];

    // For each author of a post (there can be multiple authors)
    userAssignments.forEach((item) => {
        let userObject = _.find(ctx.users, {id: item.author_id});

        theUsers.push({
            email: userObject.email
        });
    });

    return {
        users: theUsers
    };
}

function getPostTags(postID, ctx) {
    const tagAssignments = ctx.posts_tags.filter(item => item.post_id === postID);
    let theTags = [];

    tagAssignments.forEach((item) => {
        let thisTagInfo = _.find(ctx.tags, {id: item.tag_id});
        theTags.push({
            name: thisTagInfo.name.replace('&amp;', '&'),
            slug: thisTagInfo.slug.substring(0, 191)
        });
    });

    return {
        tags: theTags
    };
}

function getPostMeta(postID, ctx) {
    let thePostsMeta = [];

    // Get all post meta
    ctx.posts_meta.forEach((item) => {
        if (item.post_id === postID) {
            thePostsMeta.push(item);
        }
    });

    return {
        posts_meta: thePostsMeta
    };
}

async function postExists(post, ctx) {
    let response;

    try {
        if (post.type === 'page') {
            response = await ctx.api.pages.read({slug: post.data.slug});
        } else if (post.type === 'post') {
            response = await ctx.api.posts.read({slug: post.data.slug});
        } else {
            throw new errors.IncorrectUsageError({message: `${post.data.type} is unsupported`});
        }

        await new Promise(r => setTimeout(r, 200));

        if (response && response.uuid) {
            return true;
        }
    } catch (error) {
        await new Promise(r => setTimeout(r, 200));
        return false;
    }
}

module.exports.initialise = (options) => {
    return {
        title: 'Initialising Workspace',
        task: (ctx) => {
            ctx.options = options;

            const url = options.apiURL;
            const key = options.adminAPIKey;

            const api = new GhostAdminAPI({
                url,
                key,
                version: 'v5.5'
            });

            ctx.api = api;

            ctx.jsonData = [];
            ctx.newChunks = [];
            ctx.newPostChunks = [];
            ctx.newPageChunks = [];
            ctx.imageChunks = [];
            ctx.inserted = [];
            ctx.options.file = path.dirname(options.jsonFile);
        }
    };
};

module.exports.getFullTaskList = (options) => {
    return [
        this.initialise(options),
        {
            title: 'Reading JSON file',
            task: async (ctx, task) => {
                // 1. Read JSON file and store data
                try {
                    const jsonFileData = await fs.readJson(options.jsonFile);
                    const jsonData = (jsonFileData.data) ? jsonFileData.data : jsonFileData.db[0].data;

                    ctx.jsonData = jsonData;

                    ctx.posts = jsonData.posts || [];
                    ctx.posts_authors = jsonData.posts_authors || [];
                    ctx.posts_meta = jsonData.posts_meta || [];
                    ctx.posts_tags = jsonData.posts_tags || [];
                    ctx.tags = jsonData.tags || [];
                    ctx.users = jsonData.users || [];

                    task.output = `Found ${ctx.posts.length} posts, ${ctx.posts_authors.length} posts_authors, ${ctx.posts_meta.length} posts_meta, ${ctx.posts_tags.length} posts_tags, ${ctx.tags.length} tags, ${ctx.users.length} users`;
                } catch (error) {
                    ctx.errors.push(error);
                    throw error;
                }
            }
        },
        {
            title: 'Adding tags and authors to chunked posts',
            task: async (ctx) => {
                ctx.posts.forEach((chunk) => {
                    const post = chunk;

                    let newPost = post;

                    const postID = post.id;

                    const postType = post.type;

                    const postMeta = getPostMeta(postID, ctx);
                    let derpPostMeta = postMeta.posts_meta;
                    delete derpPostMeta.post_id;
                    delete derpPostMeta.id;
                    newPost = {...newPost, ...derpPostMeta[0]};

                    const postAuthors = getPostAuthors(postID, ctx);
                    newPost.authors = postAuthors.users;

                    const postTags = getPostTags(postID, ctx);
                    newPost.tags = postTags.tags;

                    newPost.tags.push({
                        slug: 'hash-api-imported',
                        name: '#API-Imported'
                    });

                    if (postType === 'page') {
                        delete newPost.comment_id;
                        delete newPost.email_recipient_filter;
                        delete newPost.uuid;
                        delete newPost.email_subject;
                    }

                    delete newPost.author_id;
                    delete newPost.post_id;
                    delete newPost.html;
                    delete newPost.plaintext;
                    delete newPost.frontmatter;
                    delete newPost.type;
                    delete newPost.featured;
                    delete newPost.email;
                    delete newPost.email_only;
                    delete newPost.email_recipient_filter;
                    delete newPost.locale;

                    if (newPost.created_at) {
                        const createdAtDate = new Date(newPost.created_at);
                        newPost.created_at = createdAtDate.toISOString();
                    }

                    if (newPost.published_at) {
                        const publishedAtDate = new Date(newPost.published_at);
                        newPost.published_at = publishedAtDate.toISOString();
                    }

                    if (newPost.updated_at) {
                        const updatedAtDate = new Date(newPost.updated_at);
                        newPost.updated_at = updatedAtDate.toISOString();
                    }

                    ctx.newChunks.push({
                        data: newPost,
                        type: postType,
                        images: []
                    });
                });
            }
        },
        {
            title: 'Import content',
            task: async (ctx) => {
                let tasks = [];

                await Promise.mapSeries(ctx.newChunks, async (post) => {
                    tasks.push({
                        title: `Import ${post.data.slug}`,
                        skip: async () => {
                            if (options.check_duplicates) {
                                return await postExists(post, ctx);
                            } else {
                                return true;
                            }
                        },
                        task: async (ctx) => {
                            try {
                                let result;

                                if (post.data.og_description) {
                                    post.data.og_description = post.data.og_description.substring(0, 500);
                                }

                                if (post.data.slug) {
                                    post.data.slug = post.data.slug.substring(0, 191);
                                }

                                if (post.type === 'page') {
                                    result = await ctx.api.pages.add(post.data);
                                } else if (post.type === 'post') {
                                    result = await ctx.api.posts.add(post.data);
                                } else {
                                    ctx.errors.push(`${post.data.type} is unsupported`);
                                }

                                ctx.inserted.push(result.url);
                                await new Promise(r => setTimeout(r, 200));
                                return Promise.delay(options.delayBetweenCalls).return(post);
                            } catch (error) {
                                error.resource = {
                                    postData: JSON.stringify(post.data),
                                    moreDetails: JSON.stringify(error.details),
                                    title: `Can't add ${post.data.title} (${post.data.slug})`
                                };
                                ctx.errors.push(error);
                            }
                        }
                    });
                });

                // return makeTaskRunner(tasks, options);
                return makeTaskRunner(tasks, {concurrent: 1});
            }
        }
    ];
};

module.exports.getTaskRunner = (options) => {
    let tasks = [];

    tasks = this.getFullTaskList(options);

    // Configure a new Listr task manager, we can use different renderers for different configs
    return makeTaskRunner(tasks, Object.assign({topLevel: true}, options));
};
