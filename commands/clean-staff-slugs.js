import {ui} from '@tryghost/pretty-cli';
import cleanStaffSlugs from '../tasks/clean-staff-slugs.js';

const id = 'clean-staff-slugs';
const group = 'Staff:';
const flags = 'clean-staff-slugs <apiURL> <adminAPIKey>';
const desc = 'Find and remove Ghost ID suffixes from staff user slugs when safe';
const paramsDesc = [
    'URL to your Ghost API',
    'Admin API key'
];

const setup = (sywac) => {
    sywac.boolean('-V --verbose', {
        defaultValue: false,
        desc: 'Show verbose output'
    });
    sywac.boolean('--dry-run', {
        defaultValue: false,
        desc: 'Show what would be changed without making changes'
    });
    sywac.number('--delayBetweenCalls', {
        defaultValue: 50,
        desc: 'The delay between API calls, in ms'
    });
};

const run = async (argv) => {
    let timer = Date.now();
    let context = {errors: []};
    const dryRun = Boolean(argv.dryRun || argv['dry-run']);

    try {
        let runner = cleanStaffSlugs.getTaskRunner(argv);
        await runner.run(context);
    } catch (error) {
        ui.log.error('Done with errors', context.errors);
        return;
    }

    const candidateCount = context.usersWithIdSuffix ? context.usersWithIdSuffix.length : 0;
    const updateableCount = context.usersToUpdate ? context.usersToUpdate.length : 0;
    const updatedCount = context.updated ? context.updated.length : 0;
    const skippedCount = context.skipped ? context.skipped.length : 0;
    const skippedText = skippedCount > 0 ? `, skipped ${skippedCount}` : '';

    if (dryRun) {
        ui.log.ok(`Dry run complete: ${updateableCount} of ${candidateCount} candidate staff slugs would be updated${skippedText} in ${Date.now() - timer}ms.`);
        return;
    }

    if (updatedCount > 0) {
        ui.log.ok(`Successfully updated ${updatedCount} staff slug${updatedCount === 1 ? '' : 's'}${skippedText} in ${Date.now() - timer}ms.`);
    } else if (candidateCount > 0) {
        ui.log.ok(`No staff slugs were updated; ${skippedCount} candidate${skippedCount === 1 ? '' : 's'} would not be unique in ${Date.now() - timer}ms.`);
    } else {
        ui.log.ok(`No staff slugs needed cleaning in ${Date.now() - timer}ms.`);
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
