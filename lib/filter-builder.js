const authorBuilder = (args, filter) => {
    if (!args.authors) {
        return filter;
    }

    args.authors.forEach((author) => {
        filter.push(`author:[${author.slug}]`);
    });

    return filter;
};

const notAuthorBuilder = (args, filter) => {
    if (!args.notAuthors) {
        return filter;
    }

    args.notAuthors.forEach((author) => {
        filter.push(`author:-[${author.slug}]`);
    });

    return filter;
};

const tagBuilder = (args, filter) => {
    if (!args.tags) {
        return filter;
    }

    args.tags.forEach((author) => {
        filter.push(`tag:[${author.slug}]`);
    });

    return filter;
};

const notTagBuilder = (args, filter) => {
    if (!args.notTags) {
        return filter;
    }

    args.notTags.forEach((author) => {
        filter.push(`tag:-[${author.slug}]`);
    });

    return filter;
};

const visibilityBuilder = (args, filter) => {
    if (!args.visibility) {
        return filter;
    }

    if (args.visibility.includes('all')) {
        return filter;
    }

    args.visibility.forEach((visibility) => {
        filter.push(`visibility:[${visibility}]`);
    });

    return filter;
};

const notVisibilityBuilder = (args, filter) => {
    if (!args.notVisibility) {
        return filter;
    }

    if (args.notVisibility.includes('all')) {
        return filter;
    }

    args.notVisibility.forEach((visibility) => {
        filter.push(`visibility:-[${visibility}]`);
    });

    return filter;
};

const newsletterBuilder = (args, filter) => {
    if (!args.newsletters) {
        return filter;
    }

    args.newsletters.forEach((newsletter) => {
        filter.push(`newsletters:[${newsletter.slug}]`);
    });

    return filter;
};

const notNewsletterBuilder = (args, filter) => {
    if (!args.notNewsletters) {
        return filter;
    }

    args.notNewsletters.forEach((newsletter) => {
        filter.push(`newsletters:-[${newsletter.slug}]`);
    });

    return filter;
};

const labelBuilder = (args, filter) => {
    if (!args.labels) {
        return filter;
    }

    args.labels.forEach((label) => {
        filter.push(`label:[${label.slug}]`);
    });

    return filter;
};

const notLabelBuilder = (args, filter) => {
    if (!args.notLabels) {
        return filter;
    }

    args.notLabels.forEach((label) => {
        filter.push(`label:-[${label.slug}]`);
    });

    return filter;
};

/**
 * Built the `filter` parameter for Ghost Admin Client
 * @param {*} args
 * @param {Array} args.author Array of author
 * @param {Array} args.tag Array of tag
 * @param {Array} args.visibility Array of visibility
 * @param {Array} args.newsletters Array of newsletters
 * @param {Array} args.notNewsletters Array of newsletters to negate
 * @returns
 */
const filterBuilder = (args) => {
    // The default join separator
    if (!args.joinSeparator) {
        args.joinSeparator = '+';
    }

    // Add parts of the filter will be added to this array first and joined later
    let filter = [];

    // Authors
    filter = authorBuilder(args, filter);
    filter = notAuthorBuilder(args, filter);

    // Tags
    filter = tagBuilder(args, filter);
    filter = notTagBuilder(args, filter);

    // Visibility
    filter = visibilityBuilder(args, filter);
    filter = notVisibilityBuilder(args, filter);

    // Newsletters
    filter = newsletterBuilder(args, filter);
    filter = notNewsletterBuilder(args, filter);

    // Labels
    filter = labelBuilder(args, filter);
    filter = notLabelBuilder(args, filter);

    const finalFilter = filter.join(args.joinSeparator);

    return finalFilter;
};

export {
    filterBuilder
};
