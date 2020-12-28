const ui = require('@tryghost/pretty-cli').ui;

module.exports = async function (type, ctx) {
    let response = null;
    let results = [];
    let params = {
        limit: 15,
        page: 0
    };

    if (type === 'posts' && (ctx.options.tag || ctx.options.author)) {
        let filterStringParts = new Array();

        if (ctx.options.tag) {
            filterStringParts.push(`tag:[${ctx.options.tag}]`);
        }

        if (ctx.options.author) {
            filterStringParts.push(`author:[${ctx.options.author}]`);
        }

        params.filter = filterStringParts.join('+');
    }

    do {
        try {
            response = await ctx.api[type].browse(params);
        } catch (error) {
            ui.log.error(`Error getting ${type} from API`, error);
        }
        results = results.concat(response);
        params.page = response.meta.pagination.next;
    } while (response.meta.pagination.next);

    if (type === 'tags') {
        if (typeof ctx.options.tag === 'object') {
            return results.filter(item => ctx.options.tag.includes(item.slug));
        } else {
            var tagsArray = ctx.options.tag.split(',').map(function (item) {
                return item.trim();
            });
            let newResults = results.filter(item => tagsArray.includes(item.slug));
            return await newResults;
        }
    }

    return await results;
};
