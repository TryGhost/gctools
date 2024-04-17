import GhostAdminAPI from '@tryghost/admin-api';
import {makeTaskRunner} from '@tryghost/listr-smart-renderer';
import Table from 'tty-table';

const initialise = (options) => {
    return {
        title: 'Initialising API connection',
        task: async (ctx, task) => {
            const url = options.apiURL;
            const key = options.adminAPIKey;
            const api = new GhostAdminAPI({
                url: url.replace('localhost', '127.0.0.1'),
                key,
                version: 'v5.0'
            });

            ctx.api = api;

            ctx.stats = {
                posts: {
                    count: null
                },
                posts_drafts: {
                    count: null
                },
                posts_sent: {
                    count: null
                },
                posts_published: {
                    count: null
                },
                public_posts: {
                    count: null
                },
                members_posts: {
                    count: null
                },
                paid_posts: {
                    count: null
                },
                tiers_posts: {
                    count: null
                },
                pages: {
                    count: null
                },
                tags: {
                    count: null
                },
                users: {
                    count: null,
                    roles: []
                },
                members: {
                    count: null
                }
            };

            ctx.tables = {
                stats: null,
                users: null
            };

            task.output = `Initialised API connection for ${options.apiURL}`;
        }
    };
};

const getFullTaskList = (options) => {
    return [
        initialise(options),
        {
            title: 'Counting posts',
            task: async (ctx) => {
                const postsData = await ctx.api.posts.browse({limit: 100});
                ctx.stats.posts.count = postsData.meta.pagination.total;
            }
        },
        {
            title: 'Counting public posts',
            task: async (ctx) => {
                const postsData = await ctx.api.posts.browse({limit: 1, filter: 'visibility:public'});
                ctx.stats.public_posts.count = postsData.meta.pagination.total;
            }
        },
        {
            title: 'Counting sent posts',
            task: async (ctx) => {
                const postsData = await ctx.api.posts.browse({limit: 1, filter: 'status:sent'});
                ctx.stats.posts_sent.count = postsData.meta.pagination.total;
            }
        },
        {
            title: 'Counting draft posts',
            task: async (ctx) => {
                const postsData = await ctx.api.posts.browse({limit: 1, filter: 'status:draft'});
                ctx.stats.posts_drafts.count = postsData.meta.pagination.total;
            }
        },
        {
            title: 'Counting published posts',
            task: async (ctx) => {
                const postsData = await ctx.api.posts.browse({limit: 1, filter: 'status:published'});
                ctx.stats.posts_published.count = postsData.meta.pagination.total;
            }
        },
        {
            title: 'Counting member posts',
            task: async (ctx) => {
                const postsData = await ctx.api.posts.browse({limit: 1, filter: 'visibility:members'});
                ctx.stats.members_posts.count = postsData.meta.pagination.total;
            }
        },
        {
            title: 'Counting paid posts',
            task: async (ctx) => {
                const postsData = await ctx.api.posts.browse({limit: 1, filter: 'visibility:paid'});
                ctx.stats.paid_posts.count = postsData.meta.pagination.total;
            }
        },
        {
            title: 'Counting tiers posts',
            task: async (ctx) => {
                const postsData = await ctx.api.posts.browse({limit: 1, filter: 'visibility:tiers'});
                ctx.stats.tiers_posts.count = postsData.meta.pagination.total;
            }
        },
        {
            title: 'Counting pages',
            task: async (ctx) => {
                const pagesData = await ctx.api.pages.browse({limit: 1});
                ctx.stats.pages.count = pagesData.meta.pagination.total;
            }
        },
        {
            title: 'Counting tags',
            task: async (ctx) => {
                const tagsData = await ctx.api.tags.browse({limit: 1});
                ctx.stats.tags.count = tagsData.meta.pagination.total;
            }
        },
        {
            title: 'Counting staff',
            task: async (ctx) => {
                const usersData = await ctx.api.users.browse({limit: 'all', include: 'roles'});

                const staffOwner = usersData.filter(word => word.roles[0].name === 'Owner');
                const staffAdministrator = usersData.filter(word => word.roles[0].name === 'Administrator');
                const staffEditor = usersData.filter(word => word.roles[0].name === 'Editor');
                const staffAuthor = usersData.filter(word => word.roles[0].name === 'Author');
                const staffContributor = usersData.filter(word => word.roles[0].name === 'Contributor');

                ctx.stats.users.count = usersData.meta.pagination.total;
                ctx.stats.users.roles = {
                    owner: {count: staffOwner.length},
                    administrator: {count: staffAdministrator.length},
                    editor: {count: staffEditor.length},
                    author: {count: staffAuthor.length},
                    contributor: {count: staffContributor.length}
                };
            }
        },
        {
            title: 'Counting members',
            task: async (ctx) => {
                const membersData = await ctx.api.members.browse();
                ctx.stats.members.count = membersData.meta.pagination.total;
            }
        },
        {
            title: 'Build stats',
            task: (ctx) => {
                const statsHeader = [{
                    value: 'Resource',
                    headerColor: 'cyan',
                    color: 'white',
                    headerAlign: 'left',
                    align: 'left',
                    width: 20
                },
                {
                    value: 'Count',
                    headerColor: 'cyan',
                    color: 'white',
                    headerAlign: 'left',
                    align: 'left',
                    width: 10
                }];

                const statsRows = [
                    ['Posts', ctx.stats.posts.count],
                    ['- - Draft', ctx.stats.posts_drafts.count],
                    ['- - Sent', ctx.stats.posts_sent.count],
                    ['- - Published', ctx.stats.posts_published.count],
                    ['- Public', ctx.stats.public_posts.count],
                    ['- Members', ctx.stats.members_posts.count],
                    ['- Paid', ctx.stats.paid_posts.count],
                    ['- Tiers', ctx.stats.tiers_posts.count],
                    ['Pages', ctx.stats.pages.count],
                    ['Tags', ctx.stats.tags.count],
                    ['Users', ctx.stats.users.count],
                    ['Members', ctx.stats.members.count]
                ];

                ctx.tables.stats = Table(statsHeader, statsRows, {compact: true}).render();

                const usersHeader = [{
                    value: 'Role',
                    headerColor: 'cyan',
                    color: 'white',
                    headerAlign: 'left',
                    align: 'left',
                    width: 20
                },
                {
                    value: 'Count',
                    headerColor: 'cyan',
                    color: 'white',
                    headerAlign: 'left',
                    align: 'left',
                    width: 10
                }];

                const usersRows = [
                    ['Owner', ctx.stats.users.roles.owner.count],
                    ['Administrator', ctx.stats.users.roles.administrator.count],
                    ['Editor', ctx.stats.users.roles.editor.count],
                    ['Author', ctx.stats.users.roles.author.count],
                    ['Contributor', ctx.stats.users.roles.contributor.count]
                ];

                ctx.tables.users = Table(usersHeader, usersRows, {compact: true}).render();
            }
        }
    ];
};

const getTaskRunner = (options) => {
    let tasks = [];

    tasks = getFullTaskList(options);

    return makeTaskRunner(tasks, Object.assign({topLevel: true}, options));
};

export default {
    initialise,
    getFullTaskList,
    getTaskRunner
};
