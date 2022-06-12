# Delete Posts

Delete posts in Ghost based on filters

```js
import deletePosts from '@tryghost/gc-delete-posts';

const run = await deletePosts.run({
    apiURL: 'https://example.com',
    adminAPIKey: '12345678c1cead3e40011103:636e91c4f1e286d57b2da230dfa076915247cdc41c6c6ab491e3c32a44afa8a7',
    visibility: 'public,members',
    tag: 'articles',
    author: 'john'
});

// Returns a list of the deleted post objects
// [{id: '...' title: '...'},{id: '...' title: '...'}]
console.log(run);
```

You can optionally pass `confirm: false` to the options to bypass the conformation step before applying the change. By default, `confirm` is set to `true`, which will prompt you to confirm the changes.
