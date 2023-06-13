import {dirname, basename} from 'node:path';
import fsUtils from '@tryghost/mg-fs-utils';
import fs from 'fs-extra';
import inquirer from 'inquirer';
import {makeTaskRunner} from '@tryghost/listr-smart-renderer';
import _ from 'lodash';

const initialise = (options) => {
    return {
        title: 'Initialising Workspace',
        task: (ctx, task) => {
            ctx.args = options;

            ctx.fileCache = new fsUtils.FileCache('json_split');
            ctx.jsonData = [];
            ctx.args.file = dirname(options.jsonFile);
            ctx.args.destDir = dirname(options.jsonFile);

            if (options.verbose) {
                task.output = `Workspace initialised at ${ctx.fileCache.cacheDir}`;
            }
        }
    };
};

const getFullTaskList = (options) => {
    return [
        initialise(options),
        {
            title: 'Reading JSON file',
            task: async (ctx) => {
                // 1. Read JSON file and store data
                try {
                    const jsonFileData = await fs.readJson(options.jsonFile);
                    const json = (jsonFileData.data) ? jsonFileData : jsonFileData.db[0];

                    ctx.args.fileNameNoExt = basename(options.jsonFile, '.json');

                    ctx.args.metaVersion = json.meta.version;
                    ctx.args.metaExportedOn = json.meta.exported_on;

                    ctx.jsonData = (jsonFileData.data) ? json.data : json.data;

                    ctx.usersWithNoPosts = [];
                    ctx.usersToUpdate = [];
                } catch (error) {
                    ctx.errors.push(error);
                    throw error;
                }
            }
        },
        {
            title: 'Removing unwanted items',
            task: async (ctx) => {
                delete ctx.jsonData.settings;
                delete ctx.jsonData.custom_theme_settings;
                delete ctx.jsonData.newsletters;
                delete ctx.jsonData.products;
                delete ctx.jsonData.offers;
                delete ctx.jsonData.benefits;
                delete ctx.jsonData.products_benefits;
                delete ctx.jsonData.posts_products;
                delete ctx.jsonData.offer_redemptions;
                delete ctx.jsonData.stripe_products;
                delete ctx.jsonData.stripe_prices;
                delete ctx.jsonData.snippets;
            }
        },
        {
            title: 'Remove users with no posts',
            task: async (ctx, task) => {
                let siteUsers = [];

                ctx.jsonData.users.forEach((user) => {
                    let hasPosts = _.find(ctx.jsonData.posts_authors, {author_id: user.id});

                    if (!hasPosts) {
                        siteUsers.push({
                            name: `${user.name} - ${user.slug} - ${user.id}`,
                            value: user
                        });
                    }
                });

                siteUsers = _.sortBy(siteUsers, ['name']);

                const promptOptions = [
                    {
                        type: 'checkbox',
                        name: 'users',
                        message: 'Select users to delete:',
                        pageSize: 20,
                        choices: siteUsers
                    }
                ];

                await inquirer.prompt(promptOptions).then(async (answers) => {
                    ctx.usersWithNoPosts = answers.users;
                    task.output = `Selected ${answers.users.length} of ${ctx.jsonData.users.length} users to delete`;
                });
            }
        },
        {
            title: 'Deleting users',
            skip: (ctx) => {
                return !ctx.usersWithNoPosts.length;
            },
            task: async (ctx) => {
                ctx.usersWithNoPosts.forEach((user) => {
                    ctx.jsonData.users = _.reject(ctx.jsonData.users, {id: user.id});
                    ctx.jsonData.roles_users = _.reject(ctx.jsonData.roles_users, {user_id: user.id});
                });
            }
        },
        {
            title: 'Select users to update',
            task: async (ctx, task) => {
                let siteUsers = [];

                ctx.jsonData.users.forEach((user) => {
                    let allPosts = _.filter(ctx.jsonData.posts_authors, {author_id: user.id});

                    siteUsers.push({
                        name: `${user.name} - ${user.slug} - ID: ${user.id} - Post Count: ${allPosts.length}`,
                        value: {
                            originalData: user
                        }
                    });
                });

                siteUsers = _.sortBy(siteUsers, ['name']);

                const promptOptions = [
                    {
                        type: 'checkbox',
                        name: 'users',
                        message: 'Select users:',
                        pageSize: 20,
                        choices: siteUsers
                    }
                ];

                await inquirer.prompt(promptOptions).then(async (answers) => {
                    ctx.usersToUpdate = answers.users;
                    task.output = `Selected ${answers.users.length} of ${ctx.jsonData.users.length} users to update`;
                });
            }
        },
        {
            title: 'Update users data',
            task: async (ctx) => {
                let tasks = [];

                ctx.usersToUpdate.forEach((user) => {
                    tasks.push({
                        title: `New details for ${user.originalData.name} - ${user.originalData.slug} - ${user.originalData.id}`,
                        task: async () => {
                            // Clone the original data
                            let theData = _.clone(user.originalData);

                            const promptOptions = [
                                {
                                    type: 'input',
                                    name: 'userID',
                                    message: 'The new ID:',
                                    filter: function (val) {
                                        return val.trim();
                                    },
                                    validate: (input) => {
                                        if (input.length) {
                                            return true;
                                        } else {
                                            return 'Please provide an ID';
                                        }
                                    }
                                },
                                {
                                    type: 'input',
                                    name: 'userName',
                                    message: 'The new name:',
                                    filter: function (val) {
                                        return val.trim();
                                    },
                                    validate: (input) => {
                                        if (input.length) {
                                            return true;
                                        } else {
                                            return 'Please provide a name';
                                        }
                                    }
                                },
                                {
                                    type: 'input',
                                    name: 'userSlug',
                                    message: 'The new slug:',
                                    filter: function (val) {
                                        return val.trim();
                                    },
                                    validate: (input) => {
                                        if (input.length) {
                                            return true;
                                        } else {
                                            return 'Please provide a slug';
                                        }
                                    }
                                },
                                {
                                    type: 'input',
                                    name: 'userEmail',
                                    message: 'The new email:',
                                    filter: function (val) {
                                        return val.trim();
                                    },
                                    validate: (input) => {
                                        if (input.length) {
                                            return true;
                                        } else {
                                            return 'Please provide an email address';
                                        }
                                    }
                                }
                            ];

                            await inquirer.prompt(promptOptions).then(async (answers) => {
                                // Prompt for updates to these values
                                theData.id = answers.userID; // Something new
                                theData.name = answers.userName; // Something new
                                theData.slug = answers.userSlug; // Something new
                                theData.email = answers.userEmail; // Something new

                                // Add the new data to the user object
                                user.newData = theData;
                            });
                        }
                    });
                });

                let taskOptions = options;
                taskOptions.concurrent = 1;
                return makeTaskRunner(tasks, taskOptions);
            }
        },
        {
            title: 'Update posts objects',
            task: async (ctx) => {
                ctx.usersToUpdate.forEach((user) => {
                    ctx.jsonData.posts.forEach((post) => {
                        if (post.author_id === user.originalData.id) {
                            post.author_id = user.newData.id;
                        }
                    });
                });
            }
        },
        {
            title: 'Update posts_authors objects',
            task: async (ctx) => {
                ctx.usersToUpdate.forEach((user) => {
                    ctx.jsonData.posts_authors.forEach((post) => {
                        if (post.author_id === user.originalData.id) {
                            post.author_id = user.newData.id;
                        }
                    });
                });
            }
        },
        {
            title: 'Update users objects',
            task: async (ctx) => {
                ctx.usersToUpdate.forEach((user) => {
                    ctx.jsonData.users.forEach((post) => {
                        if (post.id === user.originalData.id) {
                            post.id = user.newData.id;
                            post.slug = user.newData.slug;
                            post.name = user.newData.name;
                            post.email = user.newData.email;
                        }
                    });
                });
            }
        },
        {
            title: 'Saving file',
            task: async (ctx) => {
                const theData = {
                    db: [
                        {
                            data: {
                                ...ctx.jsonData
                            },
                            meta: {
                                exported_on: ctx.args.metaExportedOn,
                                version: ctx.args.metaVersion
                            }
                        }
                    ]
                };

                await fs.writeFile(`${ctx.args.destDir}/${ctx.args.fileNameNoExt}_clean.json`, JSON.stringify(theData, null, 4));
            }
        }
    ];
};

const getTaskRunner = (options) => {
    let tasks = [];

    tasks = getFullTaskList(options);

    // Configure a new Listr task manager, we can use different renderers for different configs
    return makeTaskRunner(tasks, Object.assign({topLevel: true}, options));
};

export default {
    initialise,
    getFullTaskList,
    getTaskRunner
};
