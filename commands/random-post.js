const randomPosts = require('../tools/random-posts');
const ui = require('@tryghost/pretty-cli').ui;

// Internal ID in case we need one.
exports.id = 'random-posts';

exports.group = 'Content:';

// The command to run and any params
exports.flags = 'random-posts <apiURL> <adminAPIKey>';

// Description for the top level command
exports.desc = 'Insert random posts into Ghost';

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
    sywac.number('-C, --count', {
        defaultValue: 10,
        desc: 'The number of posts to add'
    });
    sywac.number('--titleMinLength', {
        defaultValue: 3,
        desc: 'The minimum number of words in the title'
    });
    sywac.number('--titleMaxLength', {
        defaultValue: 8,
        desc: 'The maximum number of words in the title'
    });
    sywac.enumeration('--contentUnit', {
        defaultValue: 'paragraphs',
        choices: ['paragraphs', 'sentences', 'words'],
        desc: 'The type of content you want to define the size of'
    });
    sywac.number('--contentCount', {
        defaultValue: 10,
        desc: 'The number of units for each post'
    });
    sywac.number('--paragraphLowerBound', {
        defaultValue: 3,
        desc: 'Min. number of sentences per paragraph'
    });
    sywac.number('--paragraphUpperBound', {
        defaultValue: 7,
        desc: 'Max. number of sentences per paragraph'
    });
    sywac.number('--sentenceLowerBound', {
        defaultValue: 3,
        desc: 'Min. number of words per sentence'
    });
    sywac.number('--sentenceUpperBound', {
        defaultValue: 15,
        desc: 'Max. number of words per sentence'
    });
    sywac.string('--userEmail', {
        defaultValue: false,
        desc: 'The assigned author. Defaults to who created the API key'
    });
    sywac.string('--tags', {
        defaultValue: '#gctools',
        desc: 'Comma separated list of tags'
    });
    sywac.enumeration('--status', {
        defaultValue: 'published',
        choices: ['public', 'draft', 'scheduled'],
        desc: 'Post status'
    });
    sywac.enumeration('--visibility', {
        defaultValue: 'public',
        choices: ['public', 'members', 'paid'],
        desc: 'Post visibility'
    });
    sywac.string('--dateRange', {
        defaultValue: false,
        desc: '2 dates that all posts will fall between (eg: 25-12-2019,14-02-2020). Defaults to today'
    });

    // random unsplash image?

    sywac.number('--delayBetweenCalls', {
        defaultValue: 50,
        desc: 'The delay between API calls, in ms'
    });
};

// What to do when this command is executed
exports.run = async (argv) => {
    let timer = Date.now();
    let context = {errors: []};

    try {
        // // Fetch the tasks, configured correctly according to the options passed in
        let runner = randomPosts.getTaskRunner(argv);

        // Run the migration
        await runner.run(context);
    } catch (error) {
        ui.log.error('Done with errors', context.errors);
    }

    // Report success
    ui.log.ok(`Successfully added ${context.inserted.length} posts in ${Date.now() - timer}ms.`);
};
