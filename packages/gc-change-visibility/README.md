# Change Visibility

Change the post visibility of a filtered list of posts

## Usage in the CLI

By default, this tool will select _all_ posts, and change their visibility.

```
gctools change-visibility <apiURL> <adminAPIKey> --newVisibility paid
```

You can filter the posts that will be changed by adding filters:

```
gctools change-visibility <apiURL> <adminAPIKey> --visibility members --tag premium,article --author john --newVisibility paid
```

This will select posts that are currently set to members-only, have the 'Preium' and Article tags, and are written by John.

You can also pass a Ghost-compatible [filter string](https://ghost.org/docs/content-api/#filtering), which bypasses the built-in filtering this tool offers.

```
gctools change-visibility <apiURL> <adminAPIKey> --filter 'visibility:paid+tag:premium+tag:-article' --newVisibility paid
```

This will select posts that are currently set to paid-only, have the 'Preium' tag but _not_ the Article tag.


## Usage in other tools

```js
import changeVisibility from '@tryghost/gc-change-visibility';

const run = await changeVisibility.run({
    apiURL: 'https://example.com',
    adminAPIKey: '12345678c1cead3e40011103:636e91c4f1e286d57b2da230dfa076915247cdc41c6c6ab491e3c32a44afa8a7',
    visibility: 'public,members',
    tag: 'articles',
    author: 'john',
    newVisibility: 'paid'
});

// Returns a list of the changed post objects
// [{id: '...' title: '...'},{id: '...' title: '...'}]
console.log(run);
```

You can optionally pass `confirm: false` to the options to bypass the conformation step before applying the change. By default, `confirm` is set to `true`, which will prompt you to confirm the changes.


## Options

| Flag                  | Default | Description                                             | Options                     |
| --------------------- | ------- | ------------------------------------------------------- | --------------------------- |
| `--visibility`        | `null`  | A comma-sepperated list of current visibility slugs     |                             |
| `--tag`               | `null`  | A comma-sepperated list of current visibility slugs     |                             |
| `--author`            | `null`  | A comma-sepperated list of current author slugs         |                             |
| `--filter`            | `null`  | A Ghost-compatible filter, overriding any other filters |                             |
| `--newVisibility`     | `null`  | The new visibility slug                                 | `public`, `members`, `paid` |
| `--comfirm`           | `true`  | Ask for confirmation before changing visibility         | `true`, `false`             |
| `--delayBetweenCalls` | `50`  | The delay between API calls, in ms                      |                             |
| `--verbose` `-V`      | `false` | Show verbose output                                     | `true`, `false`             |


# Copyright & License

Copyright (c) 2013-2022 Ghost Foundation - Released under the [MIT license](LICENSE).
