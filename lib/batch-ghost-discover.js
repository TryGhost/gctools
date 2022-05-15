const GhostAdminAPI = require('@tryghost/admin-api');

const discover = async (args) => {
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
        requestOptions.include = 'count.posts,roles';
    }

    // If a filter is defined, include that
    if (args.filter) {
        requestOptions.filter = args.filter;
    }

    // If fields are defined, include that
    if (args.fields) {
        requestOptions.fields = args.fields;
    }

    // If a limit is defined, include that
    if (args.limit) {
        requestOptions.limit = args.limit;
    }

    // By default, the API will return Mobiledoc. If that needs to change, include that here
    if (args.formats) {
        requestOptions.formats = args.formats;
    }

    // If a order is defined, include that
    if (args.order) {
        requestOptions.order = args.order;
    }

    if (args.api) {
        api = args.api;
    } else {
        const url = args.url;
        const key = args.key;
        api = new GhostAdminAPI({
            url,
            key,
            version: 'v5.0'
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

module.exports.discover = discover;
