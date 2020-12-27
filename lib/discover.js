module.exports = async function (ctx) {
    let response = null;
    let page = 0;
    let results = [];

    let filterStringParts = new Array();

    if (ctx.options.tag) {
        filterStringParts.push(`tag:[${ctx.options.tag}]`);
    }

    if (ctx.options.author) {
        filterStringParts.push(`author:[${ctx.options.author}]`);
    }

    const filterString = filterStringParts.join('+');

    do {
        response = await ctx.api.posts.browse({
            fields: 'id,title,url',
            limit: 15,
            page: page,
            filter: filterString
        });
        results = results.concat(response);
        page = response.meta.pagination.next;
    } while (response.meta.pagination.next);

    return await results;
};
