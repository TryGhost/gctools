import {URL} from 'node:url';
import {join, dirname} from 'node:path';
import fs from 'fs-extra';
import MgAssetScraper from '@tryghost/mg-assetscraper';
import fsUtils from '@tryghost/mg-fs-utils';
import {makeTaskRunner} from '@tryghost/listr-smart-renderer';
import {GhostLogger} from '@tryghost/logging';

const __dirname = new URL('.', import.meta.url).pathname;

const initialise = (options) => {
    return {
        title: 'Initialising Workspace',
        task: async (ctx) => {
            // Ensure log dir exists
            const logDir = join(__dirname, '../logs/');
            await fs.ensureDir(logDir);

            ctx.options = options;
            ctx.logging = new GhostLogger({
                domain: 'gctools_fetch_assets', // This can be unique per migration
                mode: 'long',
                transports: ['file'],
                path: logDir
            });

            ctx.allowScrape = {
                all: ctx.options.scrape.includes('all'),
                images: ctx.options.scrape.includes('img') || ctx.options.scrape.includes('all'),
                media: ctx.options.scrape.includes('media') || ctx.options.scrape.includes('all'),
                files: ctx.options.scrape.includes('files') || ctx.options.scrape.includes('all')
            };

            ctx.fileCache = new fsUtils.FileCache(`${options.jsonFile}`);

            ctx.assetScraper = new MgAssetScraper(ctx.fileCache, {
                sizeLimit: ctx.options.sizeLimit,
                allowImages: ctx.allowScrape.images,
                allowMedia: ctx.allowScrape.media,
                allowFiles: ctx.allowScrape.files,
                baseDomain: ctx.options.url || null
            }, ctx);

            ctx.options.file = dirname(options.jsonFile);
        }
    };
};

const getFullTaskList = (options) => {
    return [
        initialise(options),
        {
            title: 'Reading JSON file',
            task: async (ctx) => {
                try {
                    const jsonFileData = await fs.readJson(options.jsonFile);

                    const jsonMeta = (jsonFileData.meta) ? jsonFileData.meta : jsonFileData.db[0].meta;
                    const jsonData = (jsonFileData.data) ? jsonFileData.data : jsonFileData.db[0].data;

                    ctx.meta = {
                        exported_on: jsonMeta.exported_on,
                        version: jsonMeta.version
                    };

                    ctx.result = jsonData;
                } catch (error) {
                    ctx.errors.push(error);
                    throw error;
                }
            }
        },
        {
            title: 'Fetch assets via AssetScraper',
            skip: (ctx) => {
                return [ctx.allowScrape.images, ctx.allowScrape.media, ctx.allowScrape.files].every(element => element === false);
            },
            task: async (ctx) => {
                let assetScraperTasks = ctx.assetScraper.fetch(ctx);
                return makeTaskRunner(assetScraperTasks, {
                    verbose: options.verbose,
                    exitOnError: false,
                    concurrent: false,
                    topLevel: false
                });
            }
        },
        {
            title: 'Create JSON file',
            task: async (ctx) => {
                let result = {
                    db: [
                        {
                            meta: {
                                exported_on: ctx.meta.exported_on,
                                version: ctx.meta.version
                            },
                            data: ctx.result
                        }
                    ]
                };

                await ctx.fileCache.writeGhostImportFile(result, {
                    filename: 'ghost-import-correct-assets.json'
                });
            }
        },
        {
            title: 'Create zip file',
            skip: () => !options.zip,
            task: async (ctx) => {
                ctx.outputFile = await fsUtils.zip.write(process.cwd(), ctx.fileCache.zipDir, ctx.fileCache.defaultZipFileName);
            }
        }
    ];
};

const getTaskRunner = (options) => {
    let tasks = [];

    tasks = getFullTaskList(options);

    // Configure a new Listr task manager, we can use different renderers for different configs
    return makeTaskRunner(tasks, Object.assign({topLevel: true}, options));
};

export default {
    initialise,
    getFullTaskList,
    getTaskRunner
};
