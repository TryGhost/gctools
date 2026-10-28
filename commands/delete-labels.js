import confirm from '@inquirer/confirm';
import { ui } from '@tryghost/pretty-cli';
import deleteLabels from '../tasks/delete-labels.js';

// Internal ID in case we need one.
const id = 'delete-labels';

const group = 'Members:';

// The command to run and any params
const flags = 'delete-labels <apiURL> <adminAPIKey>';

// Description for the top level command
const desc = 'Delete named, unused or all member labels, optionally keeping a list of labels';

// Descriptions for the individual params
const paramsDesc = ['URL to your Ghost API', 'Admin API key'];

// How many labels to list before deferring to --verbose and the report
const LIST_LIMIT = 20;

// Configure all the options
const setup = (sywac) => {
    sywac.boolean('-V --verbose', {
        defaultValue: false,
        desc: 'Show verbose output',
    });
    sywac.array('--labels', {
        defaultValue: null,
        desc: "Names or slugs of the labels to delete, in the format 'First' 'Second'",
    });
    sywac.boolean('--all', {
        defaultValue: false,
        desc: 'Delete every label. Requires --keep, --keepFile or --force',
    });
    sywac.boolean('--unused', {
        defaultValue: false,
        desc: 'Delete only labels that no member has',
    });
    sywac.array('--keep', {
        defaultValue: null,
        desc: "Names or slugs of labels never to delete, in the format 'First' 'Second'. Use with --all or --unused",
    });
    sywac.string('--keepFile', {
        defaultValue: null,
        desc: 'Path to a single-column CSV of label names or slugs never to delete (the first row is always treated as a header). Use with --all or --unused',
    });
    sywac.boolean('--dryRun', {
        defaultValue: false,
        desc: 'Report which labels would be deleted, without prompting or deleting',
    });
    sywac.boolean('--force', {
        defaultValue: false,
        desc: 'Bypass the safety checks for --all without a keep list, and for a keep list that is empty or matches nothing. You are still asked to confirm',
    });
    sywac.number('--concurrency', {
        defaultValue: 1,
        desc: 'How many labels to delete at once. Each delete is expensive for Ghost, so raise this with care',
    });
    sywac.number('--timeout', {
        defaultValue: 60000,
        desc: 'How long to wait for Ghost to answer each request, in ms. Raise it if deleting labels with very many members times out',
    });
    sywac.number('--delayBetweenCalls', {
        defaultValue: 50,
        desc: 'The delay between API calls, in ms',
    });
};

const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`;

const listLabels = (labels, verbose) => {
    const shown = verbose ? labels : labels.slice(0, LIST_LIMIT);
    for (const label of shown) {
        ui.log.info(`  ${label.name} (${label.id}) - ${plural(label.count.members, 'member')}`);
    }
    if (shown.length < labels.length) {
        ui.log.info(
            `  ...and ${labels.length - shown.length} more. Use --verbose or see the report for the full list.`,
        );
    }
};

// What to do when this command is executed
const run = async (argv) => {
    const timer = Date.now();
    const context = { errors: [] };
    let shouldReport = false;

    try {
        await deleteLabels.getScanTaskRunner(argv).run(context);

        if (context.unmatched.length > 0) {
            ui.log.warn(
                `${plural(context.unmatched.length, 'label')} named on the command line or keep list matched nothing in Ghost: ${context.unmatched.join(', ')}`,
            );
        }

        if (context.toDelete.length === 0) {
            ui.log.ok(`No labels to delete among ${plural(context.labels.length, 'label')}.`);
            return;
        }

        const memberAssignments = context.toDelete.reduce(
            (total, label) => total + label.count.members,
            0,
        );

        ui.log.info(
            `Found ${plural(context.toDelete.length, 'label')} to delete on ${argv.apiURL}, keeping ${context.toKeep.length}:`,
        );
        listLabels(context.toDelete, argv.verbose);

        if (argv.dryRun) {
            shouldReport = true;
            ui.log.ok('Dry run complete. No labels were deleted.');
            return;
        }

        // Prompt outside the task runner so its renderer cannot interfere with input.
        context.confirmed = await confirm({
            message: `Permanently delete ${plural(context.toDelete.length, 'label')} from ${argv.apiURL}? This removes ${plural(memberAssignments, 'label assignment')} from members.`,
            default: false,
        });
        if (!context.confirmed) {
            ui.log.info('Cancelled. No labels were deleted.');
            return;
        }

        shouldReport = true;
        await deleteLabels.getDeleteTaskRunner(argv).run(context);
        ui.log.ok(
            `Deleted ${plural(context.deleted.length, 'label')}; skipped ${context.skipped.length} that now have members in ${Date.now() - timer}ms.`,
        );
    } catch (error) {
        if (error.name === 'ExitPromptError' || error.name === 'AbortPromptError') {
            ui.log.info('Cancelled. No labels were deleted.');
            return;
        }
        const message = deleteLabels.errorMessage(error);
        // Only mention progress once deletion started, so a failed check doesn't read like one
        ui.log.error(
            context.confirmed
                ? `Stopped after deleting ${plural(context.deleted.length, 'label')}: ${message}`
                : message,
        );
        process.exitCode = 1;
    } finally {
        if (shouldReport) {
            const reportPath = await deleteLabels.writeReport(context);
            ui.log.info(`Report written to ${reportPath}`);
        }
    }
};

export default {
    id,
    group,
    flags,
    desc,
    paramsDesc,
    setup,
    run,
};
