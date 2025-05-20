import GhostAdminAPI from '@tryghost/admin-api';
import {makeTaskRunner} from '@tryghost/listr-smart-renderer';
import _ from 'lodash';
import {discover} from '../lib/batch-ghost-discover.js';

const initialise = (options) => {
    return {
        title: 'Initialising API connection',
        task: (ctx, task) => {
            let defaults = {
                verbose: false,
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
            ctx.processed = 0;
            ctx.updated = 0;
            ctx.errors = [];

            task.output = 'API connection initialised';
        }
    };
};

/**
 * Extracts the first image URL from HTML content
 * @param {string} html - The HTML content to search in
 * @returns {string|null} The first image URL found, or null if no image is found
 */
const extractFirstImage = (html) => {
    // Regex pattern explanation:
    // <img - matches the opening img tag
    // [^>]+ - matches one or more characters that are not '>'
    // src=" - matches the src attribute opening
    // ([^">]+) - captures one or more characters that are not '"' or '>' (the URL)
    // " - matches the closing quote
    const imgRegex = /<img[^>]+src="([^">]+)"/;
    const match = html.match(imgRegex);
    
    // match[0] would contain the full match (e.g., '<img src="https://example.com/image.jpg">')
    // match[1] contains just the URL from the capturing group (e.g., 'https://example.com/image.jpg')
    return match ? match[1] : null;
};

/**
 * Extracts the first image URL from Lexical content
 * @param {Object} lexical - The Lexical content object
 * @returns {string|null} The first image URL found, or null if no image is found
 */
const extractFirstImageFromLexical = (lexical) => {
    try {
        const content = JSON.parse(lexical);
        // Lexical stores images in the root array with type 'image'
        const imageNode = content.root.children.find(node => node.type === 'image');
        return imageNode ? imageNode.src : null;
    } catch (error) {
        return null;
    }
};

/**
 * Extracts the first image URL from Mobiledoc content
 * @param {string} mobiledoc - The Mobiledoc content
 * @returns {string|null} The first image URL found, or null if no image is found
 */
const extractFirstImageFromMobiledoc = (mobiledoc) => {
    try {
        const content = JSON.parse(mobiledoc);
        // Mobiledoc stores images in the cards array
        const imageCard = content.cards.find(card => card[0] === 'image');
        return imageCard ? imageCard[1].src : null;
    } catch (error) {
        return null;
    }
};

const getFullTaskList = (options) => {
    return [
        initialise(options),
        {
            title: 'Fetching posts without featured images',
            task: async (ctx, task) => {
                let postDiscoveryOptions = {
                    api: ctx.api,
                    type: 'posts',
                    limit: 100,
                    include: 'tags,authors',
                    filter: 'feature_image:null',
                    progress: (options.verbose) ? true : false
                };

                try {
                    ctx.posts = await discover(postDiscoveryOptions);
                    task.output = `Found ${ctx.posts.length} posts without featured images`;
                } catch (error) {
                    ctx.errors.push(error);
                    throw error;
                }
            }
        },
        {
            title: 'Processing posts and setting featured images',
            task: async (ctx, task) => {
                for (const post of ctx.posts) {
                    try {
                        if (options.verbose) {
                            task.output = `Processing post "${post.title}"`;
                        }
                        
                        let firstImage = null;
                        
                        // Try Lexical first
                        if (post.lexical) {
                            firstImage = extractFirstImageFromLexical(post.lexical);
                            if (options.verbose && firstImage) {
                                task.output = `Found image in Lexical content: ${firstImage}`;
                            }
                        }
                        
                        // If no image found in Lexical, try Mobiledoc
                        if (!firstImage && post.mobiledoc) {
                            firstImage = extractFirstImageFromMobiledoc(post.mobiledoc);
                            if (options.verbose && firstImage) {
                                task.output = `Found image in Mobiledoc content: ${firstImage}`;
                            }
                        }
                        
                        // If still no image, try HTML as fallback
                        if (!firstImage && post.html) {
                            firstImage = extractFirstImage(post.html);
                            if (options.verbose && firstImage) {
                                task.output = `Found image in HTML content: ${firstImage}`;
                            }
                        }
                        
                        if (firstImage) {
                            if (options.verbose) {
                                task.output = `Updating post "${post.title}" with image: ${firstImage}`;
                            }
                            
                            await ctx.api.posts.edit({
                                id: post.id,
                                feature_image: firstImage,
                                title: post.title,
                                status: post.status,
                                updated_at: post.updated_at,
                                tags: [...(post.tags || []), {name: '#feature-image-set'}]
                            });
                            ctx.updated = ctx.updated + 1;
                            
                            if (options.verbose) {
                                task.output = `Successfully updated post "${post.title}" with image: ${firstImage}`;
                            }
                        } else if (options.verbose) {
                            task.output = `No image found in post "${post.title}"`;
                        }
                        
                        ctx.processed = ctx.processed + 1;
                        
                        // Add delay between API calls
                        if (ctx.args.delayBetweenCalls > 0) {
                            await new Promise((resolve) => {
                                setTimeout(resolve, ctx.args.delayBetweenCalls);
                            });
                        }
                    } catch (error) {
                        ctx.errors.push(`Error processing post "${post.title}": ${error.message}`);
                        if (options.verbose) {
                            task.output = `Error processing post "${post.title}": ${error.message}`;
                        }
                    }
                }
                
                task.output = `Processed ${ctx.processed} posts, updated ${ctx.updated} with featured images`;
            }
        }
    ];
};

const getTaskRunner = (options) => {
    let tasks = [];
    tasks = getFullTaskList(options);
    return makeTaskRunner(tasks, Object.assign({topLevel: true}, options));
};

export {
    extractFirstImage,
    extractFirstImageFromLexical,
    extractFirstImageFromMobiledoc
};

export default {
    initialise,
    getFullTaskList,
    getTaskRunner
}; 