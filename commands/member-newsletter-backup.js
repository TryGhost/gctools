import {ui} from '@tryghost/pretty-cli';
import memberNewsletterBackup from '../tasks/member-newsletter-backup.js';

// Internal ID in case we need one.
export const id = 'member-newsletter-backup';
export const group = 'Members:';

// The command to run and any params
export const flags = 'member-newsletter-backup <apiURL> <adminAPIKey>';

// Description for the top level command
export const desc = 'Backup and restore member newsletter preferences';

// Descriptions for the individual params
export const paramsDesc = ['URL to your Ghost API', 'Admin API key'];

// Configure all the options
export const setup = (sywac) => {
    sywac.boolean('-V --verbose', {
        defaultValue: false,
        desc: 'Show verbose output'
    });

    sywac.string('--backup', {
        defaultValue: null,
        desc: 'Path to save backup CSV'
    });

    sywac.string('--restore', {
        defaultValue: null,
        desc: 'Path to CSV file to restore from'
    });

    sywac.boolean('--dry-run', {
        defaultValue: false,
        desc: 'Show what would be changed without making changes (restore only)'
    });

    sywac.number('--delayBetweenCalls', {
        defaultValue: 50,
        desc: 'The delay between API calls, in ms'
    });

    sywac.array('--label', {
        defaultValue: null,
        desc: 'Filter members by label slug (backup only, can specify multiple)'
    });
};

// What to do when this command is executed
export const run = async (argv) => {
    let timer = Date.now();
    let context = {errors: []};

    // Validate that at least one action is specified
    if (!argv.backup && !argv.restore) {
        ui.log.error('No action specified. Please provide either --backup or --restore');
        ui.log.info('Examples:');
        ui.log.info('  Backup:  gctools member-newsletter-backup <url> <key> --backup ./backup.csv');
        ui.log.info('  Restore: gctools member-newsletter-backup <url> <key> --restore ./backup.csv');
        return;
    }

    // Validate conflicting options
    if (argv.backup && argv.restore) {
        ui.log.error('Cannot use --backup and --restore together. Please specify only one.');
        return;
    }

    // Validate dry-run only with restore
    if (argv.dryRun && !argv.restore) {
        ui.log.error('--dry-run can only be used with --restore');
        return;
    }

    // Validate label only with backup
    if (argv.label && argv.label.length > 0 && argv.restore) {
        ui.log.error('--label can only be used with --backup');
        return;
    }

    // Map CLI flags to task options
    const options = {
        ...argv,
        backupPath: argv.backup,
        restorePath: argv.restore,
        dryRun: argv.dryRun
    };

    if (argv.verbose) {
        if (argv.restore) {
            ui.log.info(`Restoring newsletter preferences from ${argv.restore}${argv.dryRun ? ' (dry run)' : ''}`);
        } else if (argv.backup) {
            ui.log.info(`Backing up newsletter preferences to ${argv.backup}`);
            if (argv.label && argv.label.length > 0) {
                ui.log.info(`Filtering by labels: ${argv.label.join(', ')}`);
            }
        }
    }

    try {
        // Fetch the tasks, configured correctly
        let runner = memberNewsletterBackup.getTaskRunner(options);

        // Run the migration
        await runner.run(context);
    } catch (error) {
        ui.log.error('Done with errors', context.errors);
    }

    // Report results
    let messages = [];

    if (context.backedUp > 0) {
        messages.push(`backed up ${context.backedUp} members`);
    }

    if (context.restored && context.restored.length > 0) {
        if (argv.dryRun) {
            messages.push(`would update ${context.restored.length} members`);
        } else {
            messages.push(`restored ${context.restored.length} members`);
        }
    }

    if (context.skipped && context.skipped.length > 0) {
        messages.push(`skipped ${context.skipped.length} members`);
    }

    if (messages.length > 0) {
        ui.log.ok(`Successfully ${messages.join(', ')} in ${Date.now() - timer}ms.`);
    } else {
        ui.log.ok(`No changes made in ${Date.now() - timer}ms.`);
    }

    // Show skipped details in verbose mode
    if (argv.verbose && context.skipped && context.skipped.length > 0) {
        ui.log.info('Skipped members:');
        for (const skipped of context.skipped) {
            ui.log.info(`  ${skipped.email}: ${skipped.reason}`);
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
    run
};
