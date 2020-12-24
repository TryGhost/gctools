const batchGhostDiscover = require('./batch-ghost-discover');

module.exports = {
    getAPIAuthors: async () => {
        const url = process.env.GC_TOOLS_apiURL;
        const key = process.env.GC_TOOLS_adminAPIKey;

        let apiUsers = await batchGhostDiscover({
            type: 'users',
            url: url,
            key: key
        });

        let users = [];

        apiUsers.forEach(function (author){
            users.push({
                name: `${author.name} (${author.count.posts} posts)`,
                value: author.slug
            });
        });

        return users;
    },
    getAPITags: async (additionalOpts) => {
        const url = process.env.GC_TOOLS_apiURL;
        const key = process.env.GC_TOOLS_adminAPIKey;

        let apiTags = await batchGhostDiscover({
            type: 'tags',
            url: url,
            key: key
        });

        let tags = [];

        apiTags.forEach(function (tag){
            tags.push({
                name: `${tag.name} (${tag.count.posts} posts)`,
                value: tag.slug
            });
        });

        if (additionalOpts) {
            tags.push(...additionalOpts);
        }

        return tags;
    }
};
