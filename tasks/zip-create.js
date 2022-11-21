import {parse, dirname, join, basename} from 'node:path';
import fs from 'fs-extra';
import glob from 'glob';
import fsUtils from '@tryghost/mg-fs-utils';
import {makeTaskRunner} from '@tryghost/listr-smart-renderer';

async function hydrateFile(filePath) {
    let stats = await fs.stat(filePath);
    let data = {
        path: filePath,
        size: stats.size
    };
    return data;
}

async function chunkFiles(ctx) {
    let input = ctx.theFiles;
    let chunkMaxSize = ctx.args.sizeInBytes;

    let chunks = [];
    let currentChunkSize = 0;
    let currentChunkIndex = 0;

    if (!input || input.length === 0 || chunkMaxSize <= 0) {
        return chunks;
    }

    for (let obj of input) {
        const objSize = obj.size;
        const fitsIntoLastChunk = (currentChunkSize + objSize) <= chunkMaxSize;

        if (fitsIntoLastChunk) {
            if (!Array.isArray(chunks[currentChunkIndex])) {
                chunks[currentChunkIndex] = [];
            }

            chunks[currentChunkIndex].push(obj);
            currentChunkSize += objSize;
        } else {
            if (chunks[currentChunkIndex]) {
                currentChunkIndex = (currentChunkIndex + 1);
                currentChunkSize = 0;
            }

            chunks[currentChunkIndex] = [];
            chunks[currentChunkIndex].push(obj);
            currentChunkSize += objSize;
        }
    }

    return chunks;
}

async function createZip(chunk, index, ctx) {
    const zipFileParts = parse(ctx.args.dirPath);
    const zipName = `${zipFileParts.name}_${index}.zip`;

    fsUtils.zip.write(ctx.fileCache.zipDir, chunk, zipName);
}

const initialise = (options) => {
    return {
        title: 'Initialising Workspace',
        task: (ctx, task) => {
            ctx.args = options;

            ctx.fileCache = new fsUtils.FileCache(`${ctx.args.dirPath}_zip_create`);
            ctx.theFiles = [];
            ctx.chunks = [];
            ctx.args.sizeInBytes = (options.maxSize * 1000000);
            ctx.args.destDir = dirname(options.dirPath);

            if (options.verbose) {
                task.output = `Workspace initialised at ${ctx.fileCache.cacheDir}`;
            }
        }
    };
};

const getFullTaskList = (options) => {
    return [
        initialise(options),
        {
            title: 'Copying file',
            task: async (ctx) => {
                // 1. Copy the directory
                try {
                    let res = await fs.copy(ctx.args.dirPath, `${ctx.fileCache.tmpDir}/images`);
                    return res;
                } catch (error) {
                    ctx.errors.push(error);
                    throw error;
                }
            }
        },
        {
            title: 'Getting image sizes',
            task: async (ctx) => {
                // 2. Get the size for each image that was just copied
                try {
                    let filePaths = glob.sync(`${ctx.fileCache.tmpDir}/**/*`, {
                        dot: false,
                        nodir: true
                    });

                    await Promise.all(filePaths.map(async (filePath) => {
                        let hydrated = await hydrateFile(filePath);
                        ctx.theFiles.push(hydrated);
                    }));
                } catch (error) {
                    ctx.errors.push(error);
                    throw error;
                }
            }
        },
        {
            title: 'Chunking files',
            task: async (ctx) => {
                // 3. Chunk the files into smaller groups
                try {
                    ctx.chunks = await chunkFiles(ctx);
                } catch (error) {
                    ctx.errors.push(error);
                    throw error;
                }
            }
        },
        {
            title: 'Creating chunk directories',
            task: async (ctx) => {
                // 4. Create a directory for each chunk and move its images into it
                try {
                    await Promise.all(
                        ctx.chunks.map(async (chunk, index) => {
                            let tmpDir = ctx.fileCache.tmpDir;
                            let zipDir = ctx.fileCache.zipDir;

                            await Promise.all(chunk.map(async (file) => {
                                let filePathNoBase = file.path.replace(tmpDir, '');
                                let newLocal = join(zipDir, `chunks/chunk_${index}`, filePathNoBase);
                                await fs.move(file.path, newLocal, {
                                    overwrite: true
                                });
                            }));
                        })
                    );
                } catch (error) {
                    ctx.errors.push(error);
                    throw error;
                }
            }
        },
        {
            title: 'Zipping chunks',
            task: async (ctx) => {
                // 5. Zip each of those new chunk directories
                try {
                    let chunkDirs = glob.sync(`${ctx.fileCache.zipDir}/chunks/*`);

                    // This does not work properly, and is still trying to create the zip file when the tmp dir has been deleted
                    // When resolved, re-enable the 'Cleaning up' task
                    await Promise.all(chunkDirs.map((dir, index) => {
                        return createZip(dir, index, ctx);
                    }));
                } catch (error) {
                    ctx.errors.push(error);
                    throw error;
                }
            }
        },
        {
            title: 'Moving zips',
            task: async (ctx) => {
                // 6. Move each new zip to the desired destination path
                try {
                    let filePaths = glob.sync(`${ctx.fileCache.zipDir}/*.zip`);

                    await Promise.all(filePaths.map(async (filePath) => {
                        let fileName = basename(filePath);
                        let folderName = basename(ctx.args.dirPath).replace('.zip', '');
                        await fs.move(filePath, `${ctx.args.destDir}/${folderName}_zip_chunks/${fileName}`, {
                            overwrite: true
                        });
                    }));
                } catch (error) {
                    ctx.errors.push(error);
                    throw error;
                }
            }
        },
        {
            title: 'Cleaning up',
            skip: () => true,
            task: async (ctx) => {
                // 7. Remove the cached data
                try {
                    await fs.remove(ctx.fileCache.cacheDir);
                } catch (error) {
                    ctx.errors.push(error);
                    throw error;
                }
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
