import {writeFileSync} from 'node:fs';
import {join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import GhostAdminAPI from '@tryghost/admin-api';
import {makeTaskRunner} from '@tryghost/listr-smart-renderer';
import _ from 'lodash';
import {getComments, getPublicCommentsForPost, getMembersByIds} from '../lib/admin-api-call.js';
import {discover} from '../lib/batch-ghost-discover.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const escapeCSVField = (value) => {
    const str = String(value ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
};

const jsonToCSV = (data) => {
    if (data.length === 0) {
        return '';
    }
    const headers = Object.keys(data[0]);
    const lines = [headers.join(',')];
    for (const row of data) {
        lines.push(headers.map(h => escapeCSVField(row[h])).join(','));
    }
    return lines.join('\n');
};

const extractSlugFromUrl = (url) => {
    if (!url) {
        return '';
    }
    const parts = url.replace(/\/$/, '').split('/');
    return parts[parts.length - 1] || '';
};

const flattenComments = (comments, post) => {
    let flat = [];

    for (const comment of comments) {
        const {replies, ...rest} = comment;
        rest._post = post;
        flat.push(rest);

        if (replies && replies.length > 0) {
            for (const reply of replies) {
                reply.parent_id = comment.id;
                reply._post = post;
                flat.push(reply);
            }
        }
    }

    return flat;
};

const initialise = (options) => {
    return {
        title: 'Initialising API connection',
        task: (ctx, task) => {
            let defaults = {
                verbose: false,
                status: 'published',
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
            ctx.args.apiURL = url;
            ctx.api = api;
            ctx.comments = [];
            ctx.found = [];

            task.output = `Initialised for ${options.apiURL}`;
        }
    };
};

const getFullTaskList = (options) => {
    return [
        initialise(options),
        {
            title: 'Fetching comments from Ghost API',
            task: async (ctx, task) => {
                let fetchOptions = {
                    apiURL: ctx.args.apiURL,
                    adminAPIKey: ctx.args.adminAPIKey
                };

                if (ctx.args.status && ctx.args.status !== 'all') {
                    fetchOptions.filter = `status:${ctx.args.status}`;
                }

                // Try the site-wide Admin API endpoint first (newer Ghost versions)
                try {
                    ctx.comments = await getComments(fetchOptions);
                    task.output = `Found ${ctx.comments.length} comments`;
                    return;
                } catch (error) {
                    task.output = 'Site-wide endpoint unavailable, using Members API fallback...';
                }

                // Fallback: Members API public endpoint per post
                let posts = await discover({
                    api: ctx.api,
                    type: 'posts',
                    limit: 100,
                    fields: 'id,title,slug,url',
                    progress: ctx.args.verbose
                });

                task.output = `Found ${posts.length} posts, fetching comments for each...`;

                let allComments = [];

                for (const post of posts) {
                    try {
                        let postComments = await getPublicCommentsForPost(fetchOptions, post.id);
                        if (postComments.length > 0) {
                            allComments = allComments.concat(flattenComments(postComments, post));
                        }
                    } catch (error) {
                        // Skip posts where comments can't be fetched
                    }
                }

                // The public Members API doesn't include member emails,
                // so look them up via the Admin API
                let memberIds = [...new Set(
                    allComments
                        .map(c => c.member?.id)
                        .filter(Boolean)
                )];

                if (memberIds.length > 0) {
                    task.output = `Fetching email addresses for ${memberIds.length} members...`;
                    let members = await getMembersByIds(fetchOptions, memberIds);
                    let emailMap = new Map(members.map(m => [m.id, m.email]));

                    for (const comment of allComments) {
                        if (comment.member?.id && emailMap.has(comment.member.id)) {
                            comment.member.email = emailMap.get(comment.member.id);
                        }
                    }
                }

                ctx.comments = allComments;
                task.output = `Found ${ctx.comments.length} comments across ${posts.length} posts`;
            }
        },
        {
            title: 'Saving as CSV file',
            task: async (ctx, task) => {
                if (ctx.comments.length === 0) {
                    task.output = 'No comments found, skipping CSV export';
                    ctx.found = [];
                    return;
                }

                let csvData = ctx.comments.map((comment) => {
                    const post = comment.post || comment._post || {};
                    const postUrl = post.url || '';
                    const postSlug = post.slug || extractSlugFromUrl(postUrl);

                    return {
                        id: comment.id,
                        name: comment.member?.name || '',
                        email: comment.member?.email || '',
                        created_at: comment.created_at,
                        html: comment.html || '',
                        reply_to: comment.parent_id || '',
                        post_id: post.id || comment.post_id || '',
                        post_title: post.title || '',
                        post_slug: postSlug,
                        post_url: postUrl
                    };
                });

                let csv = jsonToCSV(csvData);
                let fileName = `comments-export-${Date.now()}.csv`;
                let outputPath = join(__dirname, '..', fileName);
                writeFileSync(outputPath, csv);
                ctx.outputPath = outputPath;
                ctx.found = csvData;

                task.output = `Exported ${csvData.length} comments to ${fileName}`;
            }
        }
    ];
};

const getTaskRunner = (options) => {
    let tasks = getFullTaskList(options);
    return makeTaskRunner(tasks, Object.assign({topLevel: true}, options));
};

export default {
    initialise,
    getFullTaskList,
    getTaskRunner
};
