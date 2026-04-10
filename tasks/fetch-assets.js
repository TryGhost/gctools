import MgAssetScraperDb from '@tryghost/mg-assetscraper-db';
import fsUtils from '@tryghost/mg-fs-utils';
import {makeTaskRunner} from '@tryghost/listr-smart-renderer';

const getTaskRunner = (options, logger) => {
    let tasks = [
        {
            title: 'Initialising Workspace',
            task: async (ctx) => {
                ctx.options = options;
                ctx.logger = logger;

                ctx.fileCache = new fsUtils.FileCache(`${options.jsonFile}`);

                ctx.assetScraper = new MgAssetScraperDb(ctx.fileCache, {
                    sizeLimit: ctx.options.sizeLimit,
                    allowAllDomains: true,
                    baseUrl: ctx.options.url || null
                }, options.jsonFile);

                await ctx.assetScraper.init();
            }
        },
        {
            title: 'Fetch assets via AssetScraper',
            task: async (ctx, task) => {
                let assetScraperTasks = ctx.assetScraper.getTasks();

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
                await ctx.assetScraper.writeUpdatedJson(ctx.fileCache.jsonDir);
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

    return makeTaskRunner(tasks, Object.assign({topLevel: true}, options));
};

export default {
    getTaskRunner
};
