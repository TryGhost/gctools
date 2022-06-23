import GhostAdminAPI from '@tryghost/admin-api';
import _ from 'lodash';
import {ui} from '@tryghost/pretty-cli';
import makeTaskRunner from './task-runner.js';

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

const getResources = async (args) => {
    const type = args.type || 'posts';
    const info = args.info;
    const verbose = args.verbose;

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
    const totalPages = getDiscoverStats.meta.pagination.pages;

    // If we only need the number of items, return here
    if (info) {
        return getDiscoverStats;
    }

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
        concurrent: 3,
        maxFullTasks: 3,
        verbose: verbose
    });

    await taskRunner.run();

    return results;
};

const editResources = async (args) => {
    const type = args.type || 'posts';
    const items = args.items || [];
    const verbose = args.verbose;

    let api = null;

    if (args.api) {
        api = args.api;
    } else {
        api = new GhostAdminAPI({
            url: args.url,
            key: args.key,
            version: 'v5.0'
        });
    }

    ui.log.info(`Updating ${items.length} ${type} items`);

    let tasks = [];
    let updatedItems = [];

    items.forEach((item) => {
        tasks.push({
            title: `${item.title}`,
            task: async () => {
                try {
                    let result = await api[type].edit(item);
                    updatedItems.push(result);
                    return result;
                } catch (error) {
                    error.resource = {
                        title: item.title
                    };
                    throw error;
                }
            }
        });
    });

    const doPostChange = makeTaskRunner(tasks, {
        concurrent: 3,
        maxFullTasks: 3,
        verbose: verbose
    });

    // Do the changes
    await doPostChange.run();

    return updatedItems;
};

const addResources = async (args) => {
    const type = args.type || 'posts';
    const items = args.items || [];
    const verbose = args.verbose;

    let api = null;

    if (args.api) {
        api = args.api;
    } else {
        api = new GhostAdminAPI({
            url: args.url,
            key: args.key,
            version: 'v5.0'
        });
    }

    ui.log.info(`Creating ${items.length} ${type} items`);

    let tasks = [];
    let addedItems = [];

    items.forEach((item) => {
        let options = {};

        // If the item has a `html` value, tell the API client to acceot HTML as a source
        if (item.html) {
            options.source = 'html';
        }

        tasks.push({
            title: `${item.title}`,
            task: async () => {
                try {
                    let result = await api[type].add(item, options);
                    addedItems.push(result);
                    return result;
                } catch (error) {
                    error.resource = {
                        title: item.title
                    };
                    throw error;
                }
            }
        });
    });

    const doPostChange = makeTaskRunner(tasks, {
        concurrent: 3,
        maxFullTasks: 3,
        verbose: verbose
    });

    // Do the changes
    await doPostChange.run();

    return addedItems;
};

const deleteResources = async (args) => {
    const type = args.type || 'posts';
    const items = args.items || [];
    const verbose = args.verbose;

    let api = null;

    if (args.api) {
        api = args.api;
    } else {
        api = new GhostAdminAPI({
            url: args.url,
            key: args.key,
            version: 'v5.0'
        });
    }

    ui.log.info(`Deleting ${items.length} ${type} items`);

    let tasks = [];
    let deletedItems = [];

    items.forEach((item) => {
        tasks.push({
            title: `${item.title}`,
            task: async () => {
                try {
                    let result = await api[type].delete(item);
                    deletedItems.push(result);
                    return result;
                } catch (error) {
                    error.resource = {
                        title: item.title
                    };
                    throw error;
                }
            }
        });
    });

    const doPostChange = makeTaskRunner(tasks, {
        concurrent: 3,
        maxFullTasks: 3,
        verbose: verbose
    });

    // Do the changes
    await doPostChange.run();

    return deletedItems;
};

export {
    requestOptions,
    getResources,
    editResources,
    addResources,
    deleteResources
};
