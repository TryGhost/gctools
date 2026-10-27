import path from 'node:path';
import axios from 'axios';
import fs from 'fs-extra';
import errors from '@tryghost/errors';
import { makeTaskRunner } from '@tryghost/listr-smart-renderer';
import { apiAuthTokenHeaders } from '../lib/admin-api-call.js';
import { keepValuesFrom, findMatches, readKeepFile } from '../lib/keep-list.js';
import { sleep, jsonToCSV } from '../lib/utils.js';

const REPORT_COLUMNS = [
    'action',
    'id',
    'name',
    'slug',
    'member_count',
    'kept_by',
    'value',
    'error',
];

// Without a timeout, a request Ghost never answers blocks the run forever. A fetch that times
// out aborts before anything is deleted; a delete that times out is reported as failed and
// stops the run, and a rerun shows whether Ghost deleted it. Ghost loads every member of a
// label before deleting it, so labels on very large sites may need longer (`--timeout`)
const DEFAULT_TIMEOUT_MS = 60000;

const requestOptions = (args, params) => ({
    headers: { ...apiAuthTokenHeaders(args), 'Accept-Version': 'v5.0' },
    params,
    timeout: args.timeout ?? DEFAULT_TIMEOUT_MS,
});

const isDryRun = (options) => Boolean(options.dryRun || options['dry-run']);

const hasValues = (value) => Array.isArray(value) && value.length > 0;

// Ghost puts the useful message in the response body; axios's own message is only the status
const errorMessage = (error) => error.response?.data?.errors?.[0]?.message || error.message;

const getMemberCount = (label) => {
    const count = label?.count?.members;
    if (!Number.isSafeInteger(count) || count < 0) {
        throw new Error(
            `Cannot verify the member count for label "${label?.name ?? label?.id ?? 'unknown'}". Ghost must return count.members before labels can be deleted.`,
        );
    }
    return count;
};

// Ghost 6 returns at most 100 labels per page
const LABELS_PAGE_SIZE = 100;

// Named labels are fetched with a filter in the query string. Proxies in front of Ghost
// commonly reject request lines over 8 KB (nginx's default), so each filter stays well
// under that once URL-encoded. 50 names of 20 characters fit in about 3 KB; longer or
// non-ASCII names start a new batch sooner
const MAX_NAMES_PER_FILTER = 50;
const MAX_ENCODED_FILTER_LENGTH = 4000;

// NQL has no escape for a backslash, and quoting a quote by hand is easy to get wrong, so
// names containing either are never put in a filter. Any such name makes the run fetch
// every label instead, which is slower on a large site but always correct
const canFilterBy = (name) => !/['"\\]/.test(name.raw);

/**
 * Builds an NQL filter for labels whose name or slug is one of the given values. It only
 * narrows what's fetched: `selectLabels` still decides what matches.
 *
 * Names are sent as given. MySQL compares `labels.name` case-insensitively, so case
 * variants come back too. SQLite compares it case-sensitively (mongo-knex compiles
 * `name:[...]` to a plain `IN`), so there a name only comes back when typed in its exact
 * case, or when its lower-cased form is the label's slug. A label missed that way is
 * reported as not in Ghost, and isn't deleted
 *
 * @param {Array<{raw: string, normalised: string}>} names Names that pass `canFilterBy`
 * @returns {string}
 */
const nameFilter = (names) => {
    const values = (key) => names.map((name) => `'${name[key]}'`).join(',');
    // Slugs are stored in lower case
    return `name:[${values('raw')}],slug:[${values('normalised')}]`;
};

/**
 * Splits named labels into filters short enough to send in a URL
 *
 * @param {Array<{raw: string, normalised: string}>} names At least one name, each passing `canFilterBy`
 * @returns {Array<string>}
 */
const nameFilters = (names) => {
    const batches = [];
    let batch = [];

    for (const name of names) {
        const candidate = [...batch, name];
        const tooLong =
            candidate.length > MAX_NAMES_PER_FILTER ||
            encodeURIComponent(nameFilter(candidate)).length > MAX_ENCODED_FILTER_LENGTH;

        if (batch.length > 0 && tooLong) {
            batches.push(batch);
            batch = [name];
        } else {
            batch = candidate;
        }
    }
    batches.push(batch);

    return batches.map(nameFilter);
};

/**
 * Fetches every page of labels matching a filter, with their member counts. Throws on the
 * first invalid page or label, so a partial or unverifiable list never reaches selection
 *
 * @param {object} args
 * @param {string|null} filter NQL filter, or `null` for every label
 * @param {(labels: Array<object>) => void} onPage Called with each page's labels
 * @returns {Promise<void>}
 */
const fetchLabels = async (args, filter, onPage) => {
    let page = 1;
    do {
        const response = await axios.get(
            `${args.apiURL}/ghost/api/admin/labels/`,
            requestOptions(args, {
                include: 'count.members',
                limit: LABELS_PAGE_SIZE,
                page,
                order: 'id asc',
                ...(filter && { filter }),
            }),
        );
        const labels = response.data?.labels;
        const next = response.data?.meta?.pagination?.next;
        if (
            !Array.isArray(labels) ||
            (next !== null && (!Number.isSafeInteger(next) || next <= page))
        ) {
            throw new Error('Ghost returned an invalid labels page. No labels were deleted.');
        }

        for (const label of labels) {
            if (!label?.id || typeof label.name !== 'string') {
                throw new Error('Ghost returned an invalid label. No labels were deleted.');
            }
            getMemberCount(label);
        }
        onPage(labels);
        page = next;
        if (page !== null) {
            await sleep(args.delayBetweenCalls);
        }
    } while (page !== null);
};

/**
 * Checks the flags pick exactly one set of labels to consider, and only combine the
 * keep list with the modes it applies to
 *
 * @param {object} args
 * @throws {errors.ValidationError}
 */
const validateSelection = (args) => {
    // Blank values are dropped before matching, so only real names make a named selection
    const named = keepValuesFrom(args.labels).length > 0;
    const modes = [named, Boolean(args.all), Boolean(args.unused)].filter(Boolean);
    const hasKeepList = hasValues(args.keep) || Boolean(args.keepFile);

    if (modes.length !== 1) {
        throw new errors.ValidationError({
            message: 'Choose exactly one of --labels, --all or --unused.',
        });
    }

    if (named && hasKeepList) {
        throw new errors.ValidationError({
            message: '--keep and --keepFile only apply to --all and --unused.',
        });
    }

    // Deleting every label is rarely what anyone wants, and can't be undone
    if (args.all && !hasKeepList && !args.force) {
        throw new errors.ValidationError({
            message:
                'Refusing to delete every label without a keep list. Pass --keep or --keepFile, or use --force to delete them all.',
        });
    }
};

/**
 * Decides which labels to delete. Labels are matched by name or slug, ignoring case
 *
 * @param {Array<object>} labels Labels from Ghost, with `count.members`
 * @param {object} selection
 * @param {Array<{raw: string, normalised: string}>|null} [selection.names] Labels to delete
 *   (`--labels`). Any array, even an empty one, selects only these, so a name list that ends
 *   up empty deletes nothing rather than falling through to every label
 * @param {boolean} [selection.unused] Only delete labels with no members
 * @param {Array<{raw: string, normalised: string}>} [selection.keepValues] Labels never to delete
 * @returns {{toDelete: Array<object>, toKeep: Array<{label: object, keptBy: string, value: string}>, unmatched: Array<string>}}
 */
const selectLabels = (labels, { names = null, unused = false, keepValues = [] } = {}) => {
    const toDelete = [];
    const toKeep = [];
    const usedValues = new Set();

    labels.forEach((label) => {
        if (names) {
            const matches = findMatches(label, names, 'either');
            matches.forEach(({ csvValue }) => usedValues.add(csvValue.normalised));
            if (matches.length > 0) {
                toDelete.push(label);
            }
            return;
        }

        const matches = findMatches(label, keepValues, 'either');
        matches.forEach(({ csvValue }) => usedValues.add(csvValue.normalised));
        const [match] = matches;

        if (match) {
            toKeep.push({ label, keptBy: match.matchedBy, value: match.csvValue.raw });
        } else if (unused && getMemberCount(label) > 0) {
            toKeep.push({ label, keptBy: 'in_use', value: '' });
        } else {
            toDelete.push(label);
        }
    });

    const unmatched = (names ?? keepValues)
        .filter((value) => !usedValues.has(value.normalised))
        .map((value) => value.raw);

    return { toDelete, toKeep, unmatched };
};

/**
 * Builds the rows of the report CSV from a scan, and any deletion that followed
 *
 * @param {object} ctx
 * @returns {Array<object>}
 */
const buildReportRows = (ctx) => {
    const dryRun = isDryRun(ctx.args);
    const deletedIds = new Set(ctx.deleted.map((label) => label.id));
    const skippedIds = new Set(ctx.skipped.map((label) => label.id));
    const failures = new Map(ctx.failed.map(({ label, error }) => [label.id, error]));

    const labelRow = (action, label, extra = {}) => ({
        action,
        id: label.id ?? '',
        name: label.name ?? '',
        slug: label.slug ?? '',
        member_count: label.count?.members ?? '',
        kept_by: extra.keptBy ?? '',
        value: extra.value ?? '',
        error: extra.error ?? '',
    });

    // Deletions first, as they're what a human reviews
    const deletionRows = ctx.toDelete.map((label) => {
        if (dryRun) {
            return labelRow('would_delete', label);
        }
        if (deletedIds.has(label.id)) {
            return labelRow('deleted', label);
        }
        if (skippedIds.has(label.id)) {
            return labelRow('skipped_now_in_use', label);
        }
        if (failures.has(label.id)) {
            return labelRow('delete_failed', label, {
                error: errorMessage(failures.get(label.id)),
            });
        }
        return labelRow('not_attempted', label);
    });

    const keptRows = ctx.toKeep.map(({ label, keptBy, value }) =>
        labelRow('kept', label, { keptBy, value }),
    );
    const unmatchedRows = ctx.unmatched.map((value) => labelRow('not_in_ghost', {}, { value }));

    return [...deletionRows, ...keptRows, ...unmatchedRows];
};

/**
 * Writes the report CSV next to the keep file, or to the working directory
 *
 * @param {object} ctx
 * @returns {Promise<string>} The path of the report
 */
const writeReport = async (ctx) => {
    const rows = buildReportRows(ctx);
    const fileName = `delete-labels-report-${isDryRun(ctx.args) ? 'dry-run' : 'run'}-${Date.now()}.csv`;
    const directory = ctx.args.keepFile ? path.dirname(ctx.args.keepFile) : process.cwd();
    const reportPath = path.resolve(directory, fileName);

    // Use our own CSV writer, as `fsUtils.csv.jsonToCSV` doesn't escape quotes or newlines
    await fs.writeFile(reportPath, rows.length ? jsonToCSV(rows) : REPORT_COLUMNS.join(','));

    return reportPath;
};

const getScanTaskRunner = (options) => {
    const tasks = [
        {
            title: 'Initialising API connection',
            task: (ctx) => {
                ctx.args = {
                    delayBetweenCalls: 50,
                    concurrency: 1,
                    ...options,
                    apiURL: options.apiURL
                        .trim()
                        .replace(/\/+$/, '')
                        .replace('localhost', '127.0.0.1'),
                };
                ctx.errors = [];
                ctx.keepValues = [];
                ctx.labels = [];
                ctx.toDelete = [];
                ctx.toKeep = [];
                ctx.unmatched = [];
                ctx.deleted = [];
                ctx.skipped = [];
                ctx.failed = [];
                ctx.confirmed = false;
                ctx.scanComplete = false;

                validateSelection(ctx.args);
            },
        },
        {
            title: 'Reading labels to keep',
            enabled: () => hasValues(options.keep) || Boolean(options.keepFile),
            task: async (ctx, task) => {
                const fromFile = ctx.args.keepFile
                    ? (await readKeepFile(ctx.args.keepFile)).keepValues.map(({ raw }) => raw)
                    : [];

                ctx.keepValues = keepValuesFrom([...(ctx.args.keep ?? []), ...fromFile]);

                // An empty keep list means "keep nothing", which would delete every label
                if (ctx.keepValues.length === 0 && !ctx.args.force) {
                    throw new errors.ValidationError({
                        message:
                            'The keep list is empty (the first row of --keepFile is always treated as a header). Refusing to continue. Use --force to override.',
                    });
                }

                task.output = `Keeping ${ctx.keepValues.length} labels`;
            },
        },
        {
            title: 'Fetching labels and their member counts',
            task: async (ctx, task) => {
                // --all and --unused must see every label. Named labels only need their own,
                // unless one of them can't be put in a filter
                const names = keepValuesFrom(ctx.args.labels);
                const filters =
                    names.length > 0 && names.every(canFilterBy) ? nameFilters(names) : [null];
                // A label can come back for both its name and its slug, or in two batches
                const labelsById = new Map();

                for (const [index, filter] of filters.entries()) {
                    if (index > 0) {
                        await sleep(ctx.args.delayBetweenCalls);
                    }
                    await fetchLabels(ctx.args, filter, (labels) => {
                        labels.forEach((label) => labelsById.set(label.id, label));
                        task.output = `Fetched ${labelsById.size} labels`;
                    });
                }

                ctx.labels = [...labelsById.values()];
            },
        },
        {
            title: 'Selecting labels to delete',
            task: (ctx, task) => {
                const plan = selectLabels(ctx.labels, {
                    names: hasValues(ctx.args.labels) ? keepValuesFrom(ctx.args.labels) : null,
                    unused: Boolean(ctx.args.unused),
                    keepValues: ctx.keepValues,
                });

                ctx.toDelete = plan.toDelete;
                ctx.toKeep = plan.toKeep;
                ctx.unmatched = plan.unmatched;

                // If nothing on the keep list matched, the list is almost certainly wrong,
                // and continuing would delete labels the user meant to keep
                const keepListMatchedNothing =
                    ctx.keepValues.length > 0 && ctx.unmatched.length === ctx.keepValues.length;
                if (ctx.labels.length > 0 && keepListMatchedNothing && !ctx.args.force) {
                    throw new errors.ValidationError({
                        message: `None of the ${ctx.keepValues.length} labels to keep matched a label in Ghost. Refusing to continue. Check the names or slugs, or use --force to override.`,
                    });
                }

                ctx.scanComplete = true;
                task.output = `Deleting ${ctx.toDelete.length} of ${ctx.labels.length} labels`;
            },
        },
    ];
    return makeTaskRunner(tasks, { ...options, topLevel: true });
};

const getDeleteTaskRunner = (options) => {
    const tasks = [
        {
            title: 'Deleting labels',
            task: (ctx) => {
                if (!ctx.scanComplete || ctx.confirmed !== true || isDryRun(ctx.args)) {
                    throw new Error(
                        'Deleting labels requires a completed scan and explicit confirmation.',
                    );
                }

                return makeTaskRunner(
                    ctx.toDelete.map((label) => ({
                        title: `Delete label ${label.name}`,
                        task: async (ctx, task) => {
                            const url = `${ctx.args.apiURL}/ghost/api/admin/labels/${encodeURIComponent(label.id)}/`;
                            try {
                                // Recheck after confirmation: a label may have gained members meanwhile.
                                // Only --unused promises not to touch labels with members
                                if (ctx.args.unused) {
                                    const response = await axios.get(
                                        url,
                                        requestOptions(ctx.args, { include: 'count.members' }),
                                    );
                                    const currentLabel = response.data?.labels?.find(
                                        (item) => item.id === label.id,
                                    );
                                    if (getMemberCount(currentLabel) > 0) {
                                        ctx.skipped.push(label);
                                        task.output = 'Skipped: this label now has members';
                                        await sleep(ctx.args.delayBetweenCalls);
                                        return;
                                    }
                                }

                                // Every delete loads the label's members, detaches them and
                                // purges the site cache, so these are paced rather than batched
                                await axios.delete(url, requestOptions(ctx.args));
                                // Ghost returns 204 with no label in the response body.
                                ctx.deleted.push(label);
                                await sleep(ctx.args.delayBetweenCalls);
                            } catch (error) {
                                ctx.failed.push({ label, error });
                                ctx.errors.push(error);
                                throw error;
                            }
                        },
                    })),
                    { ...options, concurrent: ctx.args.concurrency, exitOnError: true },
                );
            },
        },
    ];
    return makeTaskRunner(tasks, { ...options, topLevel: true });
};

export {
    REPORT_COLUMNS,
    errorMessage,
    getMemberCount,
    validateSelection,
    selectLabels,
    buildReportRows,
    writeReport,
};

export default {
    getScanTaskRunner,
    errorMessage,
    getDeleteTaskRunner,
    validateSelection,
    selectLabels,
    buildReportRows,
    writeReport,
};
