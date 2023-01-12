import GhostAdminAPI from '@tryghost/admin-api';
import cliProgress from 'cli-progress';

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
    } else if (type === 'members') {
        options.limit = 100;
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
    let {type} = args;
    let api = null;
    const showProgress = args?.progress ?? false;
    const infoOnly = args?.info ?? false;

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

    let response = null;
    let results = [];

    let progressBar;

    if (infoOnly) {
        let infoResponse = await api[type].browse(options);
        return infoResponse?.meta?.pagination?.total;
    }

    if (showProgress) {
        progressBar = new cliProgress.SingleBar({
            format: `Fetching ${type} {bar} | {percentage}% | {value}/{total} | ETA: {eta_formatted}`,
            barCompleteChar: '\u2588',
            barIncompleteChar: '\u2591',
            clearOnComplete: true,
            hideCursor: true
        });

        let testResponse = await api[type].browse(options);

        progressBar.start(testResponse.meta.pagination.total, 0);
    }

    do {
        response = await api[type].browse(options);
        results = results.concat(response);
        options.page = response.meta.pagination.next;

        if (showProgress) {
            progressBar.update(results.length);
        }
    } while (response.meta.pagination.next);

    if (showProgress) {
        progressBar.stop();
    }

    return results;
};

const discoverInfo = async (args) => {
    args = Object.assign({
        info: true,
        progress: false,
        limit: 1
    }, args);

    return discover(args);
};

export {
    requestOptions,
    discover,
    discoverInfo
};
