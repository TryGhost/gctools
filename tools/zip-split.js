const fsUtils = require('@tryghost/mg-fs-utils');
const ui = require('@tryghost/pretty-cli').ui;
const zip = require('@tryghost/zip');
const archiver = require('archiver');
const fs = require('fs-extra');
const glob = require('glob');
const path = require('path');

class zipSplit {
    constructor(args) {
        this.dir = args.dir;
        this.zipFile = args.zipFile;
        this.sizeInMb = args.sizeInMb;
        this.sizeInBytes = (args.sizeInMb * (1024 * 1024));
        this.fileCache = new fsUtils.FileCache('zip_split');
        this.destDir = args.destDir;
    }

    // Take a zip file, and unzips into a specific directory
    // Returns the path of the unzipped files
    async unzipIntoDir() {
        let src = this.zipFile;
        let dest = this.fileCache.tmpDir;

        ui.log.info('Decompressing file');

        try {
            let res = await zip.extract(src, dest);
            return res;
        } catch (err) {
            ui.log.error('Could not unzip file', err);
            process.exit(1);
        }
    }

    // Gets the required file info for a given path
    async hydrateFile(src) {
        let stats = await fs.stat(src);
        let data = {
            path: src,
            size: stats.size
        };
        return data;
    }

    // Loops over all the files in the temp directory, and creates an array of files, with the file size
    // Returns an array of files
    async hydrateFiles(theFiles) {
        let src = this.fileCache.tmpDir;

        let filePaths = glob.sync(`${src}/**/*`, {
            dot: false,
            nodir: true
        });

        await Promise.all(filePaths.map(async (filePath) => {
            let hydrated = await this.hydrateFile(filePath);
            theFiles.push(hydrated);
        }));

        return theFiles;
    }

    // Splits an array into smaller arrays based on the `size` property of each object
    async chunkFiles(input) {
        let chunkMaxSize = this.sizeInBytes;

        ui.log.info('Calculating smaller sets of images');

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

    // Create a single zips from the the given chunk of files
    async createZip(chunk, index) {
        const zipFileParts = path.parse(this.zipFile);
        const zipName = `${zipFileParts.name}_${index}.zip`;

        fsUtils.zip.write(this.fileCache.zipDir, chunk, zipName);
    }

    // Create multiple zips from the array of chunks
    async createZips(chunks) {
        let chunkDirs = glob.sync(`${this.fileCache.zipDir}/chunks/*`);

        await Promise.all(chunkDirs.map((dir, index) => {
            return this.createZip(dir, index);
        }));

        return chunks;
    }

    // Create a directory for each chunk
    async createChunkDir(chunks) {
        await Promise.all(
            chunks.map(async (chunk, index) => {
                let tmpDir = this.fileCache.tmpDir;
                let zipDir = this.fileCache.zipDir;

                await Promise.all(chunk.map(async (file) => {
                    let filePathNoBase = file.path.replace(tmpDir, '');
                    let newLocal = path.join(zipDir, `chunks/chunk_${index}`, filePathNoBase);
                    await fs.move(file.path, newLocal, {
                        overwrite: true
                    });
                }));
            })
        );

        return chunks;
    }

    // Move zips from the cache to their final destination
    async moveZips() {
        let filePaths = glob.sync(`${this.fileCache.zipDir}/*.zip`);

        await Promise.all(filePaths.map(async (filePath) => {
            let fileName = path.basename(filePath);
            await fs.move(filePath, `${this.destDir}/${fileName}`, {
                overwrite: true
            });
        }));

        return true;
    }

    // Remove temp files from the cache
    async cleanup() {
        let pathToClean = this.fileCache.cacheDir;

        try {
            await fs.remove(pathToClean);
            ui.log.info(`Cleaning up…`);
            return true;
        } catch (err) {
            ui.log.error(`Could not empty ${pathToClean}`, err);
        }
    }

    // Run the whole shebang
    async run() {
        ui.log.debug(`Workspace initialised at ${this.fileCache.cacheDir}`);

        ui.log.info(`Converting ${this.zipFile} into ${this.sizeInMb}MB chunks`);

        try {
            let theFiles = [];

            let theZip = await this.unzipIntoDir();
            let hydratedFiles = await this.hydrateFiles(theFiles);
            let chunks = await this.chunkFiles(hydratedFiles);
            let dirs = await this.createChunkDir(chunks);
            let newZips = await this.createZips(chunks);

            await Promise.all([theZip, hydratedFiles, chunks, dirs, newZips]);

            ui.log.info(`Created ${newZips.length} zips`);

            await this.moveZips();

            await this.cleanup();

            ui.log.info(`And done. The new zips are at: ${this.destDir}`);
        } catch (err) {
            ui.log.error('Could not unzip file', err);
            process.exit(1);
        }
    }
}

module.exports = zipSplit;
