import MgAssetScraper from '@tryghost/mg-assetscraper';
import {dirname} from 'node:path';
import fsUtils from '@tryghost/mg-fs-utils';
import fs from 'fs-extra';
import {makeTaskRunner} from '@tryghost/listr-smart-renderer';

const initialise = (options) => {
    return {
        title: 'Initialising Workspace',
        task: (ctx) => {
            ctx.options = options;
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
                baseDomain: options.url || null
            });

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
                // 1. Read JSON file and store data
                try {
                    const jsonFileData = await fs.readJson(options.jsonFile);

                    const jsonData = (jsonFileData.data) ? jsonFileData.data : jsonFileData.db[0].data;
                    ctx.result = jsonData;
                } catch (error) {
                    ctx.errors.push(error);
                    throw error;
                }
            }
        },
        {
            title: 'Fetch images via AssetScraper',
            skip: (ctx) => {
                return [ctx.allowScrape.images, ctx.allowScrape.media, ctx.allowScrape.files].every(element => element === false);
            },
            task: async (ctx) => {
                // 6. Format the data as a valid Ghost JSON file
                let tasks = ctx.assetScraper.fetch(ctx);
                let assetScraperOptions = JSON.parse(JSON.stringify(options)); // Clone the options object
                assetScraperOptions.concurrent = false;
                return makeTaskRunner(tasks, assetScraperOptions);
            }
        },
        {
            title: 'Create JSON file',
            task: async (ctx) => {
                await ctx.fileCache.writeGhostImportFile(ctx.result, {
                    filename: 'ghost-import-correct-images.json'
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
