import errors from '@tryghost/errors';
import {getResources, editResources, deleteResources} from './batch-ops.js';
import {getSlugFromObject} from './utils.js';

const createPostsFilter = (args) => {
    let discoveryFilter = [];

    if (args.visibility && !Array.isArray(args.visibility)) {
        throw new errors.IncorrectUsageError({message: `visibility should be supplied as an array`});
    }

    if (args.tag && !Array.isArray(args.tag)) {
        throw new errors.IncorrectUsageError({message: `tag should be supplied as an array`});
    }

    if (args.author && !Array.isArray(args.author)) {
        throw new errors.IncorrectUsageError({message: `author should be supplied as an array`});
    }

    if (args.visibility && args.visibility.length > 0) {
        args.visibility.forEach((item) => {
            discoveryFilter.push(`visibility:${item.trim()}`);
        });
    }

    if (args.tag && args.tag.length > 0) {
        args.tag.forEach((item) => {
            discoveryFilter.push(`tag:${getSlugFromObject(item)}`);
        });
    }

    if (args.author && args.author.length > 0) {
        args.author.forEach((item) => {
            discoveryFilter.push(`author:${getSlugFromObject(item)}`);
        });
    }

    const filterString = discoveryFilter.join('+'); // Combine filters, so it's posts by author AND tag, not posts by author OR tag

    return filterString;
};

const getPostsCount = async (args) => {
    args.info = true;
    args.fields = 'id';
    args.limit = 1;

    const request = await getPosts(args);

    return request.meta.pagination.total;
};

const getPosts = async (args) => {
    const options = {
        api: args.api,
        type: args.type || 'posts',
        fields: args.fields || 'id,name,title,slug,url,status,visibility,updated_at',
        limit: args.limit || 50,
        filter: args.filter || null,
        info: args.info || false,
        verbose: args.verbose || false
    };

    const thePosts = await getResources(options);

    return thePosts;
};

const editPosts = async (args) => {
    const options = {
        api: args.api,
        type: args.type || 'posts',
        verbose: args.verbose || false,
        items: args.items || []
    };

    const updatedPosts = await editResources(options);

    return updatedPosts;
};

const deletePosts = async (args) => {
    const options = {
        api: args.api,
        type: args.type || 'posts',
        verbose: args.verbose || false,
        items: args.items || []
    };

    const deletedPosts = await deleteResources(options);

    return deletedPosts;
};

export {
    createPostsFilter,
    getPostsCount,
    getPosts,
    editPosts,
    deletePosts
};
