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


### zip-split

See all available options:

```sh
gctools zip-split --help
```

Split a zip file into as many files needed for them to all be 50mb or below:

```sh
gctools zip-split /path/to/big-file.zip --M 50
```


### random-posts

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
gctools random-posts <apiURL> <adminAPIKey> --count 3000 --tags '#random,New World' --status draft --visibility members --userEmail person@dummyemail.com
```


# Copyright & License

Copyright (c) 2013-2020 Ghost Foundation - Released under the [MIT license](LICENSE).
