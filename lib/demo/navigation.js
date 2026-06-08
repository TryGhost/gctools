import errors from '@tryghost/errors';
import {apiAuthTokenHeaders} from '../admin-api-call.js';

const SETTINGS_TIMEOUT = 30000;

// Error code used to signal that navigation could not be written because the
// supplied key is an integration token. Integration tokens only have GET access
// to /settings/; writing settings (navigation) requires a staff access token
// (owner/admin), which is the same {id}:{secret} format and is used identically.
const NAV_NO_PERMISSION = 'NAV_NO_PERMISSION';

// The Ghost Admin API client (`@tryghost/admin-api`) does not expose the
// settings resource, so we talk to /settings/ directly. A staff access token
// authenticates as its user and inherits that user's role permissions, so an
// owner/admin token can write navigation. An integration token cannot and
// returns 403 NoPermissionError, which we translate to NAV_NO_PERMISSION.

const baseUrl = options => options.apiURL.replace(/\/$/, '');
const settingsUrl = options => `${baseUrl(options)}/ghost/api/admin/settings/`;

// Read all site settings into a {key: value} map (empty object on failure).
// GET is permitted for integration tokens.
const readSettings = async ({options}) => {
    try {
        const headers = apiAuthTokenHeaders(options);
        const response = await fetch(settingsUrl(options), {
            headers,
            signal: AbortSignal.timeout(SETTINGS_TIMEOUT)
        });
        if (!response.ok) {
            return {};
        }
        const data = await response.json();
        const map = {};
        (data.settings || []).forEach((s) => {
            map[s.key] = s.value;
        });
        return map;
    } catch (error) {
        return {};
    }
};

// Read the current primary navigation menu. Returns an array of
// {label, url} items (empty array on any failure). GET is permitted for
// integration tokens.
const readNavigation = async ({options}) => {
    try {
        const settings = await readSettings({options});
        const value = settings.navigation;
        if (value === undefined) {
            return [];
        }
        return typeof value === 'string' ? JSON.parse(value) : (value || []);
    } catch (error) {
        return [];
    }
};

// Normalise a nav URL for de-duplication so `/about` and `/about/` are treated
// as the same managed link. The root `/` is preserved as-is.
const normalizeNavUrl = (url) => {
    if (!url) {
        return url;
    }
    return url === '/' ? '/' : url.replace(/\/+$/, '');
};

// Build the desired menu in the canonical order:
//   Home, About, Style Guide, Author, Collection
// Only enabled parts are included. Any pre-existing custom items we don't
// manage are preserved at the end, de-duplicated by URL/label.
const buildDesiredNavigation = ({current = [], parts = {}}) => {
    const desired = [{label: 'Home', url: '/'}];

    if (parts.about) {
        desired.push({label: 'About', url: '/about/'});
    }
    if (parts.styleGuide) {
        desired.push({label: 'Style Guide', url: `/${parts.styleGuide.slug}/`});
    }
    if (parts.author) {
        desired.push({label: 'Author', url: `/author/${parts.author.slug}/`});
    }
    if (parts.collection) {
        desired.push({label: 'Collection', url: `/tag/${parts.collection.tag}/`});
    }

    const managedUrls = new Set(desired.map(item => normalizeNavUrl(item.url)));
    const managedLabels = new Set(desired.map(item => item.label.toLowerCase()));

    current.forEach((item) => {
        if (!item || !item.url) {
            return;
        }
        if (managedUrls.has(normalizeNavUrl(item.url)) || managedLabels.has((item.label || '').toLowerCase())) {
            return;
        }
        desired.push({label: item.label, url: item.url});
    });

    return desired;
};

// Persist a navigation menu using the supplied Admin API key. The key is signed
// into a JWT exactly as for any other request, so a staff access token writes
// successfully while an integration token returns 403 — translated to a
// NoPermissionError with the NAV_NO_PERMISSION code so callers can fall back.
const writeNavigation = async ({options, navigation}) => {
    const headers = {
        ...apiAuthTokenHeaders(options),
        'Content-Type': 'application/json'
    };
    const body = {
        settings: [
            {key: 'navigation', value: JSON.stringify(navigation)}
        ]
    };

    const response = await fetch(settingsUrl(options), {
        method: 'PUT',
        headers,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(SETTINGS_TIMEOUT)
    });

    if (!response.ok) {
        if (response.status === 403) {
            throw new errors.NoPermissionError({
                message: 'This Admin API key cannot write navigation. Use a staff access token (owner/admin) to update settings.',
                code: NAV_NO_PERMISSION
            });
        }
        throw new errors.InternalServerError({
            message: `Failed to write navigation (${response.status})`
        });
    }

    return response.json();
};

export {
    NAV_NO_PERMISSION,
    readSettings,
    readNavigation,
    buildDesiredNavigation,
    writeNavigation
};
