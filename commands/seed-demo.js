import {ui} from '@tryghost/pretty-cli';
import seedDemo from '../tasks/seed-demo.js';

// Internal ID in case we need one.
const id = 'seed-demo';

const group = 'Content:';

// The command to run and any params
const flags = 'seed-demo <apiURL> <adminAPIKey>';

// Description for the top level command
const desc = 'Seed a Ghost site with rich demo content (posts, images, tags, an about page, a style guide, and navigation). Use a staff access token to update navigation.';

// Descriptions for the individual params
const paramsDesc = [
    'URL to your Ghost API',
    'Admin API key (use an owner/admin staff access token to update navigation)'
];

// Configure all the options
const setup = (sywac) => {
    sywac.boolean('-V --verbose', {
        defaultValue: false,
        desc: 'Show verbose output'
    });
    sywac.number('-C, --count', {
        defaultValue: 10,
        desc: 'The number of demo posts to add'
    });
    sywac.string('--featureImages', {
        defaultValue: 'all',
        desc: 'Add feature images to posts: "all", "none", or a percentage like "50%"'
    });
    sywac.boolean('--imageCards', {
        defaultValue: true,
        desc: 'Insert in-post image cards (0-3 per post, weighted low, never before the first paragraph)'
    });
    sywac.number('--maxImageCards', {
        defaultValue: 3,
        desc: 'Maximum number of in-post image cards per post'
    });
    sywac.boolean('--tags', {
        defaultValue: true,
        desc: 'Distribute the five fixed tags (lorem, ipsum, dolor, sit, amet) across posts'
    });
    sywac.number('--extraTags', {
        defaultValue: 0,
        desc: 'Number of additional random tags to generate and distribute (max 30)'
    });
    sywac.string('--collectionTag', {
        defaultValue: 'lorem',
        desc: 'Tag whose archive is used for the "Collection" navigation item'
    });
    sywac.boolean('--aboutPage', {
        defaultValue: true,
        desc: 'Create or overwrite the /about page'
    });
    sywac.boolean('--styleGuide', {
        defaultValue: true,
        desc: 'Create the Style Guide post showcasing every card type'
    });
    sywac.boolean('--addAuthor', {
        defaultValue: false,
        desc: 'Create a dummy author (staff access token required) and attribute it to some posts and the Style Guide'
    });
    sywac.number('--authorShare', {
        defaultValue: 30,
        desc: 'Percentage of posts (0-100) on which the dummy author is the primary author'
    });
    sywac.string('--authorName', {
        defaultValue: 'Sam Example',
        desc: 'Display name for the dummy author'
    });
    sywac.string('--authorEmail', {
        defaultValue: false,
        desc: 'Email for the dummy author (default: derived from the name, e.g. sam-example@example.com)'
    });
    sywac.enumeration('--authorRole', {
        defaultValue: 'Contributor',
        choices: ['Contributor', 'Author', 'Editor', 'Administrator'],
        desc: 'Role assigned to the dummy author'
    });
    sywac.boolean('--nav', {
        defaultValue: true,
        desc: 'Update the navigation menu (Home, About, Style Guide, Author, Collection)'
    });
    sywac.boolean('--authorNav', {
        defaultValue: true,
        desc: 'Include the "Author" archive link in navigation'
    });
    sywac.boolean('--collectionNav', {
        defaultValue: true,
        desc: 'Include the "Collection" tag archive link in navigation'
    });
    sywac.enumeration('--status', {
        defaultValue: 'published',
        choices: ['published', 'draft'],
        desc: 'Status for created posts'
    });
    sywac.string('--dateStart', {
        defaultValue: false,
        desc: 'Distribute post dates from this date (e.g. 2025-01-01); posts are spread across the range with jitter. Omit to date every post now.'
    });
    sywac.string('--dateEnd', {
        defaultValue: false,
        desc: 'End of the post date range (default: now). Only used with --dateStart.'
    });
    sywac.enumeration('--visibility', {
        defaultValue: 'public',
        choices: ['public', 'members', 'paid'],
        desc: 'Visibility for created posts'
    });
    sywac.boolean('--dryRun', {
        defaultValue: false,
        desc: 'Preview what would be created without writing to the site'
    });
    sywac.number('--delayBetweenCalls', {
        defaultValue: 50,
        desc: 'The delay between API calls, in ms'
    });
};

// What to do when this command is executed
const run = async (argv) => {
    let timer = Date.now();
    let context = {errors: []};

    try {
        let runner = seedDemo.getTaskRunner(argv);
        await runner.run(context);
    } catch (error) {
        ui.log.error('Done with errors', context.errors);
    }

    // Surface any non-fatal warnings (e.g. navigation needing manual paste).
    if (context.warnings && context.warnings.length) {
        context.warnings.forEach((warning) => {
            ui.log.warn(warning.message);
            if (warning.navigation) {
                ui.log.info(JSON.stringify(warning.navigation, null, 2));
            }
            if (warning.importFile) {
                ui.log.info(JSON.stringify(warning.importFile, null, 2));
            }
        });
    }

    if (context.summary) {
        const s = context.summary;
        ui.log.ok(`Seeded ${s.posts} posts${s.aboutPage ? ', /about page' : ''}${s.styleGuide ? ', style guide' : ''}${s.author ? ', author' : ''}${s.navigation ? ', navigation' : ''} in ${Date.now() - timer}ms.`);
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
