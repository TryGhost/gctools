import {getResources, editResources, deleteResources} from './batch-ops.js';
import {maybeArrayToString} from './utils.js';

const createPostsFilter = (args) => {
    let discoveryFilter = [];

    if (args.visibility && args.visibility.length > 0) {
        discoveryFilter.push(`visibility:[${maybeArrayToString(args.visibility)}]`);
    }

    if (args.tag && args.tag.length > 0) {
        discoveryFilter.push(`tags:[${maybeArrayToString(args.tag, 'slug')}]`);
    }

    if (args.author && args.author.length > 0) {
        discoveryFilter.push(`author:[${maybeArrayToString(args.author, 'slug')}]`);
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
