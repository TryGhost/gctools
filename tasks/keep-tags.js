import GhostAdminAPI from '@tryghost/admin-api';
import {makeTaskRunner} from '@tryghost/listr-smart-renderer';
import {ui} from '@tryghost/pretty-cli';
import _ from 'lodash';
import fs from 'fs-extra';
import fsUtils from '@tryghost/mg-fs-utils';
import path from 'node:path';
import errors from '@tryghost/errors';
import {discover} from '../lib/batch-ghost-discover.js';
import {sleep, jsonToCSV} from '../lib/utils.js';

const REPORT_COLUMNS = ['action', 'id', 'name', 'slug', 'post_count', 'matched_by', 'csv_value', 'error'];

const isDryRun = options => Boolean(options.dryRun || options['dry-run']);

const normalise = value => String(value ?? '').trim().toLowerCase();

// Ghost prefixes internal tag names with `#` and their slugs with `hash-`, and sets
// `visibility` to `internal`. Any one of those is enough to protect a tag from deletion
const isInternalTag = (tag) => {
    return tag?.visibility === 'internal'
        || normalise(tag?.name).startsWith('#')
        || normalise(tag?.slug).startsWith('#')
        || normalise(tag?.slug).startsWith('hash-');
};

// Takes the parsed CSV rows and returns the deduped values of the first column.
// The raw value is kept alongside the normalised one so the report can echo back
// exactly what was in the file
const getKeepValues = (rows) => {
    if (!rows || rows.length === 0) {
        return [];
    }

    const column = Object.keys(rows[0])[0];
    const seen = new Set();
    const values = [];

    rows.forEach((row) => {
        const raw = row[column];
        const value = normalise(raw);

        if (!value || seen.has(value)) {
            return;
        }

        seen.add(value);
        values.push({raw: String(raw).trim(), normalised: value});
    });

    return values;
};

const findMatch = (tag, keepValues, matchBy) => {
    const tagSlug = normalise(tag.slug);
    const tagName = normalise(tag.name);

    for (const value of keepValues) {
        if (matchBy !== 'name' && value.normalised === tagSlug) {
            return {matchedBy: 'slug', csvValue: value};
        }

        if (matchBy !== 'slug' && value.normalised === tagName) {
            return {matchedBy: 'name', csvValue: value};
        }
    }

    return null;
};

// Splits every Ghost tag into keep / keep-because-internal / delete, and reports which
// CSV values matched nothing. Matching happens before the internal check so a CSV value
// that only names an internal tag isn't wrongly reported as unmatched
const partitionTags = (tags, keepValues, matchBy = 'slug') => {
    const toKeep = [];
    const toKeepInternal = [];
    const toDelete = [];
    const usedValues = new Set();

    tags.forEach((tag) => {
        const match = findMatch(tag, keepValues, matchBy);

        if (match) {
            usedValues.add(match.csvValue.normalised);
        }

        if (isInternalTag(tag)) {
            toKeepInternal.push({tag, matchedBy: 'internal', csvValue: match ? match.csvValue.raw : ''});
        } else if (match) {
            // Ghost allows duplicate tag names, so one CSV value can legitimately keep
            // several tags when matching by name
            toKeep.push({tag, matchedBy: match.matchedBy, csvValue: match.csvValue.raw});
        } else {
            toDelete.push(tag);
        }
    });

    const unmatched = keepValues.filter(value => !usedValues.has(value.normalised)).map(value => value.raw);

    return {toKeep, toKeepInternal, toDelete, unmatched};
};

const initialise = (options) => {
    return {
        title: 'Initialising API connection',
        task: (ctx, task) => {
            let defaults = {
                verbose: false,
                matchBy: 'slug',
                dryRun: false,
                'dry-run': false,
                force: false,
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
            // Don't clobber an errors array the caller has already seeded
            ctx.errors = ctx.errors || [];
            ctx.keepValues = [];
            ctx.tags = [];
            ctx.toKeep = [];
            ctx.toKeepInternal = [];
            ctx.toDelete = [];
            ctx.deleted = [];
            ctx.failed = [];
            ctx.unmatched = [];
            ctx.reportRows = [];
            ctx.reportPath = null;

            task.output = `Initialised API connection for ${options.apiURL}`;
        }
    };
};

const getFullTaskList = (options) => {
    const dryRun = isDryRun(options);

    return [
        initialise(options),
        {
            title: 'Reading tags CSV',
            task: async (ctx, task) => {
                if (!await fs.pathExists(ctx.args.csvFile)) {
                    const error = new errors.NotFoundError({
                        message: `CSV file not found: ${ctx.args.csvFile}`
                    });
                    ctx.errors.push(error);
                    throw error;
                }

                let rows;

                try {
                    rows = await fsUtils.csv.parseCSV(ctx.args.csvFile);
                } catch (parseError) {
                    const error = new errors.ValidationError({
                        message: `Failed to parse CSV file: ${parseError.message}`
                    });
                    ctx.errors.push(error);
                    throw error;
                }

                ctx.keepValues = getKeepValues(rows);

                // Without this guard, an empty or header-only CSV means "keep nothing",
                // which would delete every tag on the site
                if (ctx.keepValues.length === 0 && !ctx.args.force) {
                    const error = new errors.ValidationError({
                        message: 'The CSV contains no tag values (the first row is always treated as a header). Refusing to continue, as every tag would be deleted. Use --force to override.'
                    });
                    ctx.errors.push(error);
                    throw error;
                }

                const column = rows.length ? Object.keys(rows[0])[0] : null;
                task.output = `Found ${ctx.keepValues.length} tags to keep in column "${column}"`;
            }
        },
        {
            title: 'Fetch tags from Ghost API',
            task: async (ctx, task) => {
                try {
                    // `discover` includes `count.posts` for tags automatically
                    ctx.tags = await discover({
                        api: ctx.api,
                        type: 'tags'
                    });

                    task.output = `Found ${ctx.tags.length} tags`;
                } catch (error) {
                    ctx.errors.push(error);
                    throw error;
                }
            }
        },
        {
            title: 'Determining tags to keep and delete',
            task: (ctx, task) => {
                const plan = partitionTags(ctx.tags, ctx.keepValues, ctx.args.matchBy);

                ctx.toKeep = plan.toKeep;
                ctx.toKeepInternal = plan.toKeepInternal;
                ctx.toDelete = plan.toDelete;
                ctx.unmatched = plan.unmatched;

                if (ctx.unmatched.length > 0) {
                    ui.log.warn(`\n${ctx.unmatched.length} CSV value${ctx.unmatched.length === 1 ? '' : 's'} matched no Ghost tag:`);

                    const shown = ctx.args.verbose ? ctx.unmatched : ctx.unmatched.slice(0, 10);
                    shown.forEach(value => ui.log.warn(`  - ${value}`));

                    if (shown.length < ctx.unmatched.length) {
                        ui.log.warn(`  ...and ${ctx.unmatched.length - shown.length} more. Use --verbose to see the full list.`);
                    }
                }

                // If nothing matched, the CSV or `--matchBy` is almost certainly wrong, and
                // continuing would delete every non-internal tag on the site
                if (ctx.tags.length > 0 && ctx.toKeep.length === 0 && !ctx.args.force) {
                    const error = new errors.ValidationError({
                        message: `None of the ${ctx.keepValues.length} CSV values matched any Ghost tag using --matchBy ${ctx.args.matchBy}. Refusing to delete all ${ctx.toDelete.length} tags. Check the CSV column, or try --matchBy name or --matchBy either. Use --force to override.`
                    });
                    ctx.errors.push(error);
                    throw error;
                }

                task.output = `Keeping ${ctx.toKeep.length} tags (plus ${ctx.toKeepInternal.length} internal), deleting ${ctx.toDelete.length}`;
            }
        },
        {
            title: 'Reporting changes',
            enabled: () => dryRun,
            task: (ctx, task) => {
                task.title = `Would delete ${ctx.toDelete.length} tag${ctx.toDelete.length === 1 ? '' : 's'}`;

                if (ctx.toDelete.length > 0 && (ctx.args.verbose || ctx.toDelete.length <= 20)) {
                    ui.log.info('\n[DRY RUN] Would delete the following tags:');
                    ctx.toDelete.forEach((tag) => {
                        ui.log.info(`  - ${tag.name} (${tag.slug}) - ${tag.count?.posts ?? 0} posts`);
                    });
                }

                task.output = 'Re-run without --dryRun to apply changes.';
            }
        },
        {
            title: 'Deleting tags from Ghost',
            enabled: () => !dryRun,
            skip: (ctx) => {
                if (ctx.toDelete.length === 0) {
                    return 'No tags to delete';
                }
            },
            task: async (ctx) => {
                const tasks = ctx.toDelete.map(tag => ({
                    title: `${tag.name} (${tag.slug})`,
                    task: async () => {
                        try {
                            await ctx.api.tags.delete({id: tag.id});
                            // `tags.delete` responds 204 with an empty body, so push the tag
                            // we know about rather than anything from the response
                            ctx.deleted.push(tag);
                            await sleep(ctx.args.delayBetweenCalls);
                        } catch (error) {
                            error.resource = {
                                name: tag.name
                            };
                            error.object = tag;
                            ctx.failed.push({tag, error});
                            ctx.errors.push(error);
                            // Nested runners get `exitOnError: false` from `makeTaskRunner`, so
                            // this marks the subtask failed without aborting the run — the report
                            // step still needs to record what happened
                            throw error;
                        }
                    }
                }));

                // `makeTaskRunner` mutates the options object it's given, so pass a copy
                return makeTaskRunner(tasks, {...options, concurrent: 3});
            }
        },
        {
            title: 'Writing report CSV',
            task: async (ctx, task) => {
                const deletedIds = new Set(ctx.deleted.map(tag => tag.id));
                const failures = new Map(ctx.failed.map(({tag, error}) => [tag.id, error]));

                const tagRow = (action, tag, extra = {}) => ({
                    action,
                    id: tag.id ?? '',
                    name: tag.name ?? '',
                    slug: tag.slug ?? '',
                    post_count: tag.count?.posts ?? '',
                    matched_by: extra.matchedBy ?? '',
                    csv_value: extra.csvValue ?? '',
                    error: extra.error ?? ''
                });

                // Deletions first — they're what a human reviews
                const deletionRows = ctx.toDelete.map((tag) => {
                    if (dryRun) {
                        return tagRow('would_delete', tag);
                    }

                    if (deletedIds.has(tag.id)) {
                        return tagRow('deleted', tag);
                    }

                    return tagRow('delete_failed', tag, {error: failures.get(tag.id)?.message ?? 'Unknown error'});
                });

                const keptRows = ctx.toKeep.map(({tag, matchedBy, csvValue}) => tagRow('kept', tag, {matchedBy, csvValue}));
                const internalRows = ctx.toKeepInternal.map(({tag, matchedBy, csvValue}) => tagRow('kept_internal', tag, {matchedBy, csvValue}));
                const unmatchedRows = ctx.unmatched.map(value => tagRow('not_in_ghost', {}, {csvValue: value}));

                ctx.reportRows = [...deletionRows, ...keptRows, ...internalRows, ...unmatchedRows];

                const fileName = `keep-tags-report-${dryRun ? 'dry-run' : 'run'}-${Date.now()}.csv`;
                ctx.reportPath = path.join(path.dirname(ctx.args.csvFile), fileName);

                // Use our own CSV writer, as `fsUtils.csv.jsonToCSV` doesn't escape quotes
                // or newlines, which corrupts tag names and error messages
                const csv = ctx.reportRows.length ? jsonToCSV(ctx.reportRows) : REPORT_COLUMNS.join(',');
                await fs.writeFile(ctx.reportPath, csv);

                task.output = `Report written to ${path.resolve(ctx.reportPath)}`;
            }
        }
    ];
};

const getTaskRunner = (options) => {
    let tasks = [];

    tasks = getFullTaskList(options);

    return makeTaskRunner(tasks, Object.assign({topLevel: true}, options));
};

export {
    normalise,
    isInternalTag,
    getKeepValues,
    partitionTags
};

export default {
    initialise,
    getFullTaskList,
    getTaskRunner,
    normalise,
    isInternalTag,
    getKeepValues,
    partitionTags
};
