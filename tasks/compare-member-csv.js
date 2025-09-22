import _ from 'lodash';
import {makeTaskRunner} from '@tryghost/listr-smart-renderer';
import fsUtils from '@tryghost/mg-fs-utils';
import fs from 'fs-extra';
import path from 'node:path';
import errors from '@tryghost/errors';

const initialise = (options) => {
    return {
        title: 'Initialising and reading CSV files',
        task: async (ctx, task) => {
            let defaults = {
                verbose: false
            };

            ctx.args = _.mergeWith(defaults, options);
            ctx.errors = [];
            ctx.newMembersList = [];
            ctx.unsubscribedList = [];

            // Validate file paths
            if (!await fs.pathExists(options.oldFile)) {
                throw new errors.NotFoundError({
                    message: `Old file not found: ${options.oldFile}`
                });
            }

            if (!await fs.pathExists(options.newFile)) {
                throw new errors.NotFoundError({
                    message: `New file not found: ${options.newFile}`
                });
            }

            // Parse the CSV files
            try {
                ctx.oldMembers = await fsUtils.csv.parseCSV(options.oldFile);
                ctx.newMembers = await fsUtils.csv.parseCSV(options.newFile);

                if (!ctx.oldMembers) {
                    ctx.oldMembers = [];
                }
                if (!ctx.newMembers) {
                    ctx.newMembers = [];
                }

                task.output = `Loaded ${ctx.oldMembers.length} members from old file and ${ctx.newMembers.length} members from new file`;
            } catch (error) {
                throw new errors.ValidationError({
                    message: `Failed to parse CSV files: ${error.message}`
                });
            }
        }
    };
};

const compareMembers = () => {
    return {
        title: 'Comparing member lists',
        task: async (ctx, task) => {
            // Ensure we have the data
            if (!ctx.oldMembers || !ctx.newMembers) {
                throw new errors.ValidationError({
                    message: 'CSV data not loaded properly'
                });
            }

            // Create email sets for efficient comparison
            const oldEmails = new Set(ctx.oldMembers.map(member => member.email?.toLowerCase()).filter(Boolean));
            const newEmails = new Set(ctx.newMembers.map(member => member.email?.toLowerCase()).filter(Boolean));

            // Find new members (in new file but not in old)
            ctx.newMembersList = ctx.newMembers.filter(member => member.email && !oldEmails.has(member.email.toLowerCase()));

            // Find unsubscribed members (in old file but not in new)
            ctx.unsubscribedList = ctx.oldMembers.filter(member => member.email && !newEmails.has(member.email.toLowerCase()));

            task.output = `Found ${ctx.newMembersList.length} new members and ${ctx.unsubscribedList.length} unsubscribed members`;
        }
    };
};

const exportResults = () => {
    return {
        title: 'Exporting results to CSV files',
        task: async (ctx, task) => {
            // Use the directory of the old file as the output directory
            const outputDir = path.dirname(ctx.args.oldFile);

            // Export new members
            if (ctx.newMembersList && ctx.newMembersList.length > 0) {
                const newMembersPath = path.join(outputDir, 'new.csv');
                const csvData = fsUtils.csv.jsonToCSV(ctx.newMembersList);
                await fs.writeFile(newMembersPath, csvData);
                ctx.newMembersFile = newMembersPath;
                task.output = `Exported ${ctx.newMembersList.length} new members to new.csv`;
            } else {
                task.output = 'No new members to export';
            }

            // Export unsubscribed members
            if (ctx.unsubscribedList && ctx.unsubscribedList.length > 0) {
                const unsubscribedPath = path.join(outputDir, 'unsubscribed.csv');
                const csvData = fsUtils.csv.jsonToCSV(ctx.unsubscribedList);
                await fs.writeFile(unsubscribedPath, csvData);
                ctx.unsubscribedFile = unsubscribedPath;
                task.output = `Exported ${ctx.unsubscribedList.length} unsubscribed members to unsubscribed.csv`;
            } else {
                task.output = 'No unsubscribed members to export';
            }
        }
    };
};

const getFullTaskList = (options) => {
    return [
        initialise(options),
        compareMembers(),
        exportResults()
    ];
};

const getTaskRunner = (options) => {
    let tasks = getFullTaskList(options);
    return makeTaskRunner(tasks, Object.assign({topLevel: true}, options));
};

export default {
    getTaskRunner
};