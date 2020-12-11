# GCTools

Command line utilities for working with Ghost content.


## Install

1. `git clone` this repo & `cd` into it as usual
2. Run `yarn` to install top-level dependencies.
3. To make GCTools accessible globally run `yarn link`


## Usage

To see all avaliable tools:

```sh
gctools
```

Split a zip file into as many files needed for them to all be 50mb or below:

```sh
gctools zip-split /path/to/big-file.zip --maxSize 50
```


# Copyright & License

Copyright (c) 2013-2020 Ghost Foundation - Released under the [MIT license](LICENSE).
