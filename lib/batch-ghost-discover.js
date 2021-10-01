const GhostAdminAPI = require('@tryghost/admin-api');

module.exports = async function (args) {
    let resourceType = args.type;
    let api = null;

    if (args.api) {
        api = args.api;
    } else {
        const url = args.url;
        const key = args.key;
        api = new GhostAdminAPI({
            url,
            key,
            version: 'v4'
        });
    }

    let response = null;
    let page = 0;
    let results = [];

    do {
        response = await api[resourceType].browse({
            limit: 15,
            page: page,
            include: 'count.posts',
            order: 'name ASC'
        });
        results = results.concat(response);
        page = response.meta.pagination.next;
    } while (response.meta.pagination.next);

    return results;
};
