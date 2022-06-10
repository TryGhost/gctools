import {discover} from './batch-ghost-discover.js';

const getAPIAuthorsObj = async (args) => {
    let apiUsers = await discover({
        api: args.api,
        type: 'users',
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

const getAPITagsObj = async (args) => {
    let apiTags = await discover({
        api: args.api,
        type: 'tags',
        order: 'slug ASC'
    });

    let tags = [];

    apiTags.forEach(function (tag){
        tags.push({
            name: `${tag.name} - ${tag.slug} - ${tag.count.posts} posts`,
            value: tag
        });
    });

    return tags;
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

export {
    getAPIAuthorsObj,
    getAPITagsObj,
    getAPIVisibilityObj,
    getAPIRolesObj
};
