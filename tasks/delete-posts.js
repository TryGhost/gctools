const GhostAdminAPI = require('@tryghost/admin-api');

module.exports = async function deletePosts({url, key}) {
    const api = new GhostAdminAPI({
        url,
        key
    });

    const posts = await api.posts.browse({limit: 'all'});
    for (const post of posts) {
        await api.posts.delete({id: post.id});
    }
};
