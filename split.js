const ui = require('@tryghost/pretty-cli').ui;
const zip = require('@tryghost/zip');
const archiver = require('archiver');
const fs = require('fs-extra');
const glob = require('glob');
const path = require('path');

const dir = path.join(process.argv[1], '../');
const zipFile = process.argv[2];
const zipFilePath = path.join(dir, zipFile);
const sizeInMb = process.argv[3];
const sizeInBytes = (sizeInMb * (1024 * 1024));
const destPath = path.join(dir, '/temp');

// Take a zip file, and unzips into a specific directory
// Returns the path of the unzipped files
async function unzipIntoDir(src, dest) {
    ui.log.info('Decompressing file…');

    try {
        let res = await zip.extract(src, dest);
        return res;
    } catch (err) {
        ui.log.error('Could not unzip file', err);
        process.exit(1);
    }
}

// Gets the required file info for a given path
async function hydrateFile(src) {
    let stats = await fs.stat(src);
    let data = {
        path: src,
        size: stats.size
    };
    return data;
}

// Loops over all the files in the temp directory, and creates an array of files, with the file size
// Returns an array of files
async function hydrateFiles(src, theFiles) {
    ui.log.info('Getting file sizes…');

    let filePaths = glob.sync(`${src}/**/*`, {
        dot: false,
        nodir: true
    });

    await Promise.all(filePaths.map(async (filePath) => {
        let hydrated = await hydrateFile(filePath);
        theFiles.push(hydrated);
    }));

    return theFiles;
}

// Splits an array into smaller arrays based on the `size` property of each object
async function chunkFiles(input, chunkMaxSize) {
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

// Create multiple zips from the array of chunks
async function createZips(chunks) {
    chunks.forEach((chunk, index) => {
        const zipFileParts = path.parse(zipFile);
        const zipName = `${zipFileParts.name}_${index}.zip`;

        const output = fs.createWriteStream(__dirname + '/' + zipName);
        const archive = archiver('zip');

        archive.pipe(output);

        chunk.forEach((item) => {
            let filePath = item.path;
            let fileName = filePath.replace(dir + 'temp/', '');
            archive.file(filePath, {
                name: fileName
            });
        });

        archive.finalize();
    });

    return chunks;
}

(async function main() {
    ui.log.info(`Converting ${zipFile} into ${sizeInMb}MB chunks`);

    try {
        let theFiles = [];

        let theZip = await unzipIntoDir(zipFilePath, destPath);
        let hydratedFiles = await hydrateFiles(destPath, theFiles);
        let chunks = await chunkFiles(hydratedFiles, sizeInBytes);
        let newZips = await createZips(chunks);

        await Promise.all([theZip, hydratedFiles, chunks, newZips]);

        ui.log.info(`Created ${newZips.length} zips`);
    } catch (err) {
        ui.log.error('Could not unzip file', err);
        process.exit(1);
    }
}());
