const makeTaskRunner = require('./task-runner');

async function getStats(args = {}) {
    const {api} = args;

    let stats = {
        posts: {
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
            count: null,
            status: []
        }
    };

    let tasks = [];

    tasks.push({
        title: `Fetching total post count`,
        task: async () => {
            const postsData = await api.posts.browse({limit: 1});
            stats.posts.count = postsData.meta.pagination.total;
        }
    });

    tasks.push({
        title: `Fetching public post count`,
        task: async () => {
            const publicPostsData = await api.posts.browse({limit: 1, filter: 'visibility:public'});
            stats.public_posts.count = publicPostsData.meta.pagination.total;
        }
    });

    tasks.push({
        title: `Fetching members post count`,
        task: async () => {
            const membersPostsData = await api.posts.browse({limit: 1, filter: 'visibility:members'});
            stats.members_posts.count = membersPostsData.meta.pagination.total;
        }
    });

    tasks.push({
        title: `Fetching paid post count`,
        task: async () => {
            const paidPostsData = await api.posts.browse({limit: 1, filter: 'visibility:paid'});
            stats.paid_posts.count = paidPostsData.meta.pagination.total;
        }
    });

    tasks.push({
        title: `Fetching page count`,
        task: async () => {
            const pagesData = await api.pages.browse({limit: 1});
            stats.pages.count = pagesData.meta.pagination.total;
        }
    });

    tasks.push({
        title: `Fetching tag count`,
        task: async () => {
            const tagsData = await api.tags.browse({limit: 1});
            stats.tags.count = tagsData.meta.pagination.total;
        }
    });

    tasks.push({
        title: `Fetching staff count`,
        task: async () => {
            const usersData = await api.users.browse({limit: 'all', include: 'roles'});
            stats.users.count = usersData.meta.pagination.total;

            const staffOwner = usersData.filter(word => word.roles[0].name === 'Owner');
            stats.users.roles.owner = {count: staffOwner.length};

            const staffAdministrator = usersData.filter(word => word.roles[0].name === 'Administrator');
            stats.users.roles.administrator = {count: staffAdministrator.length};

            const staffEditor = usersData.filter(word => word.roles[0].name === 'Editor');
            stats.users.roles.editor = {count: staffEditor.length};

            const staffAuthor = usersData.filter(word => word.roles[0].name === 'Author');
            stats.users.roles.author = {count: staffAuthor.length};

            const staffContributor = usersData.filter(word => word.roles[0].name === 'Contributor');
            stats.users.roles.contributor = {count: staffContributor.length};
        }
    });

    tasks.push({
        title: `Fetching members count`,
        task: async () => {
            const membersData = await api.members.browse({limit: 1});

            stats.members.count = membersData.meta.pagination.total;
        }
    });

    tasks.push({
        title: `Fetching free members count`,
        task: async () => {
            const freeMembersData = await api.members.browse({limit: 1, filter: 'status:free'});

            stats.members.status.free = {
                count: freeMembersData.meta.pagination.total
            };
        }
    });

    tasks.push({
        title: `Fetching comped members count`,
        task: async () => {
            const compedMembersData = await api.members.browse({limit: 1, filter: 'status:comped'});

            stats.members.status.comped = {
                count: compedMembersData.meta.pagination.total
            };
        }
    });

    tasks.push({
        title: `Fetching paid members count`,
        task: async () => {
            const paidMembersData = await api.members.browse({limit: 1, filter: 'status:paid'});

            stats.members.status.paid = {
                count: paidMembersData.meta.pagination.total
            };
        }
    });

    const taskRunner = makeTaskRunner(tasks, {
        concurrent: 1,
        maxFullTasks: 1 // Shows the tasks as they run, and then hides the output once complete
    });

    await taskRunner.run();

    return stats;
}

module.exports.getStats = getStats;
