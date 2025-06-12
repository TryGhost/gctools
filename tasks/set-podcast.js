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
 * Extracts the first audio URL from HTML content
 * @param {string} html - The HTML content to search in
 * @returns {string|null} The first audio URL found, or null if no audio is found
 */
const extractFirstAudio = (html) => {
    // Look for audio tags first
    const audioRegex = /<audio[^>]+src="([^">]+)"/;
    const audioMatch = html.match(audioRegex);
    if (audioMatch) {
        return audioMatch[1];
    }
    
    // Look for audio cards (common pattern in Ghost)
    const audioCardRegex = /<div[^>]*class="[^"]*audio[^"]*"[^>]*>[\s\S]*?src="([^">]+)"/i;
    const audioCardMatch = html.match(audioCardRegex);
    if (audioCardMatch) {
        return audioCardMatch[1];
    }
    
    // Look for iframe with audio content (like SoundCloud, Spotify, etc.)
    const iframeRegex = /<iframe[^>]+src="([^">]*(?:soundcloud|spotify|anchor|buzzsprout|simplecast|libsyn)[^">]*)"/i;
    const iframeMatch = html.match(iframeRegex);
    if (iframeMatch) {
        return iframeMatch[1];
    }
    
    return null;
};

/**
 * Extracts the first audio URL from Lexical content
 * @param {string} lexical - The Lexical content
 * @returns {string|null} The first audio URL found, or null if no audio is found
 */
const extractFirstAudioFromLexical = (lexical) => {
    try {
        const content = JSON.parse(lexical);
        
        // Look for audio nodes in Lexical content
        const findAudioInNodes = (nodes) => {
            for (const node of nodes) {
                if (node.type === 'audio' && node.src) {
                    return node.src;
                }
                
                // Check for embed nodes with audio content
                if (node.type === 'embed' && node.url) {
                    if (node.url.includes('soundcloud') || 
                        node.url.includes('spotify') || 
                        node.url.includes('anchor') ||
                        node.url.includes('buzzsprout') ||
                        node.url.includes('simplecast') ||
                        node.url.includes('libsyn')) {
                        return node.url;
                    }
                }
                
                // Recursively check children
                if (node.children && Array.isArray(node.children)) {
                    const childAudio = findAudioInNodes(node.children);
                    if (childAudio) {
                        return childAudio;
                    }
                }
            }
            return null;
        };
        
        return findAudioInNodes(content.root.children);
    } catch (error) {
        return null;
    }
};

/**
 * Extracts the first audio URL from Mobiledoc content
 * @param {string} mobiledoc - The Mobiledoc content
 * @returns {string|null} The first audio URL found, or null if no audio is found
 */
const extractFirstAudioFromMobiledoc = (mobiledoc) => {
    try {
        const content = JSON.parse(mobiledoc);
        
        // Look for audio cards in Mobiledoc
        const audioCard = content.cards.find((card) => {
            return card[0] === 'audio' || 
                   card[0] === 'embed' || 
                   card[0] === 'html';
        });
        
        if (audioCard) {
            const cardData = audioCard[1];
            
            // Direct audio card
            if (audioCard[0] === 'audio' && cardData.src) {
                return cardData.src;
            }
            
            // Embed card with audio content
            if (audioCard[0] === 'embed' && cardData.url) {
                if (cardData.url.includes('soundcloud') || 
                    cardData.url.includes('spotify') || 
                    cardData.url.includes('anchor') ||
                    cardData.url.includes('buzzsprout') ||
                    cardData.url.includes('simplecast') ||
                    cardData.url.includes('libsyn')) {
                    return cardData.url;
                }
            }
            
            // HTML card with audio content
            if (audioCard[0] === 'html' && cardData.html) {
                return extractFirstAudio(cardData.html);
            }
        }
        
        return null;
    } catch (error) {
        return null;
    }
};

const getFullTaskList = (options) => {
    return [
        initialise(options),
        {
            title: 'Fetching posts with podcast tag',
            task: async (ctx, task) => {
                let postDiscoveryOptions = {
                    api: ctx.api,
                    type: 'posts',
                    limit: 100,
                    include: 'tags,authors',
                    filter: 'tag:[podcast]',
                    progress: (options.verbose) ? true : false
                };

                try {
                    ctx.posts = await discover(postDiscoveryOptions);
                    task.output = `Found ${ctx.posts.length} posts with podcast tag`;
                } catch (error) {
                    ctx.errors.push(error);
                    throw error;
                }
            }
        },
        {
            title: 'Processing posts and setting Facebook descriptions',
            task: async (ctx, task) => {
                for (const post of ctx.posts) {
                    try {
                        if (options.verbose) {
                            task.output = `Processing post "${post.title}"`;
                        }
                        
                        let firstAudio = null;
                        
                        // Try Lexical first
                        if (post.lexical) {
                            firstAudio = extractFirstAudioFromLexical(post.lexical);
                            if (options.verbose && firstAudio) {
                                task.output = `Found audio in Lexical content: ${firstAudio}`;
                            }
                        }
                        
                        // If no audio found in Lexical, try Mobiledoc
                        if (!firstAudio && post.mobiledoc) {
                            firstAudio = extractFirstAudioFromMobiledoc(post.mobiledoc);
                            if (options.verbose && firstAudio) {
                                task.output = `Found audio in Mobiledoc content: ${firstAudio}`;
                            }
                        }
                        
                        // If still no audio, try HTML as fallback
                        if (!firstAudio && post.html) {
                            firstAudio = extractFirstAudio(post.html);
                            if (options.verbose && firstAudio) {
                                task.output = `Found audio in HTML content: ${firstAudio}`;
                            }
                        }
                        
                        if (firstAudio) {
                            if (options.verbose) {
                                task.output = `Updating post "${post.title}" with Facebook description: ${firstAudio}`;
                            }
                            
                            await ctx.api.posts.edit({
                                id: post.id,
                                og_description: firstAudio,
                                title: post.title,
                                status: post.status,
                                updated_at: post.updated_at
                            });
                            ctx.updated = ctx.updated + 1;
                            
                            if (options.verbose) {
                                task.output = `Successfully updated post "${post.title}" with Facebook description: ${firstAudio}`;
                            }
                        } else if (options.verbose) {
                            task.output = `No audio found in post "${post.title}"`;
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
                
                task.output = `Processed ${ctx.processed} posts, updated ${ctx.updated} with Facebook descriptions`;
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
    extractFirstAudio,
    extractFirstAudioFromLexical,
    extractFirstAudioFromMobiledoc
};

export default {
    initialise,
    getFullTaskList,
    getTaskRunner
}; 