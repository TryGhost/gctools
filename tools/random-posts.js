const Promise = require('bluebird');
const loremIpsum = require('lorem-ipsum').loremIpsum;
const {titleCase} = require('title-case');
const _ = require('lodash');
const GhostAdminAPI = require('@tryghost/admin-api');
const makeTaskRunner = require('../lib/task-runner');

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
            paragraphUpperBound: options.paragraphUpperBound, // Max. number of sentences per paragarph.
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

    if (options.userEmail) {
        post.authors = [options.userEmail];
    }

    if (options.tags) {
        post.tags = options.tags.split(',');
    }

    if (options.dateRange) {
        let dateParts = options.dateRange.split(',');

        let startDate = new Date();
        let startDateParts = dateParts[0].split('-');
        startDate.setDate(startDateParts[0]);
        startDate.setMonth((startDateParts[1] - 1));
        startDate.setYear(startDateParts[2]);

        let endDate = new Date();
        let endDateParts = dateParts[1].split('-');
        endDate.setDate(endDateParts[0]);
        endDate.setMonth((endDateParts[1] - 1));
        endDate.setYear(endDateParts[2]);

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
            const url = options.apiURL;
            const key = options.adminAPIKey;
            const api = new GhostAdminAPI({
                url,
                key,
                version: 'v2'
            });

            ctx.options = options;
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
                _.times(options.count, () => {
                    let post = createRandomPost(options);
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

                let taskOptions = options;
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
