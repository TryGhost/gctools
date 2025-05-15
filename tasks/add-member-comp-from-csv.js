import Promise from 'bluebird';
import _ from 'lodash';
import GhostAdminAPI from '@tryghost/admin-api';
import {makeTaskRunner} from '@tryghost/listr-smart-renderer';
import fsUtils from '@tryghost/mg-fs-utils';
import {ui} from '@tryghost/pretty-cli';
import {getTiers} from '../lib/admin-api-call.js';
import errors from '@tryghost/errors';

const initialise = (options) => {
    return {
        title: 'Initialising API connection and reading CSV',
        task: async (ctx, task) => {
            let defaults = {
                verbose: false,
                delayBetweenCalls: 100
            };

            const url = options.apiURL.replace(/\/$/, '');
            const key = options.adminAPIKey;
            const api = new GhostAdminAPI({
                url: url.replace('localhost', '127.0.0.1'),
                key,
                version: 'v5.0'
            });

            ctx.args = _.mergeWith(defaults, options);
            ctx.api = api;
            ctx.updated = [];
            ctx.errors = [];
            ctx.membersFound = 0;
            ctx.tiersFound = 0;

            // Parse the CSV
            ctx.csvRows = await fsUtils.csv.parseCSV(options.csvPath);
            task.output = `Initialised API and loaded ${ctx.csvRows.length} CSV rows`;
        }
    };
};

const getFullTaskList = (options) => {
    return [
        initialise(options),
        {
            title: 'Processing CSV rows',
            task: async (ctx, task) => {
                let hasErrors = false;
                ctx.successfulRows = 0;
                await Promise.mapSeries(ctx.csvRows, async (row, idx) => {
                    const {email, expireAt, tierName} = row;
                    try {
                        // Find member by email
                        const members = await ctx.api.members.browse({filter: `email:${email}`});
                        if (!members.length) {
                            hasErrors = true;
                            ctx.errors.push(`Row ${idx + 1}: No member found for email: ${email}`);
                            return;
                        }
                        ctx.membersFound = ctx.membersFound + 1;
                        const member = members[0];

                        // Find tier by name using direct API call
                        const tiers = await getTiers({apiURL: options.apiURL, adminAPIKey: options.adminAPIKey});
                        const tier = tiers.find(t => t.name === tierName);
                        if (!tier) {
                            hasErrors = true;
                            ctx.errors.push(`Row ${idx + 1}: No tier found for name: ${tierName}`);
                            return;
                        }
                        ctx.tiersFound = ctx.tiersFound + 1;

                        // Add new complimentary subscription
                        const updated = await ctx.api.members.edit({
                            id: member.id,
                            tiers: [{id: tier.id, expiry_at: expireAt}]
                        });
                        ctx.updated.push(updated);
                        ctx.successfulRows = ctx.successfulRows + 1;
                        await Promise.delay(ctx.args.delayBetweenCalls);
                    } catch (error) {
                        hasErrors = true;
                        ctx.errors.push(`Row ${idx + 1}: ${error.context || error.message} (email: ${email})`);
                    }
                });

                if (hasErrors) {
                    task.output = `Processed ${ctx.csvRows.length} rows.`;
                    // Print summary
                    ui.log.ok(`\nSummary:`);
                    ui.log.ok(`  Total rows processed: ${ctx.csvRows.length}`);
                    ui.log.ok(`  Successful rows: ${ctx.successfulRows}`);
                    ui.log.ok(`  Failed rows: ${ctx.errors.length}`);
                    ui.log.ok(`  Members found: ${ctx.membersFound}`);
                    ui.log.ok(`  Tiers found: ${ctx.tiersFound}`);
                    ui.log.ok(`  Subscriptions updated: ${ctx.updated.length}`);
                    ui.log.warn(`  Errors: ${ctx.errors.length}`);
                    
                    throw new errors.InternalServerError({
                        message: 'Failed to process some rows',
                        context: `Processed ${ctx.csvRows.length} rows with ${ctx.errors.length} errors`
                    });
                }

                task.output = `Processed ${ctx.csvRows.length} rows.`;
                // Print summary
                ui.log.ok(`\nSummary:`);
                ui.log.ok(`  Total rows processed: ${ctx.csvRows.length}`);
                ui.log.ok(`  Successful rows: ${ctx.successfulRows}`);
                ui.log.ok(`  Members found: ${ctx.membersFound}`);
                ui.log.ok(`  Tiers found: ${ctx.tiersFound}`);
                ui.log.ok(`  Subscriptions updated: ${ctx.updated.length}`);
                ui.log.ok('  No errors encountered.');
            }
        }
    ];
};

const getTaskRunner = (options) => {
    let tasks = getFullTaskList(options);
    return makeTaskRunner(tasks, Object.assign({topLevel: true}, options));
};

export default {
    initialise,
    getFullTaskList,
    getTaskRunner
}; 