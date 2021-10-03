const ui = require('@tryghost/pretty-cli').ui;

module.exports = async function (type, ctx) {
    let response = null;
    let results = [];
    let params = {
        limit: 15,
        page: 0
    };

    if ((type === 'posts' || type === 'pages') && (ctx.args.tag || ctx.args.author || ctx.args.visibility)) {
        let filterStringParts = new Array();

        if (ctx.args.tag) {
            filterStringParts.push(`tag:[${ctx.args.tag}]`);
        }

        if (ctx.args.author) {
            filterStringParts.push(`author:[${ctx.args.author}]`);
        }

        if (ctx.args.visibility) {
            filterStringParts.push(`visibility:${ctx.args.visibility}`);
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
        if (typeof ctx.args.tag === 'object') {
            return results.filter(item => ctx.args.tag.includes(item.slug));
        } else {
            let tagsArray = ctx.args.tag.split(',').map(function (item) {
                return item.trim();
            });
            let newResults = results.filter(item => tagsArray.includes(item.slug));
            return await newResults;
        }
    }

    return await results;
};
