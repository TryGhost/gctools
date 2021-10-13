const GhostAdminAPI = require('@tryghost/admin-api');

module.exports = async function (args) {
    let {type} = args;
    let api = null;

    // Default request options
    let requestOptions = {
        page: 0,
        limit: 15
    };

    // Set the request options per resource type
    if (type === 'tags') {
        requestOptions.limit = 50;
        requestOptions.include = 'count.posts';
    } else if (type === 'users') {
        requestOptions.limit = 50;
        requestOptions.include = 'count.posts';
    }

    if (args.filter) {
        requestOptions.filter = args.filter;
    }

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
    let results = [];

    do {
        response = await api[type].browse(requestOptions);
        results = results.concat(response);
        requestOptions.page = response.meta.pagination.next;
    } while (response.meta.pagination.next);

    return results;
};
