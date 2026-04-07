import {dirname, basename} from 'node:path';
import fsUtils from '@tryghost/mg-fs-utils';
import fs from 'fs-extra';
import inquirer from 'inquirer';
import {makeTaskRunner} from '@tryghost/listr-smart-renderer';
import _ from 'lodash';
import {fetchGhostUsers} from '@tryghost/mg-ghost-authors';

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
            title: 'Keep posts and pages?',
            task: async (ctx, task) => {
                const promptOptions = [
                    {
                        type: 'checkbox',
                        name: 'postspages',
                        message: 'Select content types to keep:',
                        pageSize: 20,
                        choices: [
                            {
                                name: 'Posts',
                                value: 'post',
                                checked: true
                            },
                            {
                                name: 'Pages',
                                value: 'page',
                                checked: true
                            }
                        ]
                    }
                ];

                await inquirer.prompt(promptOptions).then(async (answers) => {
                    ctx.postsAndPages = answers.postspages;
                    task.output = `Selected tp keep ${answers.postspages.join(', ')}`;
                });
            }
        },
        {
            title: 'Removing unwanted content types',
            skip: ctx => !ctx.postsAndPages.length,
            task: async (ctx) => {
                // ctx.postsAndPages

                let metaToDelete = [];

                ctx.jsonData.posts = ctx.jsonData.posts.filter((item) => {
                    const isWantedType = ctx.postsAndPages.includes(item.type);

                    if (isWantedType) {
                        return item;
                    } else {
                        // console.log('Delete meta for', item.title, item.type, item.id);
                        metaToDelete.push(item.id);
                        return false;
                    }
                });

                ctx.jsonData.posts_meta = ctx.jsonData.posts_meta.filter((item) => {
                    if (metaToDelete.includes(item.post_id)) {
                        return false;
                    } else {
                        return item;
                    }
                });

                ctx.jsonData.posts_tags = ctx.jsonData.posts_tags.filter((item) => {
                    if (metaToDelete.includes(item.post_id)) {
                        return false;
                    } else {
                        return item;
                    }
                });

                ctx.jsonData.posts_authors = ctx.jsonData.posts_authors.filter((item) => {
                    if (metaToDelete.includes(item.post_id)) {
                        return false;
                    } else {
                        return item;
                    }
                });
            }
        },
        {
            title: 'Add temporary user ID to users without one',
            task: async (ctx) => {
                // Deleting users relies on them having an ID
                ctx.jsonData.users.forEach((user) => {
                    if (!user.id || user.id === '') {
                        user.id = `temp-id-${Math.random().toString(36).substring(2, 15)}`;
                    }
                });
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

                if (!siteUsers.length) {
                    ctx.usersWithNoPosts = [];
                    task.output = 'All users have posts, nothing to remove';
                    return;
                }

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
            title: 'Fetch Ghost users and auto-update matches',
            skip: () => !options.ghostApiUrl || !options.ghostAdminKey,
            task: async (ctx, task) => {
                const ghostUsers = await fetchGhostUsers({
                    apiUrl: options.ghostApiUrl,
                    adminKey: options.ghostAdminKey
                });

                task.output = `Fetched ${ghostUsers.length} Ghost users`;

                ctx.autoMatchedUserIds = new Set();

                ctx.jsonData.users.forEach((jsonUser) => {
                    if (!jsonUser.email) {
                        return;
                    }

                    const matchedGhostUser = ghostUsers.find((ghostUser) => {
                        return ghostUser.email &&
                            ghostUser.email.toLowerCase() === jsonUser.email.toLowerCase();
                    });

                    if (matchedGhostUser) {
                        ctx.usersToUpdate.push({
                            originalData: _.clone(jsonUser),
                            newData: {
                                ...jsonUser,
                                id: matchedGhostUser.id,
                                name: matchedGhostUser.name,
                                slug: matchedGhostUser.slug,
                                email: matchedGhostUser.email
                            }
                        });
                        ctx.autoMatchedUserIds.add(jsonUser.id);
                    }
                });

                task.output = `Matched ${ctx.usersToUpdate.length} of ${ctx.jsonData.users.length} users to Ghost users`;
            }
        },
        {
            title: 'Select users to update',
            task: async (ctx, task) => {
                let siteUsers = [];

                ctx.jsonData.users.forEach((user) => {
                    // Skip users already auto-matched from Ghost
                    if (ctx.autoMatchedUserIds && ctx.autoMatchedUserIds.has(user.id)) {
                        return;
                    }

                    let allPosts = _.filter(ctx.jsonData.posts_authors, {author_id: user.id});

                    siteUsers.push({
                        name: `${user.name} - ${user.slug} - ID: ${user.id} - Post Count: ${allPosts.length}`,
                        value: {
                            originalData: user
                        }
                    });
                });

                if (!siteUsers.length) {
                    task.output = 'All users already matched, nothing to manually update';
                    return;
                }

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
                    ctx.usersToUpdate = ctx.usersToUpdate.concat(answers.users);
                    task.output = `Selected ${answers.users.length} of ${siteUsers.length} remaining users to update`;
                });
            }
        },
        {
            title: 'Update users data',
            skip: (ctx) => {
                // Only run for manually-selected users (those without newData already set)
                return !ctx.usersToUpdate.some(u => !u.newData);
            },
            task: async (ctx) => {
                let tasks = [];

                ctx.usersToUpdate.forEach((user) => {
                    // Skip auto-matched users that already have newData
                    if (user.newData) {
                        return;
                    }

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
                                    default: theData.id,
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
                                    default: theData.name,
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
                                    default: theData.slug,
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
                                    default: theData.email,
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
