import {readSettings} from './navigation.js';

// Strip a trailing slash from a URL.
const trimTrailingSlash = url => (url || '').replace(/\/$/, '');

// Gather everything the seeder needs to know about the target site before it
// starts writing: site URL, the primary author (to attribute posts and build
// the "Author" nav link), the current navigation menu, and whether an /about
// page already exists.
const gatherSiteInfo = async ({api, options}) => {
    const site = await api.site.read();
    const siteUrl = trimTrailingSlash(site.url);

    const users = await api.users.browse({limit: 'all', include: 'roles'});
    const owner = users.find(u => (u.roles || []).some(r => r.name === 'Owner'));
    const primaryAuthor = owner || users[0];

    let aboutPage = null;
    try {
        const pages = await api.pages.browse({filter: 'slug:about', limit: 1});
        aboutPage = (pages && pages.length) ? pages[0] : null;
    } catch (error) {
        aboutPage = null;
    }

    const settings = await readSettings({options});
    const navValue = settings.navigation;
    let navigation = [];
    if (navValue !== undefined) {
        try {
            navigation = typeof navValue === 'string' ? JSON.parse(navValue) : (navValue || []);
        } catch (error) {
            navigation = [];
        }
    }

    // Members are enabled when signup access is anything other than 'none';
    // used to gate the paywall card, which only makes sense with members.
    const membersEnabled = settings.members_signup_access !== undefined
        ? settings.members_signup_access !== 'none'
        : true;

    return {
        siteUrl,
        title: site.title,
        version: site.version,
        primaryAuthor: primaryAuthor ? {
            name: primaryAuthor.name,
            slug: primaryAuthor.slug,
            email: primaryAuthor.email
        } : null,
        navigation,
        aboutPage,
        membersEnabled
    };
};

export {
    trimTrailingSlash,
    gatherSiteInfo
};
