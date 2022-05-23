const GhostAdminAPI = require('@tryghost/admin-api');
const _ = require('lodash');
const ui = require('@tryghost/pretty-cli').ui;
const makeTaskRunner = require('./task-runner');

const requestOptions = (args = {}) => {
    let type = args.type || 'posts';

    // Default request options
    let options = {
        page: 0,
        limit: 15
    };

    // Set the request options per resource type
    if (type === 'tags') {
        options.limit = 100;
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
    let type = args.type;
    let api = null;

    let options = requestOptions(args);

    if (args.api) {
        api = args.api;
    } else {
        api = new GhostAdminAPI({
            url: args.url,
            key: args.key,
            version: 'v5.0'
        });
    }

    // Find out how many items there are to get, so we can build a task list to grab them all
    const getDiscoverStats = await api[type].browse(options);
    const totalItems = getDiscoverStats.meta.pagination.total;
    let totalPages = getDiscoverStats.meta.pagination.pages;

    // if (totalPages > 3) {
    //     totalPages = 3;
    // }

    ui.log.info(`Found ${totalItems} ${type} items, spanning ${totalPages} pages`);

    let results = [];
    let tasks = [];

    _.forEach(_.range(totalPages), (page) => {
        const nonZeroIndexPageNum = (page + 1);
        tasks.push({
            title: `Fetching ${type} page ${nonZeroIndexPageNum} of ${getDiscoverStats.meta.pagination.pages}`,
            task: async () => {
                let thisOptions = options;
                thisOptions.page = nonZeroIndexPageNum;
                let apiResponse = await api[type].browse(options);
                delete apiResponse.meta;
                results.push(...apiResponse);
            }
        });
    });

    const taskRunner = makeTaskRunner(tasks, {
        concurrent: 3
    });

    await taskRunner.run();

    return results;
};

module.exports.requestOptions = requestOptions;
module.exports.discover = discover;
