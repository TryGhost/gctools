import {ui} from '@tryghost/pretty-cli';
import commentNotifications from '../tasks/comment-notifications.js';

// Internal ID in case we need one.
export const id = 'comment-notifications';
export const group = 'Content:';

// The command to run and any params
export const flags = 'comment-notifications <apiURL> <adminAPIKey>';

// Description for the top level command
export const desc = 'Set comment notifications for all staff users';

// Descriptions for the individual params
export const paramsDesc = ['URL to your Ghost API', 'Admin API key'];

// Configure all the options
export const setup = (sywac) => {
    sywac.boolean('-V --verbose', {
        defaultValue: false,
        desc: 'Show verbose output'
    });

    sywac.enumeration('--value', {
        defaultValue: null,
        choices: ['true', 'false'],
        desc: 'Enable (true) or disable (false) comment notifications'
    });

    sywac.number('--delayBetweenCalls', {
        defaultValue: 1000,
        desc: 'The delay between API calls, in ms'
    });

    sywac.string('--backup', {
        defaultValue: null,
        desc: 'Path to save backup CSV before making changes'
    });

    sywac.string('--restore', {
        defaultValue: null,
        desc: 'Path to CSV file to restore settings from'
    });
};

// What to do when this command is executed
export const run = async (argv) => {
    let timer = Date.now();
    let context = {errors: []};

    // Validate that at least one action is specified
    if (!argv.backup && !argv.restore && argv.value === null) {
        ui.log.error('No action specified. Please provide at least one of: --backup, --restore, or --value');
        ui.log.info('See the README for usage examples, or run with --help for available options.');
        return;
    }

    // Validate conflicting options
    if (argv.restore && argv.value !== null) {
        ui.log.error('Cannot use --restore with --value. Restore uses values from the CSV file.');
        return;
    }

    // Convert string value to boolean (null stays null)
    const value = argv.value === 'true' ? true : argv.value === 'false' ? false : null;

    // Map CLI flags to task options
    const options = {
        ...argv,
        value,
        backupPath: argv.backup,
        restorePath: argv.restore
    };

    if (argv.verbose) {
        if (argv.restore) {
            ui.log.info(`Restoring comment_notifications from ${argv.restore}`);
        } else if (value !== null) {
            ui.log.info(`Setting comment_notifications to ${value}`);
        } else if (argv.backup) {
            ui.log.info(`Backing up comment_notifications to ${argv.backup}`);
        }
    }

    try {
        // Fetch the tasks, configured correctly
        let runner = commentNotifications.getTaskRunner(options);

        // Run the migration
        await runner.run(context);
    } catch (error) {
        ui.log.error('Done with errors', context.errors);
    }

    // Report results
    let messages = [];

    if (context.backedUp > 0) {
        messages.push(`backed up ${context.backedUp} users`);
    }

    if (context.restored && context.restored.length > 0) {
        messages.push(`restored ${context.restored.length} users`);
    }

    if (context.updated && context.updated.length > 0) {
        messages.push(`updated ${context.updated.length} users`);
    }

    if (context.skipped && context.skipped.length > 0) {
        messages.push(`skipped ${context.skipped.length} users`);
    }

    if (messages.length > 0) {
        ui.log.ok(`Successfully ${messages.join(', ')} in ${Date.now() - timer}ms.`);
    } else {
        ui.log.ok(`No changes made in ${Date.now() - timer}ms.`);
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
