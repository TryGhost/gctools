import {SlugFromStringArrayOrObject} from './utils.js';

const authorBuilder = (args, filter) => {
    if (!args.author) {
        return;
    }

    const authors = SlugFromStringArrayOrObject(args.author);

    filter.push(`author:[${authors.join(args.joinSeparator)}]`);
    return filter;
};

const tagBuilder = (args, filter) => {
    if (!args.tag) {
        return;
    }

    const tag = SlugFromStringArrayOrObject(args.tag);

    filter.push(`tag:[${tag.join(args.joinSeparator)}]`);
    return filter;
};

const visibilityBuilder = (args, filter) => {
    if (!args.visibility) {
        return;
    }

    const visibility = SlugFromStringArrayOrObject(args.visibility);

    // CASE: The `all` in `visibility` takes priority, so no visibility filter is actually needed
    if (visibility.includes('all')) {
        return filter;
    }

    filter.push(`visibility:[${visibility.join(args.joinSeparator)}]`);
    return filter;
};

const filterBuilder = (args) => {
    // The default join separator
    if (!args.joinSeparator) {
        args.joinSeparator = ', ';
    }

    // Add parts of the filter will be added to this array first and joined later
    let filter = [];

    // Add authors to filter
    filter = authorBuilder(args, filter);

    // Add tags to filter
    filter = tagBuilder(args, filter);

    // Add visibility to filter
    filter = visibilityBuilder(args, filter);

    const finalFilter = filter.join(args.joinSeparator);

    return finalFilter;
}

export default {
    filterBuilder
};
