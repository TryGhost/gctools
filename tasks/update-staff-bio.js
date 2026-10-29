import GhostAdminAPI from '@tryghost/admin-api';
import { makeTaskRunner } from '@tryghost/listr-smart-renderer';
import fsUtils from '@tryghost/mg-fs-utils';
import fs from 'fs-extra';
import path from 'node:path';
import { ui } from '@tryghost/pretty-cli';
import { discover } from '../lib/batch-ghost-discover.js';
import { sleep } from '../lib/utils.js';
import errors from '@tryghost/errors';

const initialise = (options) => {
    return {
        title: 'Initialising API connection and reading CSV',
        task: async (ctx, task) => {
            const emailDomainOption = options.emailDomain ?? options['email-domain'];
            const emailDomain =
                emailDomainOption == null
                    ? null
                    : String(emailDomainOption).trim().replace(/^@/, '').toLowerCase();

            if (emailDomain !== null && (!emailDomain || /[@\s/\\]/.test(emailDomain))) {
                throw new Error('Enter an --email-domain such as example.com or @example.com.');
            }

            const url = options.apiURL.replace(/\/$/, '');
            const key = options.adminAPIKey;
            const api = new GhostAdminAPI({
                url: url.replace('localhost', '127.0.0.1'),
                key,
                version: 'v5.0',
            });

            ctx.args = {
                verbose: options.verbose || false,
                delayBetweenCalls: options.delayBetweenCalls ?? 100,
                emailDomain,
            };
            ctx.api = api;
            ctx.updated = [];
            ctx.skipped = [];
            ctx.tooLong = [];
            ctx.notFound = [];
            ctx.errors = [];

            ctx.csvRows = await fsUtils.csv.parseCSV(options.csvPath);
            task.output = `Initialised API and loaded ${ctx.csvRows.length} CSV rows`;
        },
    };
};

const getFullTaskList = (options) => {
    return [
        initialise(options),
        {
            title: 'Fetching all users from Ghost API',
            task: async (ctx, task) => {
                try {
                    ctx.users = await discover({
                        api: ctx.api,
                        type: 'users',
                    });
                    task.output = `Found ${ctx.users.length} users`;
                } catch (error) {
                    ctx.errors.push(error.message || error);
                    throw error;
                }
            },
        },
        {
            title: 'Processing CSV rows and updating staff bios',
            task: async (ctx, task) => {
                for (const [idx, row] of ctx.csvRows.entries()) {
                    const { slug, bio } = row;

                    if (!slug) {
                        ctx.errors.push(`Row ${idx + 1}: Missing required field (slug: empty)`);
                        continue;
                    }

                    const trimmedBio = bio ? bio.trim() : '';
                    if (trimmedBio.length === 0) {
                        if (ctx.args.verbose) {
                            task.output = `Row ${idx + 1}: Skipping ${slug} - bio is empty`;
                        }
                        continue;
                    }

                    try {
                        const email = ctx.args.emailDomain
                            ? `${slug.trim()}@${ctx.args.emailDomain}`.toLowerCase()
                            : null;
                        const user = ctx.users.find((u) =>
                            email
                                ? typeof u.email === 'string' &&
                                  u.email.trim().toLowerCase() === email
                                : u.slug === slug,
                        );

                        if (!user) {
                            ctx.notFound.push({ slug, bio });
                            if (ctx.args.verbose) {
                                task.output = `Row ${idx + 1}: No user found for ${email ? `email: ${email}` : `slug: ${slug}`}`;
                            }
                            continue;
                        }

                        // if (user.bio && user.bio.trim() !== '') {
                        //     ctx.skipped.push({
                        //         slug,
                        //         existingBio: user.bio,
                        //         newBio: bio,
                        //     });
                        //     if (ctx.args.verbose) {
                        //         task.output = `Row ${idx + 1}: Skipping ${slug} - bio already exists`;
                        //     }
                        //     continue;
                        // }

                        if (trimmedBio.length > 250) {
                            ctx.tooLong.push({
                                slug,
                                bio: trimmedBio,
                                length: trimmedBio.length,
                            });
                            if (ctx.args.verbose) {
                                task.output = `Row ${idx + 1}: Skipping ${slug} - bio too long (${trimmedBio.length} chars)`;
                            }
                            continue;
                        }

                        const updated = await ctx.api.users.edit({
                            id: user.id,
                            bio: trimmedBio,
                            updated_at: user.updated_at,
                        });

                        user.bio = updated.bio;

                        ctx.updated.push({
                            slug: updated.slug,
                            name: updated.name,
                            bio: updated.bio,
                        });

                        if (ctx.args.verbose) {
                            task.output = `Row ${idx + 1}: Updated bio for ${slug}`;
                        }

                        await sleep(ctx.args.delayBetweenCalls);
                    } catch (error) {
                        ctx.errors.push(
                            `Row ${idx + 1}: ${error.context || error.message} (slug: ${slug})`,
                        );
                    }
                }

                task.output = `Processed ${ctx.csvRows.length} rows`;

                ui.log.ok(`\nSummary:`);
                ui.log.ok(`  Total CSV rows: ${ctx.csvRows.length}`);
                ui.log.ok(`  Users updated: ${ctx.updated.length}`);
                ui.log.ok(`  Users skipped (bio not empty): ${ctx.skipped.length}`);
                ui.log.ok(`  Users skipped (bio > 250 chars): ${ctx.tooLong.length}`);
                ui.log.ok(`  Users not found: ${ctx.notFound.length}`);

                if (ctx.errors.length > 0) {
                    ui.log.warn(`  Errors: ${ctx.errors.length}`);
                } else {
                    ui.log.ok(`  No errors encountered.`);
                }

                // Export CSVs for bios that were not updated
                const csvDir = path.dirname(options.csvPath);

                if (ctx.tooLong.length > 0) {
                    const tooLongPath = path.join(csvDir, 'bios-too-long.csv');
                    const tooLongCsv = fsUtils.csv.jsonToCSV(ctx.tooLong);
                    await fs.writeFile(tooLongPath, tooLongCsv);
                    ui.log.ok(`  Exported bios too long to: ${tooLongPath}`);
                }

                if (ctx.notFound.length > 0) {
                    const notFoundPath = path.join(csvDir, 'bios-not-found.csv');
                    const notFoundCsv = fsUtils.csv.jsonToCSV(ctx.notFound);
                    await fs.writeFile(notFoundPath, notFoundCsv);
                    ui.log.ok(`  Exported users not found to: ${notFoundPath}`);
                }

                if (ctx.errors.length > 0) {
                    throw new errors.InternalServerError({
                        message: 'Failed to process some rows',
                        context: `Processed ${ctx.csvRows.length} rows with ${ctx.errors.length} errors`,
                    });
                }
            },
        },
    ];
};

const getTaskRunner = (options) => {
    let tasks = getFullTaskList(options);
    return makeTaskRunner(tasks, Object.assign({ topLevel: true }, options));
};

export default {
    initialise,
    getFullTaskList,
    getTaskRunner,
};
