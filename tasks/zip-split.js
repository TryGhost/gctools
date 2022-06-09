import fsUtils from '@tryghost/mg-fs-utils';
import zip from '@tryghost/zip';
import fs from 'fs-extra';
import glob from 'glob';
import path from 'path';
import superbytes from 'superbytes';
import makeTaskRunner from '../lib/task-runner.js';

function pad(n, width, z) {
    z = z || '0';
    n = n + '';
    return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}

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

const initialise = (options) => {
    return {
        title: 'Initialising Workspace',
        task: (ctx, task) => {
            ctx.args = options;

            ctx.fileCache = new fsUtils.FileCache('zip_split');
            ctx.theFiles = [];
            ctx.chunks = [];
            ctx.args.sizeInBytes = (options.maxSize * (1024 * 1024));
            ctx.args.destDir = path.dirname(options.zipFile);

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
            title: 'Unzipping file',
            task: async (ctx, task) => {
                // 1. Unzip the file
                let size = fs.statSync(ctx.args.zipFile);
                task.output = `Zip file size is ${superbytes(size.size)}`;

                try {
                    let res = await zip.extract(ctx.args.zipFile, ctx.fileCache.tmpDir);
                    return res;
                } catch (error) {
                    ctx.errors.push(error);
                    throw error;
                }
            }
        },
        {
            title: 'Getting image sizes',
            task: async (ctx, task) => {
                // 2. Get the size for each image that was just unzipped
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

                task.output = `Found ${ctx.theFiles.length} images`;
            }
        },
        {
            title: 'Chunking files',
            task: async (ctx, task) => {
                // 3. Chunk the files into smaller groups
                try {
                    ctx.chunks = await chunkFiles(ctx);
                } catch (error) {
                    ctx.errors.push(error);
                    throw error;
                }

                task.output = `Created ${ctx.chunks.length} chunks`;
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
                                let newLocal = path.join(zipDir, `chunks/chunk_${index}`, filePathNoBase);
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
                let tasks = [];
                let chunkDirs = glob.sync(`${ctx.fileCache.zipDir}/chunks/*`);

                chunkDirs.forEach((dir, index) => {
                    const zipFileParts = path.parse(ctx.args.zipFile);
                    const indexPlus1 = index + 1;
                    const indexPadded = pad(indexPlus1, chunkDirs.length.toString().length);
                    const zipName = `${zipFileParts.name}_${indexPadded}.zip`;

                    tasks.push({
                        title: `Zipping ${zipName}`,
                        task: async () => {
                            await fsUtils.zip.write(ctx.fileCache.zipDir, dir, zipName);
                        }
                    });
                });

                let taskOptions = ctx.args;
                taskOptions.concurrent = 3;
                return makeTaskRunner(tasks, taskOptions);
            }
        },
        {
            title: 'Moving zips',
            task: async (ctx) => {
                // 6. Move each new zip to the desired destination path
                try {
                    let filePaths = glob.sync(`${ctx.fileCache.zipDir}/*.zip`);

                    await Promise.all(filePaths.map(async (filePath) => {
                        let fileName = path.basename(filePath);
                        let folderName = path.basename(ctx.args.zipFile).replace('.zip', '');
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
