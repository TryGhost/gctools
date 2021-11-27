const fetchImages = require('../tasks/fetch-images');
const ui = require('@tryghost/pretty-cli').ui;

// Internal ID in case we need one.
exports.id = 'fetch-images';

exports.group = 'Tools:';

// The command to run and any params
exports.flags = 'fetch-images <jsonFile> <url>';

// Description for the top level command
exports.desc = 'Fetch the images referenced inb a Ghost JSON file';

// Descriptions for the individual params
exports.paramsDesc = ['Path to the Ghost JSON file file', 'Provide a URL (without trailing slash) to scrape images from'];

// Configure all the options
exports.setup = (sywac) => {
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
exports.run = async (argv) => {
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
