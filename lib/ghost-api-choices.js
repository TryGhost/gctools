import {discover} from './batch-ghost-discover.js';
import {getMemberLabels} from './admin-api-call.js';

const getAPIAuthorsObj = async () => {
    const url = process.env.GC_TOOLS_apiURL;
    const key = process.env.GC_TOOLS_adminAPIKey;

    let apiUsers = await discover({
        type: 'users',
        url: url,
        key: key,
        order: 'slug ASC'
    });

    let users = [];

    apiUsers.forEach(function (author){
        users.push({
            name: `${author.name} - ${author.slug} - ${author.count.posts} posts`,
            value: author
        });
    });

    return users;
};

const getAPITagsObj = async (additionalOpts) => {
    const url = process.env.GC_TOOLS_apiURL;
    const key = process.env.GC_TOOLS_adminAPIKey;

    let apiTags = await discover({
        type: 'tags',
        url: url,
        key: key,
        order: 'slug ASC'
    });

    let tags = [];

    apiTags.forEach(function (tag){
        tags.push({
            name: `${tag.name} - ${tag.slug} - ${tag.count.posts} posts`,
            value: tag
        });
    });

    if (additionalOpts) {
        tags.push(additionalOpts);
    }

    return tags;
};

const getAPINewslettersObj = async (additionalOpts) => {
    const url = process.env.GC_TOOLS_apiURL;
    const key = process.env.GC_TOOLS_adminAPIKey;

    let apiNewsletters = await discover({
        type: 'newsletters',
        url: url,
        key: key,
        order: 'sort_order ASC'
    });

    let newsletters = [];

    apiNewsletters.forEach(function (newsletter){
        newsletters.push({
            name: `${newsletter.name} - ${newsletter.slug} - ${newsletter.id}`,
            value: newsletter.id
        });
    });

    if (additionalOpts) {
        newsletters.push(additionalOpts);
    }

    return newsletters;
};

const getAPIVisibilityObj = async () => {
    return [
        {
            name: 'Public',
            value: 'public'
        },
        {
            name: 'Members-only',
            value: 'members'
        },
        {
            name: 'Paid-members only',
            value: 'paid'
        }
    ];
};

const getAPIRolesObj = async () => {
    return [
        {
            name: 'Contributor',
            value: 'Contributor'
        },
        {
            name: 'Author',
            value: 'Author'
        },
        {
            name: 'Editor',
            value: 'Editor'
        },
        {
            name: 'Administrator',
            value: 'Administrator'
        }
    ];
};

const getAPIMemberLabels = async () => {
    let labels = [];

    const url = process.env.GC_TOOLS_apiURL;
    const key = process.env.GC_TOOLS_adminAPIKey;

    let labelsResponse = await getMemberLabels({
        adminAPIKey: key,
        apiURL: url
    });

    labelsResponse.forEach(function (newsletter){
        labels.push({
            name: `${newsletter.name} - ${newsletter.slug} - ${newsletter.id}`,
            value: newsletter.slug
        });
    });

    return labels;
};

export {
    getAPIAuthorsObj,
    getAPITagsObj,
    getAPINewslettersObj,
    getAPIVisibilityObj,
    getAPIRolesObj,
    getAPIMemberLabels
};
