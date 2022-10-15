import {ui} from '@tryghost/pretty-cli';
import fetchImages from '../tasks/fetch-assets.js';

// Internal ID in case we need one.
const id = 'fetch-assets';

const group = 'Tools:';

// The command to run and any params
const flags = 'fetch-assets <jsonFile> <url>';

// Description for the top level command
const desc = 'Fetch the images referenced inb a Ghost JSON file';

// Descriptions for the individual params
const paramsDesc = ['Path to the Ghost JSON file file', 'Provide a URL (without trailing slash) to scrape assets from'];

// Configure all the options
const setup = (sywac) => {
    sywac.boolean('-V --verbose', {
        defaultValue: false,
        desc: 'Show verbose output'
    });
    sywac.array('-s --scrape', {
        choices: ['all', 'img', 'media', 'files'],
        defaultValue: 'all',
        desc: 'Configure scraping tasks'
    });
    sywac.number('--sizeLimit', {
        defaultValue: false,
        desc: 'Assets larger than this size (defined in MB) will be ignored'
    });
    sywac.boolean('--zip', {
        defaultValue: true,
        desc: 'Create a zip file (set to false to skip)'
    });
};

// What to do when this command is executed
const run = async (argv) => {
    let timer = Date.now();
    let context = {errors: []};

    try {
        // Fetch the tasks, configured correctly according to the options passed in
        let fetchImagesRunner = fetchImages.getTaskRunner(argv);

        // Run the migration
        await fetchImagesRunner.run(context);

        if (argv.verbose) {
            ui.log.info('Done');
        }
    } catch (error) {
        ui.log.error('Done with errors', context.errors);
    }

    if (argv.zip) {
        ui.log.ok(`Zip file (${(context.outputFile.size / (1024 * 1024)).toFixed(2)}MB) saved at: ${context.outputFile.path}`);
    }

    // Report success
    ui.log.ok(`Successfully fetched assets in ${Date.now() - timer}ms.`);
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
