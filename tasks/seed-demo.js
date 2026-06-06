import Promise from 'bluebird';
import _ from 'lodash';
import GhostAdminAPI from '@tryghost/admin-api';
import {makeTaskRunner} from '@tryghost/listr-smart-renderer';
import {createAssetManager, createTmpDir, cleanupTmpDir} from '../lib/demo/assets.js';
import {gatherSiteInfo} from '../lib/demo/ghost-site.js';
import {buildTagPool} from '../lib/demo/tags.js';
import {buildDemoPost, resolveDateRange, buildPublishSchedule} from '../lib/demo/demo-post.js';
import {buildAboutPage} from '../lib/demo/about-page.js';
import {buildStyleGuide} from '../lib/demo/style-guide.js';
import {buildDesiredNavigation, writeNavigation, NAV_NO_PERMISSION} from '../lib/demo/navigation.js';
import {buildDummyAuthor, findExistingAuthor, importAuthor, buildImportFile, pickPrimaryAuthorIndices, AUTHOR_NO_PERMISSION} from '../lib/demo/author.js';

const defaults = {
    verbose: false,
    count: 10,
    titleMinLength: 3,
    titleMaxLength: 8,
    contentCount: 6,
    paragraphLowerBound: 3,
    paragraphUpperBound: 7,
    sentenceLowerBound: 3,
    sentenceUpperBound: 15,
    status: 'published',
    visibility: 'public',
    featureImages: 'all',
    imageCards: true,
    maxImageCards: 3,
    tags: true,
    extraTags: 0,
    collectionTag: 'lorem',
    aboutPage: true,
    styleGuide: true,
    addAuthor: false,
    authorShare: 30,
    authorName: 'Sam Example',
    authorEmail: false,
    authorRole: 'Contributor',
    dateRange: false,
    dateStart: false,
    dateEnd: false,
    nav: true,
    authorNav: true,
    collectionNav: true,
    assetSource: 'picsum',
    dryRun: false,
    delayBetweenCalls: 50
};

// A no-upload asset manager used in dry runs: returns permissive hotlink URLs
// without touching the Ghost site.
const stubAssetManager = () => {
    return {
        getImage: async ({key, width = 1200, height = 800}) => ({
            url: `https://picsum.photos/seed/${encodeURIComponent(key)}/${width}/${height}.jpg`,
            width,
            height
        }),
        getMedia: async ({type}) => ({
            url: `https://lorem.media/${type}`,
            mimeType: type === 'audio' ? 'audio/mpeg' : 'video/mp4',
            hotlinked: true
        }),
        getFile: async ({fileName = 'placeholder.txt'}) => ({
            url: `https://example.com/${fileName}`,
            fileName,
            fileSize: 1024
        })
    };
};

const initialise = (options) => {
    return {
        title: 'Initialising API connection',
        task: async (ctx, task) => {
            const url = options.apiURL.replace(/\/$/, '');
            const key = options.adminAPIKey;
            const api = new GhostAdminAPI({
                url: url.replace('localhost', '127.0.0.1'),
                key,
                version: 'v5.0'
            });

            // Option values win; defaults fill anything missing or undefined.
            ctx.args = _.defaults({}, options, defaults);
            ctx.api = api;
            ctx.inserted = [];
            ctx.errors = ctx.errors || [];
            ctx.warnings = [];
            ctx.dummyAuthor = null;
            ctx.summary = {posts: 0, aboutPage: false, styleGuide: false, navigation: false, author: false};

            task.output = `Initialised API connection for ${options.apiURL}`;
        }
    };
};

const getFullTaskList = (options) => {
    return [
        initialise(options),
        {
            title: 'Gathering site information',
            task: async (ctx, task) => {
                ctx.site = await gatherSiteInfo({api: ctx.api, options});
                ctx.tagPool = buildTagPool({extraTags: ctx.args.tags === false ? 0 : ctx.args.extraTags});

                if (ctx.args.dryRun) {
                    ctx.assetManager = stubAssetManager();
                } else {
                    ctx.tmpRoot = await createTmpDir();
                    ctx.assetManager = createAssetManager({api: ctx.api, args: ctx.args, tmpRoot: ctx.tmpRoot});
                }

                task.output = `Site "${ctx.site.title}" on Ghost ${ctx.site.version}`;
            }
        },
        {
            title: 'Creating dummy author',
            enabled: () => options.addAuthor === true,
            skip: ctx => ctx.args.addAuthor !== true && 'Dummy author disabled',
            task: async (ctx, task) => {
                const author = await buildDummyAuthor({assetManager: ctx.assetManager, args: ctx.args});

                if (ctx.args.dryRun) {
                    ctx.dummyAuthor = author;
                    task.output = `[dry run] would create author ${author.name} <${author.email}> (${author.role})`;
                    return;
                }

                try {
                    const existing = await findExistingAuthor({api: ctx.api, slug: author.slug, email: author.email});
                    if (existing) {
                        ctx.dummyAuthor = {name: existing.name, slug: existing.slug, email: existing.email};
                        task.output = `Reusing existing author ${existing.name} <${existing.email}>`;
                        return;
                    }

                    await importAuthor({options, author});
                    ctx.dummyAuthor = {name: author.name, slug: author.slug, email: author.email};
                    ctx.summary.author = true;
                    task.output = `Created author ${author.name} <${author.email}>`;
                    return Promise.delay(ctx.args.delayBetweenCalls);
                } catch (error) {
                    if (error.code === AUTHOR_NO_PERMISSION) {
                        ctx.warnings.push({
                            type: 'author',
                            message: 'Author could not be created automatically. Integration API keys cannot import staff users — re-run with an owner/admin staff access token to enable this, or import the JSON below via Ghost Admin > Settings > Labs > Import content.',
                            importFile: buildImportFile(author)
                        });
                        task.skip('Integration key cannot create authors (use a staff access token)');
                    } else {
                        error.resource = {title: 'Dummy author'};
                        ctx.errors.push(error);
                    }
                }
            }
        },
        {
            title: 'Creating demo posts',
            task: async (ctx, task) => {
                const indices = _.range(ctx.args.count);
                let done = 0;

                // When a dummy author exists, make it the primary (first) author
                // on a random subset of posts.
                const primaryIndices = ctx.dummyAuthor
                    ? pickPrimaryAuthorIndices({count: ctx.args.count, share: ctx.args.authorShare})
                    : new Set();

                const dateRange = resolveDateRange(ctx.args);
                const schedule = buildPublishSchedule({count: ctx.args.count, dateRange});

                await Promise.mapSeries(indices, async (index) => {
                    const authors = (ctx.dummyAuthor && primaryIndices.has(index))
                        ? [ctx.dummyAuthor, ctx.site.primaryAuthor]
                        : null;

                    const post = await buildDemoPost({
                        index,
                        args: ctx.args,
                        assetManager: ctx.assetManager,
                        tagPool: ctx.tagPool,
                        author: ctx.site.primaryAuthor,
                        authors,
                        publishDate: schedule[index]
                    });

                    if (ctx.args.dryRun) {
                        done += 1;
                        const when = schedule[index] ? ` (${new Date(schedule[index]).toISOString().slice(0, 10)})` : '';
                        task.output = `[dry run] would create post ${done}/${ctx.args.count}: ${post.title}${when}`;
                        return;
                    }

                    try {
                        const result = await ctx.api.posts.add(post, {});
                        ctx.inserted.push(result.url);
                        ctx.summary.posts += 1;
                        done += 1;
                        task.output = `Created post ${done}/${ctx.args.count}: ${post.title}`;
                        return Promise.delay(ctx.args.delayBetweenCalls).return(result);
                    } catch (error) {
                        error.resource = {title: post.title};
                        ctx.errors.push(error);
                    }
                });
            }
        },
        {
            title: 'Creating /about page',
            enabled: () => options.aboutPage !== false,
            skip: ctx => ctx.args.aboutPage === false && 'About page disabled',
            task: async (ctx, task) => {
                const page = await buildAboutPage({assetManager: ctx.assetManager, args: ctx.args});

                if (ctx.args.dryRun) {
                    task.output = '[dry run] would create/overwrite /about';
                    return;
                }

                try {
                    if (ctx.site.aboutPage) {
                        await ctx.api.pages.edit({id: ctx.site.aboutPage.id, ...page, updated_at: ctx.site.aboutPage.updated_at});
                        task.output = 'Overwrote existing /about page';
                    } else {
                        await ctx.api.pages.add(page, {});
                        task.output = 'Created /about page';
                    }
                    ctx.summary.aboutPage = true;
                    return Promise.delay(ctx.args.delayBetweenCalls);
                } catch (error) {
                    error.resource = {title: 'About page'};
                    ctx.errors.push(error);
                }
            }
        },
        {
            title: 'Creating Style Guide post',
            enabled: () => options.styleGuide !== false,
            skip: ctx => ctx.args.styleGuide === false && 'Style guide disabled',
            task: async (ctx, task) => {
                const post = await buildStyleGuide({assetManager: ctx.assetManager, args: ctx.args, site: ctx.site, dummyAuthor: ctx.dummyAuthor});

                if (ctx.args.dryRun) {
                    task.output = '[dry run] would create Style Guide post';
                    return;
                }

                try {
                    const existing = await ctx.api.posts.browse({filter: 'slug:style-guide', limit: 1});
                    if (existing && existing.length) {
                        await ctx.api.posts.edit({id: existing[0].id, ...post, updated_at: existing[0].updated_at});
                        task.output = 'Overwrote existing Style Guide post';
                    } else {
                        await ctx.api.posts.add(post, {});
                        task.output = 'Created Style Guide post';
                    }
                    ctx.summary.styleGuide = true;
                    return Promise.delay(ctx.args.delayBetweenCalls);
                } catch (error) {
                    error.resource = {title: 'Style Guide'};
                    ctx.errors.push(error);
                }
            }
        },
        {
            title: 'Updating navigation',
            enabled: () => options.nav !== false,
            skip: ctx => ctx.args.nav === false && 'Navigation disabled',
            task: async (ctx, task) => {
                const parts = {
                    about: ctx.args.aboutPage !== false,
                    styleGuide: ctx.args.styleGuide !== false ? {slug: 'style-guide'} : null,
                    author: (ctx.args.authorNav !== false && ctx.site.primaryAuthor) ? {slug: ctx.site.primaryAuthor.slug} : null,
                    collection: ctx.args.collectionNav !== false ? {tag: (ctx.args.collectionTag || 'lorem').toLowerCase()} : null
                };

                const desired = buildDesiredNavigation({current: ctx.site.navigation, parts});
                ctx.desiredNavigation = desired;

                if (ctx.args.dryRun) {
                    task.output = '[dry run] would set navigation';
                    return;
                }

                try {
                    await writeNavigation({options, navigation: desired});
                    ctx.summary.navigation = true;
                    task.output = 'Navigation updated';
                } catch (error) {
                    if (error.code === NAV_NO_PERMISSION) {
                        ctx.warnings.push({
                            type: 'navigation',
                            message: 'Navigation could not be updated automatically. Integration API keys cannot write settings — re-run with an owner/admin staff access token to enable this, or paste the menu below into Ghost Admin > Settings > Navigation.',
                            navigation: desired
                        });
                        task.skip('Integration key cannot write settings (use a staff access token)');
                    } else {
                        error.resource = {title: 'Navigation'};
                        ctx.errors.push(error);
                    }
                }
            }
        },
        {
            title: 'Cleaning up',
            task: async (ctx) => {
                if (ctx.tmpRoot) {
                    await cleanupTmpDir(ctx.tmpRoot);
                }
            }
        }
    ];
};

const getTaskRunner = (options) => {
    const tasks = getFullTaskList(options);
    return makeTaskRunner(tasks, Object.assign({topLevel: true}, options, {concurrent: 1}));
};

export default {
    initialise,
    getFullTaskList,
    getTaskRunner
};
