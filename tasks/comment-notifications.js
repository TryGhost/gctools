import GhostAdminAPI from '@tryghost/admin-api';
import {makeTaskRunner} from '@tryghost/listr-smart-renderer';
import _ from 'lodash';
import {discover} from '../lib/batch-ghost-discover.js';
import fs from 'fs-extra';
import fsUtils from '@tryghost/mg-fs-utils';
import {dirname} from 'node:path';
import {sleep} from '../lib/utils.js';
import errors from '@tryghost/errors';

const initialise = (options) => {
    return {
        title: 'Initialising API connection',
        task: (ctx, task) => {
            let defaults = {
                verbose: false,
                delayBetweenCalls: 50,
                value: null,
                backupPath: null,
                restorePath: null
            };

            const url = options.apiURL;
            const key = options.adminAPIKey;
            const api = new GhostAdminAPI({
                url: url.replace('localhost', '127.0.0.1'),
                key,
                version: 'v5.0'
            });

            ctx.api = api;
            ctx.args = _.mergeWith(defaults, options);
            ctx.users = [];
            ctx.updated = [];
            ctx.backedUp = 0;
            ctx.restored = [];
            ctx.skipped = [];

            task.output = `Initialised API connection for ${options.apiURL}`;
        }
    };
};

const backupSettings = (options) => {
    return {
        title: 'Backing up current settings to CSV',
        skip: () => {
            if (!options.backupPath) {
                return 'No backup path specified';
            }
        },
        task: async (ctx, task) => {
            // Filter out Owner role users
            const usersToBackup = ctx.users.filter((user) => {
                const isOwner = _.find(user.roles, {name: 'Owner'});
                return !isOwner;
            });

            // Build CSV data
            const csvData = usersToBackup.map((user) => {
                return {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    slug: user.slug,
                    comment_notifications: user.comment_notifications
                };
            });

            // Ensure parent directory exists
            const parentDir = dirname(options.backupPath);
            await fs.ensureDir(parentDir);

            // Write CSV file
            const csvContent = fsUtils.csv.jsonToCSV(csvData);
            await fs.writeFile(options.backupPath, csvContent);

            ctx.backedUp = usersToBackup.length;
            task.output = `Backed up settings for ${ctx.backedUp} users to ${options.backupPath}`;
        }
    };
};

const restoreSettings = (options) => {
    return {
        title: 'Restoring settings from CSV backup',
        skip: () => {
            if (!options.restorePath) {
                return 'No restore path specified';
            }
        },
        task: async (ctx, task) => {
            // Verify file exists
            if (!await fs.pathExists(options.restorePath)) {
                throw new errors.NotFoundError({
                    message: `Restore file not found: ${options.restorePath}`
                });
            }

            // Read CSV file
            const csvData = await fsUtils.csv.parseCSV(options.restorePath);

            if (!csvData || csvData.length === 0) {
                task.output = 'No users found in restore file';
                return;
            }

            // Build tasks for each user in CSV
            let tasks = [];

            for (const csvUser of csvData) {
                // Find matching user by ID in fetched users
                const user = ctx.users.find(u => u.id === csvUser.id);

                if (!user) {
                    ctx.skipped.push({
                        id: csvUser.id,
                        email: csvUser.email,
                        reason: 'User not found'
                    });
                    continue;
                }

                // Skip Owner role users
                const isOwner = _.find(user.roles, {name: 'Owner'});
                if (isOwner) {
                    ctx.skipped.push({
                        id: csvUser.id,
                        email: csvUser.email,
                        reason: 'Owner role'
                    });
                    continue;
                }

                // Parse the CSV value (comes as string)
                const targetValue = csvUser.comment_notifications === 'true' || csvUser.comment_notifications === true;

                // Skip if already at target value
                if (user.comment_notifications === targetValue) {
                    ctx.skipped.push({
                        id: csvUser.id,
                        email: csvUser.email,
                        reason: 'Already at target value'
                    });
                    continue;
                }

                tasks.push({
                    title: `${user.name}`,
                    task: async () => {
                        try {
                            let result = await ctx.api.users.edit({
                                id: user.id,
                                comment_notifications: targetValue
                            });
                            ctx.restored.push(result);
                            await sleep(ctx.args.delayBetweenCalls);
                            return result;
                        } catch (error) {
                            error.resource = {
                                name: user.name
                            };
                            ctx.errors.push(error);
                            throw error;
                        }
                    }
                });
            }

            if (tasks.length === 0) {
                task.output = 'No users need to be restored';
                return;
            }

            if (options.verbose) {
                return makeTaskRunner(tasks, {verbose: options.verbose, concurrent: 1});
            } else {
                return makeTaskRunner(tasks, {concurrent: 1, renderer: 'silent', verbose: false});
            }
        }
    };
};

const getFullTaskList = (options) => {
    return [
        initialise(options),
        {
            title: 'Fetch users from Ghost API',
            task: async (ctx, task) => {
                try {
                    ctx.users = await discover({
                        api: ctx.api,
                        type: 'users',
                        limit: 50,
                        options: {
                            include: 'roles'
                        }
                    });

                    if (ctx.args.verbose) {
                        task.output = `Found ${ctx.users.length} users`;
                    }
                } catch (error) {
                    ctx.errors.push(error);
                    throw error;
                }
            }
        },
        backupSettings(options),
        restoreSettings(options),
        {
            title: 'Updating comment notifications',
            task: (ctx) => {
                let tasks = [];

                // Filter out Owner role users and users who are already set correctly
                const usersToUpdate = ctx.users.filter((user) => {
                    const isOwner = _.find(user.roles, {name: 'Owner'});
                    const needsUpdate = user.comment_notifications !== ctx.args.value;
                    return !isOwner && needsUpdate;
                });

                tasks = usersToUpdate.map((user) => {
                    return {
                        title: `${user.name}`,
                        task: async () => {
                            try {
                                let result = await ctx.api.users.edit({
                                    id: user.id,
                                    comment_notifications: ctx.args.value
                                });
                                ctx.updated.push(result);
                                await sleep(ctx.args.delayBetweenCalls);
                                return result;
                            } catch (error) {
                                error.resource = {
                                    name: user.name
                                };
                                ctx.errors.push(error);
                                throw error;
                            }
                        }
                    };
                });

                if (options.verbose) {
                    return makeTaskRunner(tasks, {verbose: options.verbose, concurrent: 1});
                } else {
                    return makeTaskRunner(tasks, {concurrent: 1, renderer: 'silent', verbose: false});
                }
            },
            skip: (ctx) => {
                if (ctx.users.length < 1) {
                    return 'No users found';
                }
                // Skip if in restore mode (restore task handles updates)
                if (ctx.args.restorePath) {
                    return 'Using restore mode';
                }
                // Skip if no value specified (backup-only mode)
                if (ctx.args.value === null) {
                    return 'No value specified (backup-only mode)';
                }
            }
        }
    ];
};

const getTaskRunner = (options) => {
    let tasks = [];

    tasks = getFullTaskList(options);

    // Configure the task runner
    return makeTaskRunner(tasks, Object.assign({topLevel: true}, options));
};

export default {
    initialise,
    getFullTaskList,
    getTaskRunner
};
