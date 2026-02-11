import GhostAdminAPI from '@tryghost/admin-api';
import {makeTaskRunner} from '@tryghost/listr-smart-renderer';
import fsUtils from '@tryghost/mg-fs-utils';
import fs from 'fs-extra';
import {ui} from '@tryghost/pretty-cli';
import _ from 'lodash';
import {discover} from '../lib/batch-ghost-discover.js';
import {sleep} from '../lib/utils.js';
import {dirname} from 'node:path';
import errors from '@tryghost/errors';

const initialise = (options) => {
    return {
        title: 'Initialising API connection',
        task: (ctx, task) => {
            let defaults = {
                verbose: false,
                delayBetweenCalls: 50,
                backupPath: null,
                restorePath: null,
                dryRun: false,
                label: null
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
            ctx.members = [];
            ctx.newsletters = [];
            ctx.backedUp = 0;
            ctx.restored = [];
            ctx.skipped = [];

            task.output = `Initialised API connection for ${options.apiURL}`;
        }
    };
};

const fetchNewsletters = () => {
    return {
        title: 'Fetching newsletters',
        task: async (ctx, task) => {
            try {
                ctx.newsletters = await discover({
                    api: ctx.api,
                    type: 'newsletters',
                    limit: 100
                });

                if (ctx.args.verbose) {
                    task.output = `Found ${ctx.newsletters.length} newsletters`;
                }
            } catch (error) {
                ctx.errors.push(error);
                throw error;
            }
        }
    };
};

const fetchMembers = (options) => {
    return {
        title: 'Fetching members',
        task: async (ctx, task) => {
            try {
                // Build filter for label if specified
                let filter = [];
                if (options.label && options.label.length > 0) {
                    const labels = Array.isArray(options.label) ? options.label : [options.label];
                    filter.push(`label:[${labels.join(',')}]`);
                }

                ctx.members = await discover({
                    api: ctx.api,
                    type: 'members',
                    limit: 100,
                    filter: filter.length > 0 ? filter.join('+') : undefined,
                    include: 'newsletters'
                });

                if (ctx.args.verbose) {
                    task.output = `Found ${ctx.members.length} members`;
                }
            } catch (error) {
                ctx.errors.push(error);
                throw error;
            }
        }
    };
};

const backupNewsletterPreferences = (options) => {
    return {
        title: 'Backing up newsletter preferences to CSV',
        skip: () => {
            if (!options.backupPath) {
                return 'No backup path specified';
            }
        },
        task: async (ctx, task) => {
            // Build a map of newsletter IDs to slugs
            const newsletterIdToSlug = {};
            for (const newsletter of ctx.newsletters) {
                newsletterIdToSlug[newsletter.id] = newsletter.slug;
            }

            // Build CSV data with newsletter slugs
            const csvData = ctx.members.map((member) => {
                const newsletterSlugs = member.newsletters
                    ? member.newsletters.map(n => newsletterIdToSlug[n.id] || n.slug || '').filter(s => s).join(',')
                    : '';

                return {
                    id: member.id,
                    email: member.email,
                    name: member.name || '',
                    newsletter_slugs: newsletterSlugs
                };
            });

            // Ensure parent directory exists
            const parentDir = dirname(options.backupPath);
            await fs.ensureDir(parentDir);

            // Write CSV file
            const csvContent = fsUtils.csv.jsonToCSV(csvData);
            await fs.writeFile(options.backupPath, csvContent);

            ctx.backedUp = ctx.members.length;
            task.output = `Backed up newsletter preferences for ${ctx.backedUp} members to ${options.backupPath}`;
        }
    };
};

const restoreNewsletterPreferences = (options) => {
    return {
        title: 'Restoring newsletter preferences from CSV',
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
                task.output = 'No members found in restore file';
                return;
            }

            // Build a map of newsletter slugs to full newsletter objects
            const newsletterMap = {};
            const newsletterIdToSlug = {};
            for (const newsletter of ctx.newsletters) {
                newsletterMap[newsletter.slug] = newsletter;
                newsletterIdToSlug[newsletter.id] = newsletter.slug;
            }

            // Fetch current members by email for matching
            const memberEmailMap = {};
            for (const member of ctx.members) {
                memberEmailMap[member.email] = member;
            }

            // Build tasks for each member in CSV
            let tasks = [];

            for (const csvMember of csvData) {
                // Find matching member by email
                const member = memberEmailMap[csvMember.email];

                if (!member) {
                    ctx.skipped.push({
                        email: csvMember.email,
                        reason: 'Member not found'
                    });
                    continue;
                }

                // Parse newsletter slugs from CSV
                const targetSlugs = csvMember.newsletter_slugs
                    ? csvMember.newsletter_slugs.split(',').filter(s => s.trim())
                    : [];

                // Map slugs to newsletter objects
                const targetNewsletters = [];
                let missingNewsletters = [];
                for (const slug of targetSlugs) {
                    const trimmedSlug = slug.trim();
                    if (newsletterMap[trimmedSlug]) {
                        targetNewsletters.push({id: newsletterMap[trimmedSlug].id});
                    } else {
                        missingNewsletters.push(trimmedSlug);
                    }
                }

                if (missingNewsletters.length > 0) {
                    ctx.skipped.push({
                        email: csvMember.email,
                        reason: `Newsletter(s) not found: ${missingNewsletters.join(', ')}`
                    });
                    continue;
                }

                // Get current newsletter slugs for comparison (use ID lookup since member.newsletters may only have IDs)
                const currentSlugs = member.newsletters
                    ? member.newsletters.map(n => newsletterIdToSlug[n.id] || n.slug || '').filter(s => s).sort().join(',')
                    : '';
                const targetSlugsSorted = targetSlugs.sort().join(',');

                // Skip if already at target value
                if (currentSlugs === targetSlugsSorted) {
                    ctx.skipped.push({
                        email: csvMember.email,
                        reason: 'Already at target value'
                    });
                    continue;
                }

                if (ctx.args.dryRun) {
                    // In dry-run mode, just log what would happen
                    const currentDisplay = currentSlugs || '(none)';
                    const targetDisplay = targetSlugsSorted || '(none)';
                    ui.log.info(`[DRY RUN] ${csvMember.email}: ${currentDisplay} -> ${targetDisplay}`);
                    ctx.restored.push({email: csvMember.email, dryRun: true});
                    continue;
                }

                tasks.push({
                    title: `${member.email}`,
                    task: async () => {
                        try {
                            let result = await ctx.api.members.edit({
                                id: member.id,
                                newsletters: targetNewsletters
                            });
                            ctx.restored.push(result);
                            await sleep(ctx.args.delayBetweenCalls);
                            return result;
                        } catch (error) {
                            error.resource = {
                                email: member.email
                            };
                            ctx.errors.push(error);
                            throw error;
                        }
                    }
                });
            }

            if (ctx.args.dryRun) {
                task.output = `Dry run complete - ${ctx.restored.length} members would be updated`;
                return;
            }

            if (tasks.length === 0) {
                task.output = 'No members need to be restored';
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
        fetchNewsletters(),
        fetchMembers(options),
        backupNewsletterPreferences(options),
        restoreNewsletterPreferences(options)
    ];
};

const getTaskRunner = (options) => {
    let tasks = getFullTaskList(options);

    // Configure the task runner
    return makeTaskRunner(tasks, Object.assign({topLevel: true}, options));
};

export default {
    initialise,
    getFullTaskList,
    getTaskRunner
};
