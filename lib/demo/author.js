import crypto from 'node:crypto';
import errors from '@tryghost/errors';
import {slugify} from '@tryghost/string';
import {loremIpsum} from 'lorem-ipsum';
import {apiAuthTokenHeaders} from '../admin-api-call.js';

// Error code signalling that the dummy author could not be created because the
// supplied key is an integration token. Creating a staff user requires writing
// to /db/ (Universal Import), which only a staff access token can do — mirrors
// NAV_NO_PERMISSION in navigation.js.
const AUTHOR_NO_PERMISSION = 'AUTHOR_NO_PERMISSION';

const baseUrl = options => options.apiURL.replace(/\/$/, '');
const dbUrl = options => `${baseUrl(options)}/ghost/api/admin/db/`;

// Escape single quotes/backslashes so values are safe inside Ghost NQL filter
// strings (e.g. email:'...').
const escapeFilterValue = value => String(value ?? '').replace(/['\\]/g, '\\$&');

// Build the placeholder author. `profile_image` is required and hosted via the
// asset manager (downloaded + re-uploaded) so the author archive renders a real
// avatar; falls back to a deterministic hotlink when no asset manager is given
// (dry run).
const buildDummyAuthor = async ({assetManager, args = {}}) => {
    const name = args.authorName || 'Sam Example';
    const slug = args.authorSlug || slugify(name);
    const email = args.authorEmail || `${slug}@example.com`;
    const role = args.authorRole || 'Contributor';

    let profileImage;
    if (assetManager) {
        const img = await assetManager.getImage({key: `author-${slug}`, width: 500, height: 500});
        profileImage = img.url;
    } else {
        profileImage = `https://picsum.photos/seed/${encodeURIComponent(`author-${slug}`)}/500/500.jpg`;
    }

    return {
        id: crypto.randomBytes(12).toString('hex'),
        name,
        slug,
        email,
        role,
        bio: loremIpsum({count: 1, units: 'sentences'}),
        profile_image: profileImage
    };
};

// Look up an existing user by slug (then email) so re-runs reuse the author
// rather than importing a duplicate. Returns the user or null.
const findExistingAuthor = async ({api, slug, email}) => {
    const tryFilter = async (filter) => {
        try {
            const users = await api.users.browse({filter, limit: 1});
            return (users && users.length) ? users[0] : null;
        } catch (error) {
            return null;
        }
    };

    return (await tryFilter(`slug:'${escapeFilterValue(slug)}'`)) || (await tryFilter(`email:'${escapeFilterValue(email)}'`));
};

// Create the author via Universal Import (POST /db/) using the supplied key.
// A staff access token succeeds; an integration token returns 403, which we
// translate to AUTHOR_NO_PERMISSION so the caller can fall back gracefully.
const importAuthor = async ({options, author}) => {
    const file = {
        meta: {exported_on: Date.now(), version: '5.0.0'},
        data: {
            users: [{
                id: author.id,
                name: author.name,
                slug: author.slug,
                email: author.email,
                roles: [author.role],
                profile_image: author.profile_image,
                bio: author.bio
            }]
        }
    };

    // Native FormData/Blob: fetch sets the multipart boundary automatically, so
    // we must not set Content-Type ourselves.
    const form = new FormData();
    form.append(
        'importfile',
        new Blob([JSON.stringify(file)], {type: 'application/json'}),
        'gctools-author.json'
    );

    const response = await fetch(dbUrl(options), {
        method: 'POST',
        headers: apiAuthTokenHeaders(options),
        body: form
    });

    if (!response.ok) {
        if (response.status === 403) {
            throw new errors.NoPermissionError({
                message: 'This Admin API key cannot create an author. Use a staff access token (owner/admin) to import staff users.',
                code: AUTHOR_NO_PERMISSION
            });
        }
        throw new errors.InternalServerError({
            message: `Failed to import author (${response.status})`
        });
    }

    return response.json();
};

// Build the importable JSON (used for the copy-paste fallback when no staff
// token is available).
const buildImportFile = author => ({
    meta: {exported_on: Date.now(), version: '5.0.0'},
    data: {
        users: [{
            id: author.id,
            name: author.name,
            slug: author.slug,
            email: author.email,
            roles: [author.role],
            profile_image: author.profile_image,
            bio: author.bio
        }]
    }
});

// Pick a random subset of post indices [0, count) to receive the dummy as
// primary author. `share` is a percentage (0-100).
const pickPrimaryAuthorIndices = ({count, share = 30}) => {
    const size = Math.max(0, count || 0);
    const pct = Math.min(100, Math.max(0, Number(share) || 0));
    const target = Math.round((size * pct) / 100);

    const indices = Array.from({length: size}, (_, i) => i);
    // Shuffle then take the first `target`.
    for (let i = indices.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    return new Set(indices.slice(0, target));
};

export {
    AUTHOR_NO_PERMISSION,
    slugify,
    buildDummyAuthor,
    findExistingAuthor,
    importAuthor,
    buildImportFile,
    pickPrimaryAuthorIndices
};
