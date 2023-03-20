import fs from 'fs-extra';
import MgAssetScraper from '@tryghost/mg-assetscraper';
import fsUtils from '@tryghost/mg-fs-utils';
import SmartRenderer from '@tryghost/listr-smart-renderer';
import {Listr} from 'listr2';

const getTaskRunner = (options, logger) => {
    let tasks = [
        {
            title: 'Initialising Workspace',
            task: async (ctx) => {
                ctx.options = options;
                ctx.logger = logger;

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
            }
        },
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
            task: async (ctx, task) => {
                let assetScraperTasks = ctx.assetScraper.fetch(ctx);

                return task.newListr(assetScraperTasks, {
                    verbose: options.verbose,
                    exitOnError: false,
                    concurrent: false
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

    // Configure a new Listr task manager, we can use different renderers for different configs
    return new Listr(tasks, {renderer: (options.verbose) ? 'verbose' : SmartRenderer});
};

export default {
    getTaskRunner
};
