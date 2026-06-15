import jwt from 'jsonwebtoken';
import axios from 'axios';

const apiAuthTokenHeaders = (options) => {
    const key = options.adminAPIKey;
    const [id, secret] = key.split(':');

    const token = jwt.sign({}, Buffer.from(secret, 'hex'), {
        keyid: id,
        algorithm: 'HS256',
        expiresIn: '5m',
        audience: `/admin/`
    });

    const headers = {Authorization: `Ghost ${token}`};

    return headers;
};

const getTiers = async (options) => {
    const headers = apiAuthTokenHeaders(options);

    let urlString = `${options.apiURL}/ghost/api/admin/tiers/?limit=100`;

    let response = null;
    let results = [];
    let pageNumber = 1;

    do {
        // Set the page number of the request
        let urlPageChange = new URL(urlString);
        urlPageChange.searchParams.set('page', pageNumber); // `set` adds or updates
        urlString = urlPageChange.href;

        try {
            response = await axios.get(urlString, {headers});
            results = results.concat(response.data.tiers);
            pageNumber = response.data.meta.pagination.next;
        } catch (error) {
            return [];
        }
    } while (response.data.meta.pagination.next);

    return results;
};

const getMemberLabels = async (options) => {
    const headers = apiAuthTokenHeaders(options);
    let urlString = `${options.apiURL}/ghost/api/admin/labels/?limit=50`;

    let response = null;
    let results = [];
    let pageNumber = 1;

    do {
        // Set the page number of the request
        let urlPageChange = new URL(urlString);
        urlPageChange.searchParams.set('page', pageNumber); // `set` adds or updates
        urlString = urlPageChange.href;

        try {
            response = await axios.get(urlString, {headers});
            results = results.concat(response.data.labels);
            pageNumber = response.data.meta.pagination.next;
        } catch (error) {
            return [];
        }
    } while (response.data.meta.pagination.next);

    return results;
};

const getRoles = async (options) => {
    const headers = apiAuthTokenHeaders(options);
    let urlString = `${options.apiURL}/ghost/api/admin/roles/?limit=all`;

    try {
        let response = await axios.get(urlString, {headers});
        return response.data.roles;
    } catch (error) {
        return [];
    }
};

const getComments = async (options) => {
    const headers = apiAuthTokenHeaders(options);
    let urlString = `${options.apiURL}/ghost/api/admin/comments/?limit=50&order=created_at%20asc`;

    if (options.filter) {
        let urlObj = new URL(urlString);
        urlObj.searchParams.set('filter', options.filter);
        urlString = urlObj.href;
    }

    let response = null;
    let results = [];
    let pageNumber = 1;

    do {
        let urlPageChange = new URL(urlString);
        urlPageChange.searchParams.set('page', pageNumber);
        urlString = urlPageChange.href;

        response = await axios.get(urlString, {headers});
        results = results.concat(response.data.comments);
        pageNumber = response.data.meta.pagination.next;
    } while (response.data.meta.pagination.next);

    return results;
};

const getPublicCommentsForPost = async (options, postId) => {
    let urlString = `${options.apiURL}/members/api/comments/?limit=50&order=created_at%20asc`;
    let urlObj = new URL(urlString);
    urlObj.searchParams.set('filter', `post_id:${postId}`);
    urlString = urlObj.href;

    let response = null;
    let results = [];
    let pageNumber = 1;

    do {
        let urlPageChange = new URL(urlString);
        urlPageChange.searchParams.set('page', pageNumber);
        urlString = urlPageChange.href;

        response = await axios.get(urlString);
        results = results.concat(response.data.comments);
        pageNumber = response.data.meta.pagination.next;
    } while (response.data.meta.pagination.next);

    return results;
};

const getMembersByIds = async (options, memberIds) => {
    if (memberIds.length === 0) {
        return [];
    }

    const headers = apiAuthTokenHeaders(options);
    let allMembers = [];
    const batchSize = 50;

    for (let i = 0; i < memberIds.length; i += batchSize) {
        const batch = memberIds.slice(i, i + batchSize);
        const filter = `id:[${batch.join(',')}]`;
        let urlString = `${options.apiURL}/ghost/api/admin/members/?limit=${batchSize}`;
        let urlObj = new URL(urlString);
        urlObj.searchParams.set('filter', filter);

        try {
            const response = await axios.get(urlObj.href, {headers});
            allMembers = allMembers.concat(response.data.members);
        } catch (error) {
            // Continue with remaining batches
        }
    }

    return allMembers;
};

export {
    apiAuthTokenHeaders,
    getTiers,
    getMemberLabels,
    getRoles,
    getComments,
    getPublicCommentsForPost,
    getMembersByIds
};
