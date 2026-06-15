import {ui} from '@tryghost/pretty-cli';
import exportComments from '../tasks/export-comments.js';

const id = 'export-comments';

const group = 'Content:';

const flags = 'export-comments <apiURL> <adminAPIKey>';

const desc = 'Export all comments from a Ghost site as a CSV compatible with the comment importer';

const paramsDesc = [
    'URL to your Ghost API',
    'Admin API key'
];

const setup = (sywac) => {
    sywac.boolean('-V --verbose', {
        defaultValue: false,
        desc: 'Show verbose output'
    });
    sywac.enumeration('--status', {
        defaultValue: 'published',
        choices: ['all', 'published', 'hidden'],
        desc: 'Filter comments by status'
    });
    sywac.number('--delayBetweenCalls', {
        defaultValue: 50,
        desc: 'The delay between API calls, in ms'
    });
};

const run = async (argv) => {
    let timer = Date.now();
    let context = {errors: []};

    try {
        let runner = exportComments.getTaskRunner(argv);
        await runner.run(context);
    } catch (error) {
        ui.log.error('Done with errors', context.errors);
    }

    if (context.found && context.found.length > 0) {
        ui.log.ok(`Successfully exported ${context.found.length} comments as CSV in ${Date.now() - timer}ms.`);
        ui.log.info(`CSV saved to ${context.outputPath}`);
    } else {
        ui.log.warn('No comments found to export.');
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
