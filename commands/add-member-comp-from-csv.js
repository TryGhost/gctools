import {ui} from '@tryghost/pretty-cli';
import addMemberCompFromCSV from '../tasks/add-member-comp-from-csv.js';

const id = 'add-member-comp-from-csv';
const group = 'Members:';
const flags = 'add-member-comp-from-csv <apiURL> <adminAPIKey> <csvPath>';
const desc = 'Add member complimentary subscriptions from a CSV file';
const paramsDesc = [
    'URL to your Ghost API',
    'Admin API key',
    'Path to CSV file with columns: email, expireAt, tierName'
];

const setup = (sywac) => {
    sywac.boolean('-V --verbose', {
        defaultValue: false,
        desc: 'Show verbose output'
    });
    sywac.number('--delayBetweenCalls', {
        defaultValue: 100,
        desc: 'The delay between API calls, in ms'
    });
};

const run = async (argv) => {
    let timer = Date.now();
    let context = {errors: []};

    try {
        let runner = addMemberCompFromCSV.getTaskRunner(argv);
        await runner.run(context);
    } catch (error) {
        ui.log.error('Done with errors', context.errors);
    }

    ui.log.ok(`Successfully processed CSV and updated complimentary subscriptions in ${Date.now() - timer}ms.`);
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