import GhostAdminAPI from '@tryghost/admin-api';
import {makeTaskRunner} from '@tryghost/listr-smart-renderer';
import {ui} from '@tryghost/pretty-cli';
import _ from 'lodash';
import {discover} from '../lib/batch-ghost-discover.js';
import {sleep} from '../lib/utils.js';

const idSuffixRegex = /-([a-f0-9]{24})$/i;

const getSlugCleanupPlan = (users, regex = idSuffixRegex) => {
    const slugMap = new Map();

    users.forEach((user) => {
        if (!user.slug) {
            return;
        }

        if (!slugMap.has(user.slug)) {
            slugMap.set(user.slug, []);
        }

        slugMap.get(user.slug).push(user);
    });

    const candidates = users.reduce((result, user) => {
        if (!user.slug) {
            return result;
        }

        const match = user.slug.match(regex);

        if (!match) {
            return result;
        }

        result.push({
            user,
            id: user.id,
            name: user.name,
            email: user.email,
            slug: user.slug,
            cleanSlug: user.slug.replace(regex, ''),
            extractedId: match[1]
        });

        return result;
    }, []);

    const candidateCounts = candidates.reduce((counts, candidate) => {
        counts.set(candidate.cleanSlug, (counts.get(candidate.cleanSlug) || 0) + 1);
        return counts;
    }, new Map());

    const updateable = [];
    const skipped = [];

    candidates.forEach((candidate) => {
        const existingDuplicateUsers = (slugMap.get(candidate.cleanSlug) || []).filter((user) => {
            return user.id !== candidate.id;
        });
        const sameCleanSlugCandidateCount = candidateCounts.get(candidate.cleanSlug) || 0;

        if (existingDuplicateUsers.length > 0) {
            skipped.push({
                ...candidate,
                reason: 'duplicate-clean-slug',
                duplicateUsers: existingDuplicateUsers
            });
            return;
        }

        if (sameCleanSlugCandidateCount > 1) {
            skipped.push({
                ...candidate,
                reason: 'multiple-id-suffixed-users',
                duplicateUsers: candidates
                    .filter(otherCandidate => otherCandidate.id !== candidate.id && otherCandidate.cleanSlug === candidate.cleanSlug)
                    .map(otherCandidate => otherCandidate.user)
            });
            return;
        }

        updateable.push(candidate);
    });

    return {
        candidates,
        updateable,
        skipped
    };
};

const isDryRun = options => Boolean(options.dryRun || options['dry-run']);

const initialise = (options) => {
    return {
        title: 'Initialising API connection',
        task: (ctx, task) => {
            let defaults = {
                verbose: false,
                dryRun: false,
                'dry-run': false,
                delayBetweenCalls: 50
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
            ctx.users = [];
            ctx.usersWithIdSuffix = [];
            ctx.usersToUpdate = [];
            ctx.updated = [];
            ctx.skipped = [];
            ctx.idRegex = idSuffixRegex;

            task.output = `Initialised API connection for ${options.apiURL}`;
        }
    };
};

const getFullTaskList = (options) => {
    return [
        initialise(options),
        {
            title: 'Fetch staff users from Ghost API',
            task: async (ctx, task) => {
                try {
                    ctx.users = await discover({
                        api: ctx.api,
                        type: 'users',
                        limit: 50,
                        include: 'roles'
                    });

                    task.output = `Found ${ctx.users.length} staff users`;
                } catch (error) {
                    ctx.errors.push(error);
                    throw error;
                }
            }
        },
        {
            title: 'Find staff slugs with ID suffixes',
            task: (ctx, task) => {
                const plan = getSlugCleanupPlan(ctx.users, ctx.idRegex);
                ctx.usersWithIdSuffix = plan.candidates;
                ctx.usersToUpdate = plan.updateable;
                ctx.skipped = plan.skipped;

                task.output = `Found ${ctx.usersWithIdSuffix.length} candidate staff slugs`;

                if (ctx.usersWithIdSuffix.length === 0) {
                    return;
                }

                if (ctx.args.verbose || ctx.usersWithIdSuffix.length <= 20) {
                    ui.log.info('\nStaff slugs with ID suffixes:');

                    ctx.usersWithIdSuffix.forEach((candidate) => {
                        ui.log.info(`  - ${candidate.name || candidate.email || candidate.id}`);
                        ui.log.info(`    Current slug: ${candidate.slug}`);
                        ui.log.info(`    Clean slug: ${candidate.cleanSlug}`);
                    });
                } else {
                    ui.log.info(`\nFound ${ctx.usersWithIdSuffix.length} candidate staff slugs. Use --verbose to see the full list.`);
                    ui.log.info('\nFirst 5 examples:');

                    ctx.usersWithIdSuffix.slice(0, 5).forEach((candidate) => {
                        ui.log.info(`  - ${candidate.name || candidate.email || candidate.id}: ${candidate.slug} -> ${candidate.cleanSlug}`);
                    });
                }

                if (ctx.skipped.length > 0) {
                    ui.log.warn(`Skipping ${ctx.skipped.length} staff slug${ctx.skipped.length === 1 ? '' : 's'} because the clean slug would not be unique.`);

                    if (ctx.args.verbose || ctx.skipped.length <= 20) {
                        ctx.skipped.forEach((candidate) => {
                            const duplicateSlugs = candidate.duplicateUsers.map(user => user.slug).join(', ');
                            ui.log.warn(`  - ${candidate.slug} -> ${candidate.cleanSlug} (${candidate.reason}: ${duplicateSlugs})`);
                        });
                    }
                }
            }
        },
        {
            title: 'Clean staff user slugs',
            skip: (ctx) => {
                if (ctx.usersToUpdate.length === 0) {
                    return 'No staff slugs can be updated safely';
                }
            },
            task: async (ctx) => {
                if (isDryRun(ctx.args)) {
                    ui.log.info('\n[DRY RUN] Would update the following staff slugs:');
                    ctx.usersToUpdate.forEach((candidate) => {
                        ui.log.info(`  - ${candidate.name || candidate.email || candidate.id}: ${candidate.slug} -> ${candidate.cleanSlug}`);
                    });
                    return;
                }

                const tasks = ctx.usersToUpdate.map(candidate => ({
                    title: `Updating ${candidate.slug} -> ${candidate.cleanSlug}`,
                    task: async () => {
                        try {
                            const result = await ctx.api.users.edit({
                                id: candidate.id,
                                slug: candidate.cleanSlug
                            });

                            ctx.updated.push(result);
                            await sleep(ctx.args.delayBetweenCalls);
                            return result;
                        } catch (error) {
                            error.resource = {
                                name: candidate.name,
                                slug: candidate.slug
                            };
                            ctx.errors.push(error);
                            throw error;
                        }
                    }
                }));

                return makeTaskRunner(tasks, {
                    ...options,
                    concurrent: 1
                });
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
    idSuffixRegex,
    getSlugCleanupPlan,
    initialise,
    getFullTaskList,
    getTaskRunner
};

export {
    idSuffixRegex,
    getSlugCleanupPlan,
    initialise,
    getFullTaskList,
    getTaskRunner
};
