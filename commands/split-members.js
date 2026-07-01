import {ui} from '@tryghost/pretty-cli';
import splitMembers from '../tasks/split-members.js';

// Internal ID in case we need one.
export const id = 'split-members';
export const group = 'Members:';

// The command to run and any params. csvPath is optional — omit it to fetch
// members live from the Ghost Admin API instead.
export const flags = 'split-members [csvPath]';

// Description for the top level command
export const desc = 'Split members into two zipper-balanced halves, fetched from the Ghost API or read from a CSV';

// Descriptions for the individual params
export const paramsDesc = ['Optional path to a members CSV file (omit to fetch from the Ghost API with --apiURL & --adminAPIKey)'];

// Configure all the options
export const setup = (sywac) => {
    sywac.boolean('-V --verbose', {
        defaultValue: false,
        desc: 'Show verbose output'
    });

    sywac.string('--apiURL', {
        defaultValue: null,
        desc: 'URL to your Ghost API (required when no CSV path is given)'
    });

    sywac.string('--adminAPIKey', {
        defaultValue: null,
        desc: 'Admin API key (required when no CSV path is given)'
    });

    sywac.string('--filter', {
        defaultValue: null,
        desc: 'Filter members when fetching — paste a Ghost members URL or an NQL filter (e.g. "status:free")'
    });

    sywac.string('--output', {
        defaultValue: '.',
        desc: 'Output directory for CSV files'
    });

    sywac.string('--baseName', {
        defaultValue: 'members',
        desc: 'Base filename prefix for output files'
    });

    sywac.boolean('--addLabels', {
        defaultValue: false,
        desc: 'After splitting, bulk-add a label to each group (needs --apiURL, --adminAPIKey, --labelA & --labelB)'
    });

    sywac.string('--labelA', {
        defaultValue: null,
        desc: 'Label name (or ID) to add to group A members'
    });

    sywac.string('--labelB', {
        defaultValue: null,
        desc: 'Label name (or ID) to add to group B members'
    });

    sywac.number('--chunkSize', {
        defaultValue: 100,
        desc: 'Members per bulk label request'
    });

    sywac.number('--requestsPerSecond', {
        defaultValue: 5,
        desc: 'Max bulk label API requests per second'
    });
};

// What to do when this command is executed
export const run = async (argv) => {
    let timer = Date.now();
    let context = {errors: []};

    if (!argv.csvPath && (!argv.apiURL || !argv.adminAPIKey)) {
        ui.log.error('Provide either a CSV path, or both --apiURL and --adminAPIKey to fetch members from Ghost.');
        return;
    }

    if (argv.addLabels) {
        if (!argv.apiURL || !argv.adminAPIKey) {
            ui.log.error('--addLabels needs API access — pass --apiURL and --adminAPIKey.');
            return;
        }
        if (!argv.labelA || !argv.labelB) {
            ui.log.error('--addLabels needs both --labelA and --labelB.');
            return;
        }
    }

    try {
        let runner = splitMembers.getTaskRunner(argv);
        await runner.run(context);
    } catch (error) {
        ui.log.error('Done with errors', context.errors);
    }

    const total = context.members ? context.members.length : 0;
    const aCount = context.membersA ? context.membersA.length : 0;
    const bCount = context.membersB ? context.membersB.length : 0;

    ui.log.ok(`Split ${total} members into A (${aCount}) and B (${bCount}) in ${Date.now() - timer}ms.`);
    ui.log.info(`Source: ${context.source || (argv.csvPath ? argv.csvPath : 'Ghost Admin API')}`);
    ui.log.info(`Files written to: ${argv.output || '.'}`);
    ui.log.info(`  ${argv.baseName || 'members'}-all.csv (${total} members)`);
    ui.log.info(`  ${argv.baseName || 'members'}-a.csv (${aCount} members)`);
    ui.log.info(`  ${argv.baseName || 'members'}-b.csv (${bCount} members)`);

    if (argv.addLabels && context.labelled) {
        ui.log.info(`Labelled group A with "${argv.labelA}": ${context.labelled.a} members`);
        ui.log.info(`Labelled group B with "${argv.labelB}": ${context.labelled.b} members`);
    }

    if (context.errors && context.errors.length > 0) {
        ui.log.warn(`Completed with ${context.errors.length} error(s).`);
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
