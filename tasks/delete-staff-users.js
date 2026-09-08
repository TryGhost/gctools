import GhostAdminAPI from '@tryghost/admin-api';
import { makeTaskRunner } from '@tryghost/listr-smart-renderer';
import { ui } from '@tryghost/pretty-cli';
import { discover } from '../lib/batch-ghost-discover.js';
import { sleep } from '../lib/utils.js';

const normaliseRoleNames = (roles) => {
    const input = Array.isArray(roles) ? roles : roles ? [roles] : [];
    const seen = new Set();
    const roleNames = [];

    input
        .flatMap((role) => {
            if (typeof role === 'string') {
                return role.split(',');
            }

            return role?.name ? [role.name] : [];
        })
        .map((role) => role.trim())
        .filter(Boolean)
        .forEach((role) => {
            const normalised = role.toLowerCase();
            if (!seen.has(normalised)) {
                seen.add(normalised);
                roleNames.push(role);
            }
        });

    if (roleNames.length === 0) {
        throw new Error('Select at least one staff role with --roles.');
    }

    if (roleNames.some((role) => role.toLowerCase() === 'owner')) {
        throw new Error('The Owner role cannot be deleted.');
    }

    return roleNames;
};

const normaliseEmailDomain = (emailDomain) => {
    if (emailDomain === null || emailDomain === undefined) {
        return null;
    }

    const input = String(emailDomain).trim().toLowerCase();
    if (!input) {
        return null;
    }

    const domain = input.startsWith('@') ? input.slice(1) : input;
    if (
        !domain ||
        domain.includes('@') ||
        /\s|[/\\]/.test(domain) ||
        domain.startsWith('.') ||
        domain.endsWith('.') ||
        domain.includes('..')
    ) {
        throw new Error('Enter an email domain such as example.com or @example.com.');
    }

    return domain;
};

const emailMatchesDomain = (user, emailDomain) => {
    if (!emailDomain) {
        return true;
    }

    return (
        typeof user?.email === 'string' &&
        user.email.trim().toLowerCase().endsWith(`@${emailDomain}`)
    );
};

const getContentCount = (user) => {
    const value = user?.count?.posts;

    if (value === null || value === undefined || value === '') {
        return null;
    }

    const count = Number(value);
    return Number.isFinite(count) ? count : null;
};

const getRoleNames = (user) => {
    return (user?.roles || []).map((role) => role?.name).filter(Boolean);
};

const partitionUsers = (users, { roleNames, currentUserId, emailDomain = null }) => {
    const selectedRoles = new Set(roleNames.map((role) => role.toLowerCase()));
    const normalisedEmailDomain = normaliseEmailDomain(emailDomain);
    const candidates = [];
    const skipped = [];
    const ignored = [];

    users.forEach((user) => {
        const userRoles = getRoleNames(user);
        const normalisedUserRoles = userRoles.map((role) => role.toLowerCase());

        if (normalisedUserRoles.includes('owner')) {
            skipped.push({ user, reason: 'owner' });
            return;
        }

        if (!normalisedUserRoles.some((role) => selectedRoles.has(role))) {
            ignored.push(user);
            return;
        }

        if (user.id === currentUserId) {
            skipped.push({ user, reason: 'current-user' });
            return;
        }

        if (!emailMatchesDomain(user, normalisedEmailDomain)) {
            skipped.push({ user, reason: 'email-domain-mismatch' });
            return;
        }

        const contentCount = getContentCount(user);
        if (contentCount === null) {
            skipped.push({ user, reason: 'missing-content-count' });
            return;
        }

        if (contentCount !== 0) {
            skipped.push({ user, reason: 'has-content' });
            return;
        }

        candidates.push(user);
    });

    return { candidates, skipped, ignored };
};

const validateOptions = (options) => {
    const dryRun = Boolean(options.dryRun || options['dry-run']);
    const confirmed = Boolean(options.yes);

    if (dryRun && confirmed) {
        throw new Error('Choose either --dry-run or --yes, not both.');
    }

    if (!dryRun && !confirmed) {
        throw new Error('Choose --dry-run to preview or --yes to permanently delete staff users.');
    }

    return {
        dryRun,
        emailDomain: normaliseEmailDomain(options.emailDomain ?? options['email-domain']),
        roleNames: normaliseRoleNames(options.roles),
    };
};

const describeUser = (user) => {
    const identity = user.name || user.id;
    const email = user.email || 'missing email';
    const roles = getRoleNames(user).join(', ') || 'Unknown role';
    const count = getContentCount(user);
    const countText = count === null ? 'unknown content count' : `${count} posts/pages`;
    return `${identity} (${email}, ${roles}, ${countText})`;
};

const logSelection = (ctx) => {
    if (ctx.candidates.length > 0) {
        ui.log.info(`\nEligible staff users (${ctx.candidates.length}):`);
        const candidates = ctx.args.verbose ? ctx.candidates : ctx.candidates.slice(0, 20);
        candidates.forEach((user) => ui.log.info(`  - ${describeUser(user)}`));

        if (!ctx.args.verbose && ctx.candidates.length > candidates.length) {
            ui.log.info(
                `  ...and ${ctx.candidates.length - candidates.length} more; use --verbose to show all.`,
            );
        }
    }

    if (ctx.skipped.length > 0) {
        const counts = ctx.skipped.reduce((result, item) => {
            result[item.reason] = (result[item.reason] || 0) + 1;
            return result;
        }, {});
        const summary = Object.entries(counts)
            .map(([reason, count]) => `${reason}: ${count}`)
            .join(', ');
        ui.log.warn(`Skipped ${ctx.skipped.length} staff users (${summary}).`);

        if (ctx.args.verbose) {
            ctx.skipped.forEach(({ user, reason }) => {
                ui.log.warn(`  - ${describeUser(user)}: ${reason}`);
            });
        }
    }
};

const createAPI = (options) => {
    const url = options.apiURL.replace(/\/$/, '');
    const key = options.staffAccessToken || options.adminAPIKey;

    return new GhostAdminAPI({
        url: url.replace('localhost', '127.0.0.1'),
        key,
        version: 'v5.0',
    });
};

const verifyStaffAccessToken = async (api) => {
    try {
        const currentUser = await api.users.read({ id: 'me' }, { include: 'roles' });

        if (!currentUser?.id) {
            throw new Error('The current staff user could not be identified.');
        }

        return currentUser;
    } catch (error) {
        throw new Error(
            'A Ghost staff access token is required. Integration Admin API keys cannot delete staff users.',
            { cause: error },
        );
    }
};

const initialise = (options) => {
    return {
        title: 'Initialising staff API connection',
        task: (ctx, task) => {
            const validation = validateOptions(options);

            ctx.args = {
                ...options,
                dryRun: validation.dryRun,
                emailDomain: validation.emailDomain,
                roleNames: validation.roleNames,
                delayBetweenCalls: options.delayBetweenCalls ?? 200,
                verbose: Boolean(options.verbose),
            };
            ctx.api = createAPI(options);
            ctx.currentUser = null;
            ctx.users = [];
            ctx.candidates = [];
            ctx.skipped = [];
            ctx.ignored = [];
            ctx.deleted = [];
            ctx.failed = [];

            task.output = `Initialised API connection for ${options.apiURL}`;
        },
    };
};

const getFullTaskList = (options) => {
    return [
        initialise(options),
        {
            title: 'Verify staff access token',
            task: async (ctx, task) => {
                try {
                    ctx.currentUser = await verifyStaffAccessToken(ctx.api);
                    task.output = `Authenticated as ${ctx.currentUser.name || ctx.currentUser.email || ctx.currentUser.id}`;
                } catch (error) {
                    ctx.errors.push(error);
                    throw error;
                }
            },
        },
        {
            title: 'Fetch staff users from Ghost API',
            task: async (ctx, task) => {
                try {
                    ctx.users = await discover({
                        api: ctx.api,
                        type: 'users',
                        limit: 50,
                        include: 'count.posts,roles',
                    });
                    task.output = `Found ${ctx.users.length} staff users`;
                } catch (error) {
                    ctx.errors.push(error);
                    throw error;
                }
            },
        },
        {
            title: 'Select content-free staff users',
            task: (ctx, task) => {
                const selection = partitionUsers(ctx.users, {
                    roleNames: ctx.args.roleNames,
                    currentUserId: ctx.currentUser.id,
                    emailDomain: ctx.args.emailDomain,
                });

                ctx.candidates = selection.candidates;
                ctx.skipped = selection.skipped;
                ctx.ignored = selection.ignored;
                task.output = `Found ${ctx.candidates.length} eligible staff users`;
                logSelection(ctx);
            },
        },
        {
            title: 'Delete staff users',
            skip: (ctx) => {
                if (ctx.args.dryRun) {
                    return 'Dry run requested';
                }

                if (ctx.candidates.length === 0) {
                    return 'No eligible staff users found';
                }
            },
            task: async (ctx) => {
                const tasks = ctx.candidates.map((candidate) => ({
                    title: `Deleting ${candidate.name || candidate.email || candidate.id}`,
                    task: async (taskContext, task) => {
                        try {
                            const freshUser = await ctx.api.users.read(
                                { id: candidate.id },
                                { include: 'count.posts,roles' },
                            );
                            const selection = partitionUsers([freshUser], {
                                roleNames: ctx.args.roleNames,
                                currentUserId: ctx.currentUser.id,
                                emailDomain: ctx.args.emailDomain,
                            });

                            if (selection.candidates.length === 0) {
                                const skipped = selection.skipped[0] || {
                                    user: freshUser,
                                    reason: 'role-changed',
                                };
                                ctx.skipped.push(skipped);
                                task.output = `Skipped: ${skipped.reason}`;
                                return;
                            }

                            await ctx.api.users.delete({ id: freshUser.id });
                            ctx.deleted.push(freshUser);
                        } catch (error) {
                            error.resource = {
                                id: candidate.id,
                                name: candidate.name,
                                email: candidate.email,
                            };
                            ctx.failed.push({ user: candidate, error });
                            ctx.errors.push(error);
                            task.output = `Failed: ${error.message}`;
                        } finally {
                            await sleep(ctx.args.delayBetweenCalls);
                        }
                    },
                }));

                return makeTaskRunner(tasks, { ...options, concurrent: 1, exitOnError: false });
            },
        },
    ];
};

const getTaskRunner = (options) => {
    return makeTaskRunner(getFullTaskList(options), { topLevel: true, ...options });
};

export {
    createAPI,
    emailMatchesDomain,
    getContentCount,
    getRoleNames,
    normaliseEmailDomain,
    normaliseRoleNames,
    partitionUsers,
    validateOptions,
    verifyStaffAccessToken,
    initialise,
    getFullTaskList,
    getTaskRunner,
};

export default {
    createAPI,
    emailMatchesDomain,
    getContentCount,
    getRoleNames,
    normaliseEmailDomain,
    normaliseRoleNames,
    partitionUsers,
    validateOptions,
    verifyStaffAccessToken,
    initialise,
    getFullTaskList,
    getTaskRunner,
};
