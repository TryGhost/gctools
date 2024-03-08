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

    let urlString = `${options.apiURL}/ghost/api/admin/tiers/?filter=type%3Apaid%2Bactive%3Atrue&limit=50`;

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

export {
    getTiers,
    getMemberLabels
};
