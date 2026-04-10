import {ui} from '@tryghost/pretty-cli';
import splitMembers from '../tasks/split-members.js';

// Internal ID in case we need one.
export const id = 'split-members';
export const group = 'Members:';

// The command to run and any params
export const flags = 'split-members <csvPath>';

// Description for the top level command
export const desc = 'Read a members CSV and split into two zipper-balanced halves';

// Descriptions for the individual params
export const paramsDesc = ['Path to a members CSV file'];

// Configure all the options
export const setup = (sywac) => {
    sywac.boolean('-V --verbose', {
        defaultValue: false,
        desc: 'Show verbose output'
    });

    sywac.string('--output', {
        defaultValue: '.',
        desc: 'Output directory for CSV files'
    });

    sywac.string('--baseName', {
        defaultValue: 'members',
        desc: 'Base filename prefix for output files'
    });
};

// What to do when this command is executed
export const run = async (argv) => {
    let timer = Date.now();
    let context = {errors: []};

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
    ui.log.info(`Files written to: ${argv.output || '.'}`);
    ui.log.info(`  ${argv.baseName || 'members'}-all.csv (${total} members)`);
    ui.log.info(`  ${argv.baseName || 'members'}-a.csv (${aCount} members)`);
    ui.log.info(`  ${argv.baseName || 'members'}-b.csv (${bCount} members)`);
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
