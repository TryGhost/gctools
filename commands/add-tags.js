const deletePosts = require('../tasks/add-tags');
const ui = require('@tryghost/pretty-cli').ui;

// Internal ID in case we need one.
exports.id = 'add-tags';

exports.group = 'Content:';

// The command to run and any params
exports.flags = 'add-tags <apiURL> <adminAPIKey>';

// Description for the top level command
exports.desc = 'Add tags to posts in Ghost';

// Descriptions for the individual params
exports.paramsDesc = [
    'URL to your Ghost API',
    'Admin API key'
];

// Configure all the options
exports.setup = (sywac) => {
    sywac.boolean('-V --verbose', {
        defaultValue: false,
        desc: 'Show verbose output'
    });
    sywac.enumeration('--visibility', {
        defaultValue: 'all',
        choices: ['all', 'public', 'members', 'paid'],
        desc: 'Select posts with this visibility setting'
    });
    sywac.string('--tag', {
        defaultValue: null,
        desc: 'Select posts with these tag slugs, inside single quotes. i.e. \'existing-tag, newsletter\''
    });
    sywac.string('--author', {
        defaultValue: null,
        desc: 'Select posts with these author slugs, inside single quotes. i.e. \'example-author\''
    });
    sywac.string('--new_tags', {
        desc: 'Comma separated list of tag names to add (not slugs), inside single quotes. i.e. \'New Tag, Podcast\''
    });
    sywac.number('--delayBetweenCalls', {
        defaultValue: 50,
        desc: 'The delay between API calls, in ms'
    });
};

// What to do when this command is executed
exports.run = async (argv) => {
    let timer = Date.now();
    let context = {errors: []};

    if (argv.author) {
        argv.author = argv.author.split(',').map((item) => {
            // This needs to be improved. The task is expecting an array of objects that each contain a `slug` value
            return {
                slug: item.trim()
            };
        });
    }

    if (argv.new_tags) {
        argv.new_tags = argv.new_tags.split(',').map((item) => {
            return item.trim();
        });
    }

    try {
        // Fetch the tasks, configured correctly according to the options passed in
        let runner = deletePosts.getTaskRunner(argv);

        // Run the migration
        await runner.run(context);
    } catch (error) {
        ui.log.error('Done with errors', context.errors);
    }

    // Report success
    ui.log.ok(`Successfully updated ${context.updated.length} posts in ${Date.now() - timer}ms.`);
};
