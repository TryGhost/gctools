import makeTaskRunner from '../task-runner.js';

const editPosts = async (args) => {
    const options = {
        api: args.api,
        type: args.type || 'posts',
        items: args.items || []
    };

    let tasks = [];
    let updatedItems = [];

    options.items.forEach((post) => {
        tasks.push({
            title: `${post.title}`,
            task: async () => {
                try {
                    let result = await options.api[options.type].edit(post);
                    updatedItems.push(result);
                    return result;
                } catch (error) {
                    error.resource = {
                        title: post.title
                    };
                    throw error;
                }
            }
        });
    });

    const doPostChange = makeTaskRunner(tasks, {
        concurrent: 3
    });

    // Do the changes
    await doPostChange.run();

    return updatedItems;
};

export {
    editPosts
};
