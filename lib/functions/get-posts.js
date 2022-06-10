import {discover} from '../batch-ghost-discover.js';
import {maybeArrayToString} from '../utils.js';

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

    const request = await getPosts(args);

    return request.meta.pagination.total;
};

const getPosts = async (args) => {
    const options = {
        api: args.api,
        type: args.type || 'posts',
        fields: args.fields || 'id,name,title,slug,url,status,visibility,updated_at',
        limit: args.limit || 50,
        filter: args.filter || createPostsFilter(args),
        info: args.info || false
    };

    const thePosts = await discover(options);

    return thePosts;
};

export {
    createPostsFilter,
    getPostsCount,
    getPosts
}
