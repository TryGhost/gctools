import GhostAdminAPI from '@tryghost/admin-api';

const requestOptions = (args = {}) => {
    let type = args.type || 'posts';

    // Default request options
    let options = {
        page: 0,
        limit: 15
    };

    // Set the request options per resource type
    if (type === 'tags') {
        options.limit = 50;
        options.include = 'count.posts';
    } else if (type === 'users') {
        options.limit = 50;
        options.include = 'count.posts,roles';
    }

    // If an 'include' is defined, use that
    if (args.include) {
        options.include = args.include;
    }

    // If a 'filter' is defined, use that
    if (args.filter) {
        options.filter = args.filter;
    }

    // If 'fields' are defined, use that
    if (args.fields) {
        options.fields = args.fields;
    }

    // If a 'limit' is defined, use that
    if (args.limit) {
        options.limit = parseInt(args.limit);
    }

    // By default, the API will return Mobiledoc. If that needs to change, use that here
    if (args.formats) {
        options.formats = args.formats;
    }

    // If a 'order' is defined, use that
    if (args.order) {
        options.order = args.order;
    }

    return options;
};

const discover = async (args) => {
    let {type, info} = args;
    let api = null;

    let options = requestOptions(args);

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

    if (info) {
        options.limit = 1;
        options.fields = 'id';

        return await api[type].browse(options);
    } else {
        let response = null;
        let results = [];

        do {
            response = await api[type].browse(options);
            results = results.concat(response);
            options.page = response.meta.pagination.next;
        } while (response.meta.pagination.next);

        return results;
    }
};

export {
    requestOptions,
    discover
};
