import {discover} from './batch-ghost-discover.js';
import {getMemberLabels, getTiers} from './admin-api-call.js';
import chalk from 'chalk';

const getAPITiers = async ({returnKey = 'slug'}) => {
    let tiers = [];

    const url = process.env.GC_TOOLS_apiURL;
    const key = process.env.GC_TOOLS_adminAPIKey;

    let tiersResponse = await getTiers({
        adminAPIKey: key,
        apiURL: url
    });

    tiersResponse.forEach(function (tier){
        tiers.push({
            name: `${tier.name} ${chalk.grey(`(${tier.slug} - ${tier.id})`)}`,
            value: (returnKey) ? tier[returnKey] : tier
        });
    });

    return tiers;
};

const getAPIAuthorsObj = async () => {
    const url = process.env.GC_TOOLS_apiURL;
    const key = process.env.GC_TOOLS_adminAPIKey;

    let apiUsers = await discover({
        type: 'users',
        url: url.replace('localhost', '127.0.0.1'),
        key: key,
        order: 'slug ASC'
    });

    let users = [];

    apiUsers.forEach(function (author){
        users.push({
            name: `${author.name} ${chalk.grey(`(${author.slug} - ${author.count.posts} posts)`)}`,
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
            name: `${tag.name} ${chalk.grey(`(${tag.slug} - ${tag.count.posts} posts)`)}`,
            value: tag
        });
    });

    if (additionalOpts) {
        tags.push(additionalOpts);
    }

    return tags;
};

const getAPINewslettersObj = async ({returnKey = 'id'}) => {
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
            name: `${newsletter.name} ${chalk.grey(`(${newsletter.slug} - ${newsletter.id})`)}`,
            value: (returnKey) ? newsletter[returnKey] : newsletter
        });
    });

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

const getAPIMemberLabels = async ({returnKey = 'slug', options}) => {
    let labels = [];

    const url = options?.apiURL ?? process.env.GC_TOOLS_apiURL;
    const key = options?.adminAPIKey ?? process.env.GC_TOOLS_adminAPIKey;

    let labelsResponse = await getMemberLabels({
        adminAPIKey: key,
        apiURL: url
    });

    labelsResponse.forEach(function (label){
        labels.push({
            name: `${label.name} ${chalk.grey(`(${label.slug} - ${label.id})`)}`,
            value: (returnKey) ? label[returnKey] : label
        });
    });

    return labels;
};

export {
    getAPITiers,
    getAPIAuthorsObj,
    getAPITagsObj,
    getAPINewslettersObj,
    getAPIVisibilityObj,
    getAPIRolesObj,
    getAPIMemberLabels
};
