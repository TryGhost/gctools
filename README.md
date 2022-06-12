# GCTools

Command line utilities for working with Ghost content.


## Install

1. `git clone` this repo & `cd` into it as usual
2. Run `yarn` to install top-level dependencies.
3. To make `gctools` accessible globally, run `yarn link`


## Usage

```bash
# Open the traditional CLI
gctools
```
```bash
# Open the interactive CLI
gctools i
```

### Usage notes

When filtering posts, either with the traditional CLI or interactive prompts, each parameter is inclusive. For example, adding `--tag 'article, podcast'`, it will find items that have _both_ tags.

If you want any other form of filter, use the `--filter` flag, such as `--filter 'tag:[article, podcast]'` which includes items with the tag `article` _or_ `podcast`.


## Tools

Docs to come


# Copyright & License

Copyright (c) 2013-2022 Ghost Foundation - Released under the [MIT license](LICENSE).
