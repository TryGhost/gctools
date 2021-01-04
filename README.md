# GCTools

Command line utilities for working with Ghost content.


## Install

1. `git clone` this repo & `cd` into it as usual
2. Run `yarn` to install top-level dependencies.
3. To make `gctools` accessible globally, run `yarn link`


## Usage

To see all available tools:

```sh
gctools
```


### Interactive Mode

GCTools has an interactive CLI which walks you through each tool, without needing to add multiple option flags.

```sh
gctools i
```

Each of the tools also has a traditional CLI counterpart with more options, detailed below.


### zip-split

Split a zip file into smaller zip files of a defined maximum size, while maintaining the directory structure.

See all available options:

```sh
gctools zip-split --help
```

Split a zip file into as many files needed for them to all be 50mb or below:

```sh
gctools zip-split /path/to/big-file.zip --M 50
```


### random-posts

Insert a number of posts with random content.

See all available options:

```sh
gctools random-posts --help
```

Create and insert 10 random posts:

```sh
gctools random-posts <apiURL> <adminAPIKey>
```

Create and insert 3000 random draft posts with 2 tags visible to members only, written by a specific author:

```sh
gctools random-posts <apiURL> <adminAPIKey> --count 3000 --tag '#random,New World' --status draft --visibility members --userEmail person@dummyemail.com
```


### delete-posts

Delete all content or content with a specific set of filters, which can be combined.

See all available options:

```sh
gctools delete-posts --help
```

Delete all posts (⛔️ dangerous!)

```sh
gctools delete-posts <apiURL> <adminAPIKey>
```

Delete all posts with a specific tag

```sh
gctools delete-posts <apiURL> <adminAPIKey> --tag '#testing'
```

Delete all posts by a specific author

```sh
gctools delete-posts <apiURL> <adminAPIKey> --author 'sample-user'
```

Delete all posts by a specific author with a specific tag

```sh
gctools delete-posts <apiURL> <adminAPIKey> --author 'sample-user' --tag '#testing'
```


### delete-tags

Delete tags, but not the content that uses that tag

See all available options:

```sh
gctools delete-tags --help
```

Delete a specific tag or multiple tags

```sh
gctools delete-tags <apiURL> <adminAPIKey> --tag '#gctools, Test 1'
```


### find-replace

Delete tags, but not the content that uses that tag
Find & replace strings of text within Ghost posts

See all available options:

```sh
gctools find-replace --help
```

Replace a string but only in the `mobiledoc` and `title`:

```sh
gctools find-replace <apiURL> <adminAPIKey> --find 'Old text' --replace 'New text' --where mobiledoc,title
```

Replace a string in all available fields:

```sh
gctools find-replace <apiURL> <adminAPIKey> --find 'Old text' --replace 'New text' --where all
```

Available `where` fields are:

* `all`
* `mobiledoc` (default)
* `title`
* `slug`
* `custom_excerpt`
* `meta_title`
* `meta_description`
* `twitter_title`
* `twitter_description`
* `og_title`
* `og_description`


## Develop

* `commands` handles the traditional CLI input
* `tools` handles the interactive CLI input
* `tasks` is the tasks run by both the CLI and interactive tool


# Copyright & License

Copyright (c) 2013-2020 Ghost Foundation - Released under the [MIT license](LICENSE).
