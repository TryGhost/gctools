const Promise = require('bluebird');
const loremIpsum = require('lorem-ipsum').loremIpsum;
const {titleCase} = require('title-case');
const _ = require('lodash');
const GhostAdminAPI = require('@tryghost/admin-api');
const makeTaskRunner = require('../lib/task-runner');
const {maybeStringToArray, transformToCommaString} = require('../lib/utils');

async function createRandomPost(options) {
    let titleLength = Math.floor(Math.random() * (options.titleMaxLength - options.titleMinLength + 1)) + options.titleMinLength;

    let post = {
        status: options.status,
        visibility: options.visibility,
        title: loremIpsum({
            count: titleLength,
            units: 'words'
        }),
        excerpt: loremIpsum({
            count: 2,
            units: 'sentences'
        }),
        html: loremIpsum({
            count: options.contentCount,
            format: 'html',
            paragraphLowerBound: options.paragraphLowerBound, // Min. number of sentences per paragraph.
            paragraphUpperBound: options.paragraphUpperBound, // Max. number of sentences per paragraph.
            random: Math.random,
            sentenceLowerBound: options.sentenceLowerBound, // Min. number of words per sentence.
            sentenceUpperBound: options.sentenceUpperBound, // Max. number of words per sentence.
            suffix: '\n',
            units: options.contentUnit,
            words: undefined
        }),
        meta_title: loremIpsum({
            count: 4,
            units: 'words'
        }),
        meta_description: loremIpsum({
            count: 2,
            units: 'sentences'
        })
    };

    post.title = titleCase(post.title);

    if (options.author) {
        post.authors = maybeStringToArray(options.author);
    }

    if (options.tag) {
        post.tags = maybeStringToArray(options.tag);
    }

    if (options.dateRange) {
        let startDate = new Date(options.dateRange.start);
        let endDate = new Date(options.dateRange.end);

        const randomDate = new Date(startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime()));

        post.created_at = randomDate;
        post.updated_at = randomDate;
        post.published_at = randomDate;
    }

    return post;
}

module.exports.initialise = (options) => {
    return {
        title: 'Initialising API connection',
        task: (ctx, task) => {
            var defaults = {
                verbose: false,
                count: 10,
                titleMinLength: 3,
                titleMaxLength: 8,
                contentUnit: 'paragraphs',
                contentCount: 10,
                paragraphLowerBound: 3,
                paragraphUpperBound: 7,
                sentenceLowerBound: 3,
                sentenceUpperBound: 15,
                userEmail: false,
                tags: '#gctools',
                status: 'published',
                visibility: 'public',
                dateRange: false,
                delayBetweenCalls: 50
            };

            const url = options.apiURL;
            const key = options.adminAPIKey;
            const api = new GhostAdminAPI({
                url,
                key,
                version: 'v2'
            });

            ctx.options = _.mergeWith(defaults, options);
            ctx.api = api;
            ctx.posts = [];
            ctx.inserted = [];

            task.output = `Initialised API connection for ${options.apiURL}`;
        }
    };
};

module.exports.getFullTaskList = (options) => {
    return [
        this.initialise(options),
        {
            title: 'Creating random posts',
            task: async (ctx) => {
                if (ctx.options.tag) {
                    ctx.options.tag = transformToCommaString(ctx.options.tag, 'name');
                }

                if (ctx.options.author) {
                    ctx.options.author = transformToCommaString(ctx.options.author, 'email');
                }

                _.times(ctx.options.count, () => {
                    let post = createRandomPost(ctx.options);
                    ctx.posts.push(post);
                });
            }
        },
        {
            title: 'Inserting posts into Ghost',
            task: async (ctx) => {
                let tasks = [];

                await Promise.mapSeries(ctx.posts, async (post) => {
                    tasks.push({
                        title: `${post.title}`,
                        task: async () => {
                            try {
                                let result = await ctx.api.posts.add(post, {
                                    source: 'html'
                                });
                                ctx.inserted.push(result.url);
                                return Promise.delay(ctx.options.delayBetweenCalls).return(result);
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

                let taskOptions = ctx.options;
                taskOptions.concurrent = 1;
                return makeTaskRunner(tasks, taskOptions);
            }
        }
    ];
};

module.exports.getTaskRunner = (options) => {
    let tasks = [];

    tasks = this.getFullTaskList(options);

    return makeTaskRunner(tasks, Object.assign({topLevel: true}, options));
};
