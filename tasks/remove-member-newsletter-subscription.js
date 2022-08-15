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
            ctx.newsletters = [];
            ctx.users = [];
            ctx.updated = [];

            task.output = `Initialised API connection for ${options.apiURL}`;
        }
    };
};

module.exports.getFullTaskList = (options) => {
    return [
        this.initialise(options),
        {
            title: 'Fetch Content from Ghost API',
            task: async (ctx, task) => {
                try {
                    ctx.newsletters = await discover({
                        api: ctx.api,
                        type: 'newsletters',
                        limit: 50
                    });
                } catch (error) {
                    ctx.errors.push(error);
                    throw error;
                }

                let thisNewsletterSlug;

                try {
                    const thisNewsletterObj = _.find(ctx.newsletters, {id: options.newsletterID});
                    thisNewsletterSlug = thisNewsletterObj.slug;
                } catch (error) {
                    error.message = `No newsletter found for ${options.newsletterID}`;
                    ctx.errors.push(error);
                    throw error;
                }

                let discoveryOptions = {
                    api: ctx.api,
                    type: 'members',
                    filter: `newsletters:${thisNewsletterSlug}`
                };

                try {
                    ctx.members = await discover(discoveryOptions);
                    task.output = `Found ${ctx.members.length} members`;
                } catch (error) {
                    ctx.errors.push(error);
                    throw error;
                }

                // Filter out members who are not currently subscribed to the given newsletter
                ctx.members = _.filter(ctx.members, (user) => {
                    const isSubscribed = _.find(user.newsletters, {id: options.newsletterID});

                    if (isSubscribed) {
                        return user;
                    }
                });
            }
        },
        {
            title: 'Updating members from Ghost',
            task: async (ctx) => {
                let tasks = [];

                await Promise.mapSeries(ctx.members, async (member) => {
                    tasks.push({
                        title: `Updating ${member.email}`,
                        task: async () => {
                            let newMemberObject = {
                                id: member.id,
                                newsletters: _.filter(member.newsletters, (item) => {
                                    return item.id !== options.newsletterID;
                                })
                            };

                            try {
                                let result = await ctx.api.members.edit(newMemberObject);
                                ctx.updated.push(result);
                                return Promise.delay(options.delayBetweenCalls).return(result);
                            } catch (error) {
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
