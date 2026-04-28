import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import axios from 'axios';
import {fileTypeFromBuffer} from 'file-type';
import heicConvert from 'heic-convert';
import Promise from 'bluebird';
import GhostAdminAPI from '@tryghost/admin-api';
import {makeTaskRunner} from '@tryghost/listr-smart-renderer';
import errors from '@tryghost/errors';
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

// Map MIME types to file extensions
const mimeToExt = {
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'image/svg+xml': '.svg',
    'image/avif': '.avif',
    'image/x-icon': '.ico',
    'image/vnd.microsoft.icon': '.ico',
    'video/mp4': '.mp4',
    'video/webm': '.webm',
    'video/ogg': '.ogv',
    'audio/mpeg': '.mp3',
    'audio/ogg': '.ogg',
    'audio/wav': '.wav',
    'audio/vnd.wav': '.wav',
    'audio/wave': '.wav',
    'audio/x-wav': '.wav',
    'audio/mp4': '.m4a',
    'audio/x-m4a': '.m4a',
    'application/pdf': '.pdf'
};

/**
 * Download a file to a temp directory, returning the file path and content type.
 * HEIC/HEIF images are converted to JPEG before saving.
 * The file is always saved with an extension derived from the content type.
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
    let data = Buffer.from(response.data);

    // Detect the actual file type from the bytes, fall back to the server's content-type header
    const detected = await fileTypeFromBuffer(data);
    let contentType = detected ? detected.mime : (response.headers['content-type'] || '').split(';')[0].trim();

    // Reject responses that aren't a known media type (e.g. HTML error pages from CDNs)
    const allKnownTypes = [...knownImageTypes, ...knownMediaTypes, ...knownFileTypes];
    if (!allKnownTypes.includes(contentType)) {
        throw new errors.ValidationError({message: `Unsupported file type: ${contentType}`});
    }

    // Convert HEIC/HEIF to JPEG
    if (contentType === 'image/heic' || contentType === 'image/heif') {
        data = Buffer.from(await heicConvert({
            buffer: data,
            format: 'JPEG',
            quality: 1
        }));
        contentType = 'image/jpeg';
    }

    // MPO is essentially a multi-frame JPEG; the first frame is a standard JPEG
    if (contentType === 'image/mpo') {
        contentType = 'image/jpeg';
    }

    const ext = mimeToExt[contentType] || `.${detected?.ext || 'bin'}`;

    // Use the URL path for a readable basename, but strip any bogus extension
    const urlPath = new URL(url).pathname;
    const urlBasename = path.basename(urlPath, path.extname(urlPath)) || 'file';
    // Sanitise basename to remove characters that could cause issues
    const safeName = urlBasename.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `${safeName}-${Date.now()}${ext}`;
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
                try {
                    if (ctx.args.id) {
                        try {
                            let post = await ctx.api.posts.read({id: ctx.args.id}, {include: 'tags', formats: 'mobiledoc,lexical'});
                            post._type = 'posts';
                            ctx.posts = [post];
                        } catch (e) {
                            // ID may belong to a page, not a post
                            ctx.posts = [];
                        }
                    } else {
                        let discoveryFilter = [];

                        if (ctx.args.status && ctx.args.status !== 'all') {
                            discoveryFilter.push(`status:[${ctx.args.status}]`);
                        }

                        if (ctx.args.visibility && ctx.args.visibility !== 'all') {
                            discoveryFilter.push(`visibility:[${ctx.args.visibility}]`);
                        }

                        if (ctx.args.slug) {
                            discoveryFilter.push(`slug:${ctx.args.slug}`);
                        }

                        if (ctx.args.tag && ctx.args.tag.length > 0) {
                            discoveryFilter.push(`tags:[${transformToCommaString(ctx.args.tag, 'slug')}]`);
                        }

                        if (ctx.args.author && ctx.args.author.length > 0) {
                            discoveryFilter.push(`author:[${transformToCommaString(ctx.args.author, 'slug')}]`);
                        }

                        // Exclude content already processed
                        discoveryFilter.push('tags:-[hash-imagesuploaded]');

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
                    }

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
                try {
                    if (ctx.args.id) {
                        try {
                            let page = await ctx.api.pages.read({id: ctx.args.id}, {include: 'tags', formats: 'mobiledoc,lexical'});
                            page._type = 'pages';
                            ctx.pages = [page];
                        } catch (e) {
                            // ID may belong to a post, not a page
                            ctx.pages = [];
                        }
                    } else {
                        let discoveryFilter = [];

                        if (ctx.args.visibility && ctx.args.visibility !== 'all') {
                            discoveryFilter.push(`visibility:[${ctx.args.visibility}]`);
                        }

                        if (ctx.args.slug) {
                            discoveryFilter.push(`slug:${ctx.args.slug}`);
                        }

                        if (ctx.args.tag && ctx.args.tag.length > 0) {
                            discoveryFilter.push(`tags:[${transformToCommaString(ctx.args.tag, 'slug')}]`);
                        }

                        if (ctx.args.author && ctx.args.author.length > 0) {
                            discoveryFilter.push(`author:[${transformToCommaString(ctx.args.author, 'slug')}]`);
                        }

                        discoveryFilter.push('tags:-[hash-imagesuploaded]');

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
                    }

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
                        task: async (ctx, task) => { // eslint-disable-line no-shadow
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

                            // Regex scan for URLs in raw content (catches links in <a> tags, etc.)
                            const srcTerminationSymbols = `("|\\\\)|'|(?=(?:,https?))| |<|\\\\\\\\|&quot;|$)`;
                            const rawContent = (post.lexical || '') + (post.mobiledoc || '');
                            if (rawContent && ctx.args.assetDomains && ctx.args.assetDomains.length > 0) {
                                for (const domain of ctx.args.assetDomains) {
                                    const regex = new RegExp(`(https?:\\/\\/${domain.replace(/\./g, '\\.')}.*?)(${srcTerminationSymbols}`, 'igm');
                                    for (const match of rawContent.matchAll(regex)) {
                                        mediaUrls.push(match[1]);
                                    }
                                }
                            }

                            // Deduplicate, filter out media already on the Ghost site,
                            // and filter by asset domain if specified
                            mediaUrls = [...new Set(mediaUrls)].filter((url) => {
                                // Skip malformed URLs (e.g. concatenated URLs like "https://site.comhttps://other.com/...")
                                try {
                                    const parsed = new URL(url);
                                    if (parsed.hostname.includes('http') || (url.match(/https?:\/\//g) || []).length > 1) {
                                        return false;
                                    }
                                } catch (e) {
                                    return false;
                                }

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

                                if (ctx.args.verbose) {
                                    task.output = mediaUrls.join('\n');
                                }
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
                                ctx.errors.push(`Failed to upload ${mediaUrl} (${filePath}): ${reason}`);
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
                                let currentPost = await ctx.api[apiType].read({id: post.id}, {include: 'tags', formats: 'mobiledoc,lexical'});

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
                                        let lexicalStr = JSON.stringify(updatedLexical);

                                        // Raw string replacement for URLs not in known card types (e.g. link nodes)
                                        for (const [oldUrl, newUrl] of ctx.urlMap) {
                                            lexicalStr = lexicalStr.replaceAll(oldUrl, newUrl);
                                        }

                                        updatePayload.lexical = lexicalStr;
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
                                        let mobiledocStr = JSON.stringify(updatedMobiledoc);

                                        // Raw string replacement for URLs not in known card types (e.g. link markups)
                                        for (const [oldUrl, newUrl] of ctx.urlMap) {
                                            mobiledocStr = mobiledocStr.replaceAll(oldUrl, newUrl);
                                        }

                                        updatePayload.mobiledoc = mobiledocStr;
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
                                    title: post.title,
                                    url: post.url
                                };
                                ctx.errors.push(`Failed to update post "${post.title}" (${post.url}): ${error.message}`);
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
