import Promise from 'bluebird';
import _ from 'lodash';
import GhostAdminAPI from '@tryghost/admin-api';
import makeTaskRunner from '../lib/task-runner.js';
import {transformToCommaString} from '../lib/utils.js';
import {getRandomPostContent} from '../lib/random-post.js';

const initialise = (options) => {
    return {
        title: 'Initialising API connection',
        task: (ctx, task) => {
            let defaults = {
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
                version: 'v5.0'
            });

            ctx.args = _.mergeWith(defaults, options);
            ctx.api = api;
            ctx.posts = [];
            ctx.inserted = [];

            task.output = `Initialised API connection for ${options.apiURL}`;
        }
    };
};

const getFullTaskList = (options) => {
    return [
        initialise(options),
        {
            title: 'Creating random posts',
            task: async (ctx) => {
                if (ctx.args.tag) {
                    ctx.args.tag = transformToCommaString(ctx.args.tag, 'name');
                }

                if (ctx.args.author) {
                    ctx.args.author = transformToCommaString(ctx.args.author, 'email');
                }

                _.times(ctx.args.count, () => {
                    let post = getRandomPostContent(ctx.args);
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
                                return Promise.delay(ctx.args.delayBetweenCalls).return(result);
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

                let taskOptions = ctx.args;
                taskOptions.concurrent = 1;
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
