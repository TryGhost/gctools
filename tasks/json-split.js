const fsUtils = require('@tryghost/mg-fs-utils');
const fs = require('fs-extra');
const path = require('path');
const _ = require('lodash');
const makeTaskRunner = require('../lib/task-runner');

module.exports.initialise = (options) => {
    return {
        title: 'Initialising Workspace',
        task: (ctx, task) => {
            ctx.options = options;

            ctx.fileCache = new fsUtils.FileCache('json_split');
            ctx.jsonData = [];
            ctx.postChunks = [];
            ctx.newChunks = [];
            ctx.options.file = path.dirname(options.jsonFile);
            ctx.options.destDir = path.dirname(options.jsonFile);
            ctx.options.metaVersion = null;
            ctx.options.metaExportedOn = null;

            if (options.verbose) {
                task.output = `Workspace initialised at ${ctx.fileCache.cacheDir}`;
            }
        }
    };
};

function getPostAuthors(postID, ctx) {
    let thePostsAuthors = [];
    let theUsers = [];

    // Get all authors for each post
    ctx.jsonData.posts_authors.forEach((item) => {
        if (item.post_id === postID) {
            thePostsAuthors.push(item);
        }
    });

    // Get the user data itself
    ctx.jsonData.users.forEach((user) => {
        thePostsAuthors.forEach((author) => {
            if (author.author_id === user.id) {
                theUsers.push(user);
            }
        });
    });

    return {
        posts_authors: thePostsAuthors,
        users: theUsers
    };
}

function getPostTags(postID, ctx) {
    let thePostsTags = [];
    let theTags = [];

    // Get all tag assignments
    ctx.jsonData.posts_tags.forEach((item) => {
        if (item.post_id === postID) {
            thePostsTags.push(item);
        }
    });

    // Get the tag data itself
    ctx.jsonData.tags.forEach((item) => {
        thePostsTags.forEach((tag) => {
            if (item.id === tag.tag_id) {
                theTags.push(item);
            }
        });
    });

    return {
        posts_tags: thePostsTags,
        tags: theTags
    };
}

function getPostMeta(postID, ctx) {
    let thePostsMeta = [];

    // Get all post meta
    ctx.jsonData.posts_meta.forEach((item) => {
        if (item.post_id === postID) {
            thePostsMeta.push(item);
        }
    });

    return {
        posts_meta: thePostsMeta
    };
}

async function createChunkFile(dest, data) {
    await fs.writeFile(dest, JSON.stringify(data, null, 4));
}

module.exports.getFullTaskList = (options) => {
    return [
        this.initialise(options),
        {
            title: 'Reading JSON file',
            task: async (ctx, task) => {
                // 1. Read JSON file and store data
                try {
                    const jsonFileData = await fs.readJson(options.jsonFile);
                    ctx.jsonData = jsonFileData.db[0].data;

                    ctx.options.metaVersion = jsonFileData.db[0].meta.version;
                    ctx.options.metaExportedOn = jsonFileData.db[0].meta.exported_on;

                    task.output = `Found ${ctx.jsonData.posts.length} posts, ${ctx.jsonData.posts_authors.length} posts_authors, ${ctx.jsonData.posts_meta.length} posts_meta, ${ctx.jsonData.posts_tags.length} posts_tags, ${ctx.jsonData.tags.length} tags, ${ctx.jsonData.users.length} users`;
                } catch (error) {
                    ctx.errors.push(error);
                    throw error;
                }
            }
        },
        {
            title: 'Chunking posts',
            task: async (ctx) => {
                // 2. Chunk the posts into smaller groups
                try {
                    ctx.postChunks = _.chunk(ctx.jsonData.posts, options.maxPosts);
                } catch (error) {
                    ctx.errors.push(error);
                    throw error;
                }
            }
        },
        {
            title: 'Adding tags and authors to chunked posts',
            task: async (ctx) => {
                // 3. Add the relevant tags and authors to each chunk
                ctx.postChunks.forEach((chunk) => {
                    let newChunk = {
                        posts: [],
                        posts_authors: [],
                        posts_meta: [],
                        posts_tags: [],
                        tags: [],
                        users: []
                    };

                    chunk.forEach((post) => {
                        const postID = post.id;
                        newChunk.posts.push(post);

                        const postAuthors = getPostAuthors(postID, ctx);
                        newChunk.posts_authors.push(...postAuthors.posts_authors);
                        newChunk.users.push(...postAuthors.users);

                        const postTags = getPostTags(postID, ctx);
                        newChunk.posts_tags.push(...postTags.posts_tags);
                        newChunk.tags.push(...postTags.tags);

                        const postMeta = getPostMeta(postID, ctx);
                        newChunk.posts_meta.push(...postMeta.posts_meta);
                    });

                    // Remove duplicates
                    newChunk.posts_authors = _.uniq(newChunk.posts_authors);
                    newChunk.users = _.uniq(newChunk.users);
                    newChunk.posts_tags = _.uniq(newChunk.posts_tags);
                    newChunk.tags = _.uniq(newChunk.tags);

                    ctx.newChunks.push(newChunk);
                });
            }
        },
        {
            // 4. Save each chunk as its own JSON file
            title: 'Save Post files',
            task: async (ctx) => {
                const destination = `${ctx.options.destDir}/split_json_files`;
                await fs.ensureDir(destination);

                ctx.newChunks.forEach(async (chunk, i) => {
                    const fileNumber = `${i}`.padStart((ctx.newChunks.length.toString().length + 1), '0');

                    const chunkData = {
                        db: [
                            {
                                data: {
                                    ...chunk
                                },
                                meta: {
                                    exported_on: ctx.options.metaExportedOn,
                                    version: ctx.options.metaVersion
                                }
                            }
                        ]
                    };

                    await createChunkFile(`${destination}/posts_${fileNumber}.json`, chunkData);
                });
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
