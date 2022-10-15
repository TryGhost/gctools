import {join, dirname, basename, extname} from 'node:path';
import url from 'node:url';
import fsUtils from '@tryghost/mg-fs-utils';
import fs from 'fs-extra';
import {ImagesPayload} from 'imastify';
import {makeTaskRunner} from '@tryghost/listr-smart-renderer';

const knownExtensions = ['.jpg', '.jpeg', '.gif', '.png', '.svg', '.svgz', '.ico', '.webp'];

const getAllImageMatches = (source) => {
    const matches = [];
    source.replace(() => {
        matches.push({
            match: arguments[0],
            offset: arguments[arguments.length - 2],
            groups: Array.prototype.slice.call(arguments, 1, -2)
        });
        return arguments[0];
    });
    return matches;
};

const fetchImage = async (src) => {
    const payload = new ImagesPayload();
    const downloaded = await payload.request(src);

    return downloaded;
};

const changeExtension = (string, ext) => {
    return join(dirname(string), basename(string, extname(string)) + ext);
};

const extractImagePaths = (block, blockType, options) => {
    let blockImages = [];

    // The object keys that exist in most objects
    const mainKeys = [
        'feature_image',
        'profile_image',
        'cover_image',
        'og_image',
        'twitter_image'
    ];

    // The keys to check when blockType === 'settings'
    const settingsKeys = [
        'logo',
        'cover_image',
        'icon',
        'og_image',
        'twitter_image',
        'newsletter_header_image'
    ];

    // External URLs to not scrape images from
    const externalUrls = ['https://images.unsplash.com', '//www.gravatar.com/avatar/'];

    mainKeys.forEach((key) => {
        if (block[key]) {
            blockImages.push({
                name: key,
                itemType: blockType,
                fileSrc: block[key],
                remoteSrc: block[key]
            });
        }
    });

    // In 'settings', we're not checking the key, but instead a property of the object
    if (blockType === 'settings') {
        settingsKeys.forEach((key) => {
            if (block.key === key && block.value) {
                blockImages.push({
                    name: key,
                    itemType: blockType,
                    fileSrc: block.value,
                    remoteSrc: block.value
                });
            }
        });
    }

    if (block.mobiledoc) {
        const mobiledoc = JSON.parse(block.mobiledoc);

        mobiledoc.cards.forEach((card) => {
            const cardName = card[0];
            const cardData = card[1];

            if (cardName === 'gallery') {
                cardData.images.forEach((image) => {
                    if (image.src) {
                        blockImages.push({
                            name: 'mobiledoc_gallery',
                            type: blockType,
                            fileSrc: image.src,
                            remoteSrc: image.src
                        });
                    }
                });
            } else if (cardName === 'image') {
                if (cardData.src) {
                    blockImages.push({
                        name: 'mobiledoc_image',
                        type: blockType,
                        fileSrc: cardData.src,
                        remoteSrc: cardData.src
                    });
                }
            } else if (cardName === 'bookmark') {
                if (cardData.metadata.thumbnail) {
                    blockImages.push({
                        name: 'mobiledoc_bookmark',
                        type: blockType,
                        fileSrc: cardData.metadata.thumbnail,
                        remoteSrc: cardData.metadata.thumbnail
                    });
                }
            } else if (cardName === 'html') {
                const imageSrcRegex = new RegExp('<img[^>]+src="([^">]+)"', 'gm');
                const matches = getAllImageMatches(cardData.html, imageSrcRegex);
                if (matches.length > 0) {
                    matches.forEach((match) => {
                        blockImages.push({
                            name: 'mobiledoc_html',
                            type: blockType,
                            fileSrc: match.groups[0],
                            remoteSrc: match.groups[0]
                        });
                    });
                }
            }
        });
    }

    // Remove unsplash images, there can stay as remote resources
    blockImages = blockImages.filter((image) => {
        if (externalUrls.includes(image.fileSrc)) {
            return false;
        } else {
            return image;
        }
    });

    // Swap `__GHOST_URL__` to be the site URL
    if (options.url) {
        blockImages = blockImages.map((image) => {
            image.remoteSrc = image.remoteSrc.replace('__GHOST_URL__', options.url);

            return image;
        });
    }

    return blockImages;
};

const initialise = (options) => {
    return {
        title: 'Initialising Workspace',
        task: (ctx) => {
            ctx.options = options;

            ctx.fileCache = new fsUtils.FileCache(`${options.jsonFile}`);

            ctx.jsonData = [];
            ctx.newJsonData = [];

            ctx.images = [];

            ctx.baseJSON = {
                meta: {
                    exported_on: null,
                    version: null
                },
                data: {}
            };

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
                    // ctx.originalJsonFileData = jsonFileData;

                    const jsonData = (jsonFileData.data) ? jsonFileData.data : jsonFileData.db[0].data;
                    ctx.jsonData = jsonData;

                    // This is the object we'll add updated image references to
                    ctx.newJsonData = jsonData;

                    ctx.baseJSON.meta.exported_on = (jsonFileData.data) ? jsonFileData.meta.exported_on : jsonFileData.db[0].meta.exported_on;
                    ctx.baseJSON.meta.version = (jsonFileData.data) ? jsonFileData.meta.version : jsonFileData.db[0].meta.version;
                } catch (error) {
                    ctx.errors.push(error);
                    throw error;
                }
            }
        },
        {
            title: 'Find all images',
            task: async (ctx) => {
                for (let itemType in ctx.jsonData) {
                    ctx.jsonData[itemType].forEach((block) => {
                        let findImages = extractImagePaths(block, itemType, options);

                        if (findImages.length) {
                            ctx.images.push(...findImages);
                        }
                    });
                }
            }
        },
        {
            title: 'Download images',
            task: async (ctx) => {
                let tasks = [];

                ctx.images.forEach((image, i) => {
                    let imageUrl = url.parse(image.remoteSrc);
                    let imageFile = ctx.fileCache.resolveImageFileName(imageUrl.pathname);
                    let imageOptions = Object.assign(imageFile, {
                        optimize: true
                    });

                    imageOptions.filename = basename(image.remoteSrc);

                    tasks.push({
                        title: `${image.remoteSrc}`,
                        task: async () => {
                            if (!ctx.fileCache.hasFile(imageFile.storagePath)) {
                                let theImgToGet = image.remoteSrc.replace(/^\/\//, 'https://');

                                let response = await fetchImage(theImgToGet);

                                let newExt = '.' + response.type;

                                if (knownExtensions.includes(newExt)) {
                                    imageOptions.filename = changeExtension(imageOptions.filename, newExt);
                                    imageOptions.storagePath = changeExtension(imageOptions.storagePath, newExt);
                                    imageOptions.outputPath = changeExtension(imageOptions.outputPath, newExt);
                                }

                                await ctx.fileCache.writeImageFile(response.image.source, imageOptions);
                            }

                            ctx.images[i].newSrc = imageOptions.outputPath;
                        }
                    });
                });

                let downloadImageOpts = options;
                downloadImageOpts.concurrent = 1;

                return makeTaskRunner(tasks, downloadImageOpts);
            }
        },
        {
            title: 'Update post images references',
            task: async (ctx) => {
                let tasks = [];

                ctx.images.forEach((image) => {
                    tasks.push({
                        title: `${image.remoteSrc}`,
                        task: async (ctx) => { // eslint-disable-line no-shadow
                            let jsonString = JSON.stringify(ctx.newJsonData);
                            let replaceRegex = new RegExp(`${image.fileSrc}`, 'g');
                            jsonString = jsonString.replace(replaceRegex, image.newSrc);
                            ctx.newJsonData = JSON.parse(jsonString);
                        }
                    });
                });

                return makeTaskRunner(tasks, options);
            }
        },
        {
            title: 'Create JSON file',
            task: async (ctx) => {
                ctx.baseJSON.data = ctx.newJsonData;

                await ctx.fileCache.writeGhostImportFile(ctx.baseJSON, {
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
