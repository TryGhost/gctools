import { ui } from '@tryghost/pretty-cli';
import updateStaffBio from '../tasks/update-staff-bio.js';

const id = 'update-staff-bio';
const group = 'Staff:';
const flags = 'update-staff-bio <apiURL> <adminAPIKey> <csvPath>';
const desc = 'Update staff bios from a CSV file (only updates empty bios)';
const paramsDesc = [
    'URL to your Ghost API',
    'Admin API key',
    'Path to CSV file with columns: slug, bio',
];

const setup = (sywac) => {
    sywac.boolean('-V --verbose', {
        defaultValue: false,
        desc: 'Show verbose output',
    });
    sywac.number('--delayBetweenCalls', {
        defaultValue: 100,
        desc: 'The delay between API calls, in ms',
    });
};

const run = async (argv) => {
    let timer = Date.now();
    let context = { errors: [] };

    try {
        let runner = updateStaffBio.getTaskRunner(argv);
        await runner.run(context);
    } catch (error) {
        ui.log.error('Done with errors', context.errors.length ? context.errors : [error]);
        process.exitCode = 1;
        return;
    }

    ui.log.ok(`Successfully processed CSV in ${Date.now() - timer}ms.`);
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
