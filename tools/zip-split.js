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
        this.tempDir = args.tempDir;
        this.destDir = args.destDir;
    }

    async unzipIntoDir(src, dest) {
        ui.log.info('Decompressing file…');

        try {
            let res = await zip.extract(src, dest);
            return res;
        } catch (err) {
            ui.log.error('Could not unzip file', err);
            process.exit(1);
        }
    }

    async hydrateFile(src) {
        let stats = await fs.stat(src);
        let data = {
            path: src,
            size: stats.size
        };
        return data;
    }

    async hydrateFiles(src, theFiles) {
        ui.log.info('Getting file sizes…');

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

    async chunkFiles(input, chunkMaxSize) {
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

    async createZip(chunk, index) {
        return new Promise((resolve) => {
            const zipFileParts = path.parse(this.zipFile);
            const zipName = `${zipFileParts.name}_${index}.zip`;

            const output = fs.createWriteStream(this.destDir + '/' + zipName);
            const archive = archiver('zip');

            archive.pipe(output);

            chunk.forEach((item) => {
                let filePath = item.path;
                let fileName = filePath.replace(this.dir + 'temp/', '');
                archive.file(filePath, {
                    name: fileName
                });
            });

            // A very noisy progress output
            // archive.on("progress", progress => {
            //     console.log(progress);
            // });

            archive.finalize();

            archive.on('end', () => {
                ui.log.debug(`Created ${zipName}`);
                resolve(chunk);
            });
        });
    }

    async createZips(chunks) {
        await Promise.all(
            chunks.map((chunk, index) => {
                return this.createZip(chunk, index);
            })
        );

        return chunks;
    }

    async cleanup(pathToClean) {
        try {
            await fs.remove(pathToClean);
            ui.log.info(`Cleaning up…`);
            return true;
        } catch (err) {
            ui.log.error(`Could not empty ${pathToClean}`, err);
        }
    }

    async run() {
        ui.log.info(`Converting ${this.zipFile} into ${this.sizeInMb}MB chunks`);

        try {
            let theFiles = [];

            let theZip = await this.unzipIntoDir(this.zipFile, this.tempDir);
            let hydratedFiles = await this.hydrateFiles(this.tempDir, theFiles);
            let chunks = await this.chunkFiles(hydratedFiles, this.sizeInBytes);
            let newZips = await this.createZips(chunks);

            await Promise.all([theZip, hydratedFiles, chunks, newZips]);

            ui.log.info(`Created ${newZips.length} zips`);

            await this.cleanup(this.tempDir);

            ui.log.info(`And done. The new zips are at: ${this.destDir}`);
        } catch (err) {
            ui.log.error('Could not unzip file', err);
            process.exit(1);
        }
    }

}

module.exports = zipSplit;
