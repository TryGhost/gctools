const {discover} = require('../batch-ghost-discover');
const {maybeArrayToString} = require('../utils');

const createGetPostsFilter = (args) => {
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

const getPosts = async (args) => {
    const options = {
        api: args.api,
        type: args.type || 'posts',
        fields: 'id,name,title,slug,url,status,visibility,updated_at',
        limit: 50,
        filter: args.filter || this.createGetPostsFilter(args)
    };

    const thePosts = await discover(options);

    return thePosts;
};

module.exports.createGetPostsFilter = createGetPostsFilter;
module.exports.getPosts = getPosts;
