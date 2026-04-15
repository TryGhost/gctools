import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import axios from 'axios';
import heicConvert from 'heic-convert';
import Promise from 'bluebird';
import GhostAdminAPI from '@tryghost/admin-api';
import {makeTaskRunner} from '@tryghost/listr-smart-renderer';
import _ from 'lodash';
import {transformToCommaString} from '../lib/utils.js';
import {discover} from '../lib/batch-ghost-discover.js';

// Domains that should never be scraped
const blockedDomains = [
    'storage.ghost.io',
    'images.unsplash.com',
    'gravatar.com',
    'www.gravatar.com'
];

// Allowlist of MIME types we handle
const knownImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/svg+xml', 'image/x-icon', 'image/vnd.microsoft.icon', 'image/webp', 'image/avif', 'image/heif', 'image/heic', 'image/mpo'];
const knownMediaTypes = ['video/mp4', 'video/webm', 'video/ogg', 'audio/mpeg', 'audio/vnd.wav', 'audio/wave', 'audio/wav', 'audio/x-wav', 'audio/ogg', 'audio/mp4', 'audio/x-m4a'];
const knownFileTypes = ['application/pdf', 'application/json', 'application/ld+json', 'application/vnd.oasis.opendocument.presentation', 'application/vnd.oasis.opendocument.spreadsheet', 'application/vnd.oasis.opendocument.text', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/rtf', 'text/plain', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/xml', 'application/atom+xml'];

// Card types and which fields contain media URLs
const LEXICAL_MEDIA_TYPES = ['image', 'audio', 'video', 'file'];
const LEXICAL_SRC_FIELDS = ['src', 'thumbnailSrc', 'customThumbnailSrc'];

const MOBILEDOC_CARD_SRC_FIELDS = {
    image: ['src'],
    audio: ['src'],
    video: ['src', 'thumbnailSrc', 'customThumbnailSrc'],
    file: ['src']
};

/**
 * Recursively extract all media URLs from a Lexical content tree
 */
const extractMediaFromLexical = (node) => {
    let urls = [];

    if (LEXICAL_MEDIA_TYPES.includes(node.type)) {
        for (const field of LEXICAL_SRC_FIELDS) {
            if (node[field]) {
                urls.push(node[field]);
            }
        }
    }

    // Gallery nodes contain nested image nodes
    if (node.type === 'gallery' && node.images) {
        for (const img of node.images) {
            if (img.src) {
                urls.push(img.src);
            }
        }
    }

    if (node.children && Array.isArray(node.children)) {
        for (const child of node.children) {
            urls = urls.concat(extractMediaFromLexical(child));
        }
    }

    return urls;
};

/**
 * Recursively replace media URLs in a Lexical content tree
 */
const replaceUrlsInLexical = (node, urlMap) => {
    if (LEXICAL_MEDIA_TYPES.includes(node.type)) {
        for (const field of LEXICAL_SRC_FIELDS) {
            if (node[field] && urlMap.has(node[field])) {
                node[field] = urlMap.get(node[field]);
            }
        }
    }

    if (node.type === 'gallery' && node.images) {
        for (const img of node.images) {
            if (img.src && urlMap.has(img.src)) {
                img.src = urlMap.get(img.src);
            }
        }
    }

    if (node.children && Array.isArray(node.children)) {
        for (const child of node.children) {
            replaceUrlsInLexical(child, urlMap);
        }
    }
};

/**
 * Extract all media URLs from Mobiledoc cards
 */
const extractMediaFromMobiledoc = (cards) => {
    let urls = [];

    for (const card of cards) {
        const cardType = card[0];
        const cardPayload = card[1];

        if (!cardPayload) {
            continue;
        }

        // Handle gallery cards specially (array of images)
        if (cardType === 'gallery' && cardPayload.images) {
            for (const img of cardPayload.images) {
                if (img.src) {
                    urls.push(img.src);
                }
            }
            continue;
        }

        // Handle image, audio, video, file cards
        const srcFields = MOBILEDOC_CARD_SRC_FIELDS[cardType];
        if (srcFields) {
            for (const field of srcFields) {
                if (cardPayload[field]) {
                    urls.push(cardPayload[field]);
                }
            }
        }
    }

    return urls;
};

/**
 * Replace media URLs in Mobiledoc cards
 */
const replaceUrlsInMobiledoc = (cards, urlMap) => {
    for (const card of cards) {
        const cardType = card[0];
        const cardPayload = card[1];

        if (!cardPayload) {
            continue;
        }

        if (cardType === 'gallery' && cardPayload.images) {
            for (const img of cardPayload.images) {
                if (img.src && urlMap.has(img.src)) {
                    img.src = urlMap.get(img.src);
                }
            }
            continue;
        }

        const srcFields = MOBILEDOC_CARD_SRC_FIELDS[cardType];
        if (srcFields) {
            for (const field of srcFields) {
                if (cardPayload[field] && urlMap.has(cardPayload[field])) {
                    cardPayload[field] = urlMap.get(cardPayload[field]);
                }
            }
        }
    }
};

/**
 * Download a file to a temp directory, returning the file path and content type.
 * HEIC/HEIF images are converted to JPEG before saving.
 */
const downloadFile = async (url, tmpDir) => {
    const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 60000,
        headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; GCTools/1.0)',
            Accept: '*/*'
        }
    });
    let contentType = response.headers['content-type'] || '';
    let data = Buffer.from(response.data);

    const mime = contentType.split(';')[0].trim();

    // Convert HEIC/HEIF to JPEG
    if (mime === 'image/heic' || mime === 'image/heif') {
        data = Buffer.from(await heicConvert({
            buffer: data,
            format: 'JPEG',
            quality: 1
        }));
        contentType = 'image/jpeg';
    }

    // MPO is essentially a multi-frame JPEG; the first frame is a standard JPEG
    if (mime === 'image/mpo') {
        contentType = 'image/jpeg';
    }

    const urlPath = new URL(url).pathname;
    const origExt = path.extname(urlPath) || '.bin';
    const convertedToJpg = mime === 'image/heic' || mime === 'image/heif' || mime === 'image/mpo';
    const ext = convertedToJpg ? '.jpg' : origExt;
    const basename = path.basename(urlPath, origExt) || 'file';
    const filename = `${basename}-${Date.now()}${ext}`;
    const filePath = path.join(tmpDir, filename);

    fs.writeFileSync(filePath, data);
    return {filePath, contentType};
};

/**
 * Upload a file to the correct Ghost endpoint based on MIME type.
 * Returns null if the MIME type is not in the allowlist.
 */
const uploadToGhost = async (api, filePath, contentType) => {
    const mime = contentType.split(';')[0].trim();

    if (knownImageTypes.includes(mime)) {
        return api.images.upload({file: filePath});
    } else if (knownMediaTypes.includes(mime)) {
        return api.media.upload({file: filePath});
    } else if (knownFileTypes.includes(mime)) {
        return api.files.upload({file: filePath});
    }

    return null;
};

const initialise = (options) => {
    return {
        title: 'Initialising API connection',
        task: (ctx, task) => {
            let defaults = {
                verbose: false,
                tag: false,
                author: false,
                delayBetweenCalls: 50
            };

            const url = options.apiURL.replace(/\/$/, '');
            const key = options.adminAPIKey;
            const api = new GhostAdminAPI({
                url: url.replace('localhost', '127.0.0.1'),
                key,
                version: 'v5.0'
            });

            ctx.args = _.mergeWith(defaults, options);
            ctx.api = api;
            ctx.siteUrl = url;
            ctx.posts = [];
            ctx.pages = [];
            ctx.toProcess = [];
            ctx.updated = [];

            task.output = `Initialised API connection for ${options.apiURL}`;
        }
    };
};

const getFullTaskList = (options) => {
    return [
        initialise(options),
        {
            title: 'Fetch posts from Ghost API',
            skip: () => {
                return !options.type.includes('posts') && !options.type.includes('all');
            },
            task: async (ctx, task) => {
                let discoveryFilter = [];

                if (ctx.args.status && ctx.args.status !== 'all') {
                    discoveryFilter.push(`status:[${ctx.args.status}]`);
                }

                if (ctx.args.visibility && ctx.args.visibility !== 'all') {
                    discoveryFilter.push(`visibility:[${ctx.args.visibility}]`);
                }

                if (ctx.args.tag && ctx.args.tag.length > 0) {
                    discoveryFilter.push(`tags:[${transformToCommaString(ctx.args.tag, 'slug')}]`);
                }

                if (ctx.args.author && ctx.args.author.length > 0) {
                    discoveryFilter.push(`author:[${transformToCommaString(ctx.args.author, 'slug')}]`);
                }

                // Exclude content already processed
                discoveryFilter.push('tags:-[hash-imagesuploaded]');

                try {
                    ctx.posts = await discover({
                        api: ctx.api,
                        type: 'posts',
                        limit: 100,
                        include: 'tags',
                        formats: 'mobiledoc,lexical',
                        filter: discoveryFilter.join('+')
                    });

                    ctx.posts.forEach((post) => {
                        post._type = 'posts';
                    });

                    task.output = `Found ${ctx.posts.length} posts`;
                } catch (error) {
                    ctx.errors.push(error);
                    throw error;
                }
            }
        },
        {
            title: 'Fetch pages from Ghost API',
            skip: () => {
                return !options.type.includes('pages') && !options.type.includes('all');
            },
            task: async (ctx, task) => {
                let discoveryFilter = [];

                if (ctx.args.visibility && ctx.args.visibility !== 'all') {
                    discoveryFilter.push(`visibility:[${ctx.args.visibility}]`);
                }

                if (ctx.args.tag && ctx.args.tag.length > 0) {
                    discoveryFilter.push(`tags:[${transformToCommaString(ctx.args.tag, 'slug')}]`);
                }

                if (ctx.args.author && ctx.args.author.length > 0) {
                    discoveryFilter.push(`author:[${transformToCommaString(ctx.args.author, 'slug')}]`);
                }

                discoveryFilter.push('tags:-[hash-imagesuploaded]');

                try {
                    ctx.pages = await discover({
                        api: ctx.api,
                        type: 'pages',
                        limit: 100,
                        include: 'tags',
                        formats: 'mobiledoc,lexical',
                        filter: discoveryFilter.join('+')
                    });

                    ctx.pages.forEach((page) => {
                        page._type = 'pages';
                    });

                    task.output = `Found ${ctx.pages.length} pages`;
                } catch (error) {
                    ctx.errors.push(error);
                    throw error;
                }
            }
        },
        {
            title: 'Finding external media',
            skip: (ctx) => {
                return ctx.posts.length === 0 && ctx.pages.length === 0;
            },
            task: async (ctx) => {
                let tasks = [];
                const allContent = [...ctx.posts, ...ctx.pages];

                allContent.forEach((post) => {
                    tasks.push({
                        title: post.title,
                        task: async (ctx) => { // eslint-disable-line no-shadow
                            let mediaUrls = [];

                            // Metadata image fields
                            const metaFields = ['feature_image', 'og_image', 'twitter_image'];
                            for (const field of metaFields) {
                                if (post[field]) {
                                    mediaUrls.push(post[field]);
                                }
                            }

                            // Lexical content
                            if (post.lexical) {
                                try {
                                    const lexicalContent = JSON.parse(post.lexical);
                                    mediaUrls = mediaUrls.concat(extractMediaFromLexical(lexicalContent.root));
                                } catch (e) {
                                    // Invalid lexical JSON, skip
                                }
                            }

                            // Mobiledoc content
                            if (post.mobiledoc) {
                                try {
                                    const mobiledocContent = JSON.parse(post.mobiledoc);
                                    if (mobiledocContent.cards) {
                                        mediaUrls = mediaUrls.concat(extractMediaFromMobiledoc(mobiledocContent.cards));
                                    }
                                } catch (e) {
                                    // Invalid mobiledoc JSON, skip
                                }
                            }

                            // Deduplicate, filter out media already on the Ghost site,
                            // and filter by asset domain if specified
                            mediaUrls = [...new Set(mediaUrls)].filter((url) => {
                                if (url.startsWith(ctx.siteUrl)) {
                                    return false;
                                }
                                try {
                                    const urlHost = new URL(url).hostname;
                                    if (blockedDomains.some((d) => {
                                        return urlHost === d || urlHost.endsWith(`.${d}`);
                                    })) {
                                        return false;
                                    }
                                } catch (e) {
                                    return false;
                                }
                                if (ctx.args.assetDomains && ctx.args.assetDomains.length > 0) {
                                    try {
                                        const urlHost = new URL(url).hostname;
                                        return ctx.args.assetDomains.some((domain) => {
                                            return urlHost === domain || urlHost.endsWith(`.${domain}`);
                                        });
                                    } catch (e) {
                                        return false;
                                    }
                                }
                                return true;
                            });

                            post.externalMedia = mediaUrls;

                            if (mediaUrls.length > 0) {
                                ctx.toProcess.push(post);
                            }
                        }
                    });
                });

                let taskOptions = options;
                taskOptions.concurrent = 3;
                return makeTaskRunner(tasks, taskOptions);
            }
        },
        {
            title: 'Reporting external media (dry run)',
            enabled: () => options.dryRun,
            skip: (ctx) => {
                return ctx.toProcess.length === 0;
            },
            task: async (ctx, task) => {
                let totalMedia = 0;

                for (const post of ctx.toProcess) {
                    totalMedia += post.externalMedia.length;
                }

                task.title = `Found ${totalMedia} external media files across ${ctx.toProcess.length} posts`;
            }
        },
        {
            title: 'Downloading media',
            enabled: () => !options.dryRun,
            skip: (ctx) => {
                return ctx.toProcess.length === 0;
            },
            task: async (ctx, task) => {
                ctx.tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gctools-'));
                ctx.downloaded = [];
                task.output = `Temp folder: ${ctx.tmpDir}`;

                let tasks = [];

                ctx.toProcess.forEach((post) => {
                    post.externalMedia.forEach((mediaUrl) => {
                        const filename = path.basename(new URL(mediaUrl).pathname) || mediaUrl;
                        tasks.push({
                            title: filename,
                            task: async () => {
                                try {
                                    const {filePath, contentType} = await downloadFile(mediaUrl, ctx.tmpDir);
                                    ctx.downloaded.push({mediaUrl, filePath, contentType});
                                } catch (e) {
                                    const reason = e.message || e.context || e.statusCode || String(e);
                                    ctx.errors.push(`Failed to download ${mediaUrl}: ${reason}`);
                                }
                            }
                        });
                    });
                });

                let taskOptions = {...options};
                taskOptions.concurrent = 5;
                return makeTaskRunner(tasks, taskOptions);
            }
        },
        {
            title: 'Uploading media to Ghost',
            enabled: () => !options.dryRun,
            skip: (ctx) => {
                return !ctx.downloaded || ctx.downloaded.length === 0;
            },
            task: async (ctx) => {
                ctx.urlMap = new Map();

                let tasks = [];

                ctx.downloaded.forEach(({mediaUrl, filePath, contentType}) => {
                    const filename = path.basename(filePath);
                    tasks.push({
                        title: filename,
                        task: async () => {
                            try {
                                const uploadResult = await uploadToGhost(ctx.api, filePath, contentType);

                                if (uploadResult) {
                                    ctx.urlMap.set(mediaUrl, uploadResult.url);
                                } else {
                                    ctx.errors.push(`Skipping unsupported type (${contentType}): ${mediaUrl}`);
                                }
                            } catch (e) {
                                const reason = e.message || e.context || e.statusCode || String(e);
                                ctx.errors.push(`Failed to upload ${mediaUrl}: ${reason}`);
                            }
                        }
                    });
                });

                let taskOptions = {...options};
                taskOptions.concurrent = 5;
                return makeTaskRunner(tasks, taskOptions);
            }
        },
        {
            title: 'Updating posts',
            enabled: () => !options.dryRun,
            skip: (ctx) => {
                return !ctx.urlMap || ctx.urlMap.size === 0;
            },
            task: async (ctx) => {
                let tasks = [];
                const metaFields = ['feature_image', 'og_image', 'twitter_image'];

                ctx.toProcess.forEach((post) => {
                    // Only update posts that have at least one successfully uploaded URL
                    const hasUploads = post.externalMedia.some((url) => {
                        return ctx.urlMap.has(url);
                    });
                    if (!hasUploads) {
                        return;
                    }

                    tasks.push({
                        title: post.title,
                        task: async (ctx) => { // eslint-disable-line no-shadow
                            try {
                                const apiType = post._type || 'posts';
                                let currentPost = await ctx.api[apiType].read({id: post.id, include: 'tags', formats: 'mobiledoc,lexical'});

                                let updatePayload = {
                                    id: currentPost.id,
                                    updated_at: currentPost.updated_at
                                };

                                for (const field of metaFields) {
                                    if (currentPost[field] && ctx.urlMap.has(currentPost[field])) {
                                        updatePayload[field] = ctx.urlMap.get(currentPost[field]);
                                    }
                                }

                                if (currentPost.lexical) {
                                    try {
                                        let updatedLexical = JSON.parse(currentPost.lexical);
                                        replaceUrlsInLexical(updatedLexical.root, ctx.urlMap);
                                        updatePayload.lexical = JSON.stringify(updatedLexical);
                                    } catch (e) {
                                        // Skip if invalid JSON
                                    }
                                }

                                if (currentPost.mobiledoc) {
                                    try {
                                        let updatedMobiledoc = JSON.parse(currentPost.mobiledoc);
                                        if (updatedMobiledoc.cards) {
                                            replaceUrlsInMobiledoc(updatedMobiledoc.cards, ctx.urlMap);
                                        }
                                        updatePayload.mobiledoc = JSON.stringify(updatedMobiledoc);
                                    } catch (e) {
                                        // Skip if invalid JSON
                                    }
                                }

                                let updatedTags = [...currentPost.tags, {name: '#ImagesUploaded'}];
                                updatePayload.tags = updatedTags;

                                let result = await ctx.api[apiType].edit(updatePayload);

                                ctx.updated.push(result.url);
                                return Promise.delay(options.delayBetweenCalls).return(result);
                            } catch (error) {
                                if (!error.message) {
                                    error.message = error.context || error.statusCode || String(error);
                                }
                                error.resource = {
                                    title: post.title
                                };
                                ctx.errors.push(error);
                                throw error;
                            }
                        }
                    });
                });

                let taskOptions = options;
                taskOptions.concurrent = 5;
                return makeTaskRunner(tasks, taskOptions);
            }
        },
        {
            title: 'Cleaning up temp files',
            enabled: () => !options.dryRun,
            skip: (ctx) => {
                return !ctx.tmpDir;
            },
            task: (ctx) => {
                if (ctx.downloaded) {
                    for (const {filePath} of ctx.downloaded) {
                        try {
                            fs.unlinkSync(filePath);
                        } catch (e) {
                            // Ignore cleanup errors
                        }
                    }
                }
                try {
                    fs.rmdirSync(ctx.tmpDir);
                } catch (e) {
                    // Ignore if not empty or already removed
                }
            }
        }
    ];
};

const getTaskRunner = (options) => {
    let tasks = [];

    tasks = getFullTaskList(options);

    return makeTaskRunner(tasks, Object.assign({topLevel: true}, options));
};

export default {
    initialise,
    getFullTaskList,
    getTaskRunner
};
