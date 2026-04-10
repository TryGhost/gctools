import {ui} from '@tryghost/pretty-cli';
import compareMemberCsv from '../tasks/compare-member-csv.js';

const id = 'compare-member-csv';
const group = 'Members:';
const flags = 'compare-member-csv <oldFile> <newFile>';
const desc = 'Compare two member CSV files and export differences';
const paramsDesc = [
    'Path to the old/existing members CSV file',
    'Path to the new members CSV file'
];

const setup = (sywac) => {
    sywac.boolean('-V --verbose', {
        defaultValue: false,
        desc: 'Show verbose output'
    });
};

const run = async (argv) => {
    let timer = Date.now();
    let context = {errors: []};

    try {
        // Validate that both file paths are provided
        if (!argv.oldFile || !argv.newFile) {
            ui.log.error('Both old and new file paths are required');
            return;
        }

        let runner = compareMemberCsv.getTaskRunner({
            oldFile: argv.oldFile,
            newFile: argv.newFile,
            verbose: argv.verbose
        });

        await runner.run(context);

        // Display summary
        ui.log.info('Summary:');
        ui.log.info(`- New members found: ${context.newMembersList.length}`);
        ui.log.info(`- Unsubscribed members found: ${context.unsubscribedList.length}`);
        ui.log.info(`- Updated members found: ${context.updatedList ? context.updatedList.length : 0}`);

        if (context.newMembersFile) {
            ui.log.ok(`New members exported to: ${context.newMembersFile}`);
        }
        if (context.unsubscribedFile) {
            ui.log.ok(`Unsubscribed members exported to: ${context.unsubscribedFile}`);
        }
        if (context.updatedFile) {
            ui.log.ok(`Updated members exported to: ${context.updatedFile}`);
        }

        ui.log.ok(`Comparison completed in ${Date.now() - timer}ms`);
    } catch (error) {
        ui.log.error('Error comparing CSV files:', error.message);
        if (context.errors && context.errors.length > 0) {
            ui.log.error('Additional errors:', context.errors);
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
