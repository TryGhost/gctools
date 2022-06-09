import fetchImages from '../tasks/fetch-images.js';
import {ui} from '@tryghost/pretty-cli';

// Internal ID in case we need one.
export const id = 'fetch-images';

export const group = 'Tools:';

// The command to run and any params
export const flags = 'fetch-images <jsonFile> <url>';

// Description for the top level command
export const desc = 'Fetch the images referenced inb a Ghost JSON file';

// Descriptions for the individual params
export const paramsDesc = ['Path to the Ghost JSON file file', 'Provide a URL (without trailing slash) to scrape images from'];

// Configure all the options
export const setup = (sywac) => {
    sywac.boolean('-V --verbose', {
        defaultValue: false,
        desc: 'Show verbose output'
    });
    sywac.boolean('--zip', {
        defaultValue: true,
        desc: 'Create a zip file (set to false to skip)'
    });
};

// What to do when this command is executed
export const run = async (argv) => {
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
    ui.log.ok(`Successfully fetched ${context.images.length} images in ${Date.now() - timer}ms.`);
};
