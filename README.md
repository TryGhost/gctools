# GCTools

Command line utilities for working with Ghost content.


## Install

1. `git clone` this repo & `cd` into it as usual
2. Run `yarn` to install top-level dependencies.
3. To make `gctools` accessible globally, run `npm link`
    - You need to run this after making changes to the codebase to update the global version
    - If developing the code, `yarn dev ...` is a more suitable command


## Usage

To see all available tools, run:

```sh
gctools
```


### Interactive Mode

GCTools has an interactive mode which walks you through each tool, without needing to manually type multiple option flags.

```sh
gctools i
```

Available tools include:

* [`zip-split`](#zip-split)
* [`zip-create`](#zip-create)
* [`json-split`](#json-split)
* [`fetch-assets`](#fetch-assets)
* [`dedupe-members-csv`](#dedupe-members-csv)
* [`random-posts`](#random-posts)
* [`delete-posts`](#delete-posts)
* [`delete-pages`](#delete-pages)
* [`add-tags`](#add-tags)
* [`combine-tags`](#combine-tags)
* [`add-preview`](#add-preview)
* [`delete-tags`](#delete-tags)
* [`delete-empty-tags`](#delete-empty-tags)
* [`find-replace`](#find-replace)
* [`change-author`](#change-author)
* [`add-author`](#add-author)
* [`change-visibility-posts`](#change-visibility-posts)
* [`change-visibility-pages`](#change-visibility-pages)
* [`change-status`](#change-status)
* [`change-role`](#change-role)
* [`add-member-comp-subscription`](#add-member-comp-subscription)
* [`remove-member-comp-subscription`](#remove-member-comp-subscription)
* [`add-member-newsletter-subscription`](#add-member-newsletter-subscription)
* [`remove-member-newsletter-subscription`](#remove-member-newsletter-subscription)
* [`change-tags`](#change-tags)
* [`post-tiers`](#post-tiers)
* [`set-template`](#set-template)

Each of the tools also has a traditional CLI counterpart with more options, detailed below.


### zip-split

Split a zip file into smaller zip files of a defined maximum size, while maintaining the directory structure.

```sh
# See all available options
gctools zip-split --help

# Split a zip file into as many files needed for them to all be 50mb or below
gctools zip-split /path/to/big-file.zip -M 50
```


### zip-create

Split a large directory into smaller directories of a defined maximum size and zip each, while maintaining the directory structure.

```sh
# See all available options
gctools zip-create --help

# Split a large directory into as many files needed for them to all be 50mb or below
gctools zip-create /path/to/big-directory -M 50
```


### json-split

Split a large JSON file into smaller JSON files of a defined maximum size, while retaining meta, tag, and author information.

```sh
# See all available options
gctools json-split --help

# Split a JSON file into as many files needed for them to hax a maximum of 50 posts per file
gctools json-split /path/to/big-file.json --M 50
```


### fetch-assets

Download all available assets from a valid Ghost JSON file create a JSON file with updated image references

```sh
# See all available options
gctools fetch-assets --help

# Fetch assets from a valid Ghost JSON file, with `https://example.com` as the base URL
gctools fetch-assets /path/to/file.json https://example.com
```


### dedupe-members-csv

Create new CSV files that only contain new or updated members, by comparing the existing members with the output from the output from [`@tryghost/migrate`](https://github.com/TryGhost/migrate/tree/main/packages/mg-substack-members-csv).

```sh
# See all available options
gctools dedupe-members-csv --help

gctools dedupe-members-csv <existing-members> [new-free] [new-comp] [new-paid]
```


### random-posts

Insert a number of posts with random content.

```sh
# See all available options
gctools random-posts --help

# Create and insert 10 random posts
gctools random-posts <apiURL> <adminAPIKey>

# Create and insert 3000 random draft posts with 2 tags visible to members only, written by a specific author
gctools random-posts <apiURL> <adminAPIKey> --count 3000 --tag '#random,New World' --status draft --visibility members --userEmail person@dummyemail.com
```


### delete-posts

Delete all content or content with a specific set of filters, which can be combined.

```sh
# See all available options
gctools delete-posts --help

# Delete all posts (⛔️ dangerous!)
gctools delete-posts <apiURL> <adminAPIKey>

# Delete all posts with a specific tag
gctools delete-posts <apiURL> <adminAPIKey> --tag 'hash-testing'

# Delete all published posts
gctools delete-posts <apiURL> <adminAPIKey> --status 'published'

# Delete all draft posts
gctools delete-posts <apiURL> <adminAPIKey> --status 'draft'

# Delete all posts by a specific author
gctools delete-posts <apiURL> <adminAPIKey> --author 'sample-user'

# Delete all posts by a specific author with a specific tag
gctools delete-posts <apiURL> <adminAPIKey> --author 'sample-user' --tag 'hash-testing'
```


### delete-pages

Delete all content or content with a specific set of filters, which can be combined.

```sh
# See all available options
gctools delete-pages --help

# Delete all pages (⛔️ dangerous!)
gctools delete-pages <apiURL> <adminAPIKey>

# Delete all pages with a specific tag
gctools delete-pages <apiURL> <adminAPIKey> --tag 'hash-testing'

# Delete all published pages
gctools delete-pages <apiURL> <adminAPIKey> --status 'published'

# Delete all draft pages
gctools delete-pages <apiURL> <adminAPIKey> --status 'draft'

# Delete all pages by a specific author
gctools delete-pages <apiURL> <adminAPIKey> --author 'sample-user'

# Delete all pages by a specific author with a specific tag
gctools delete-pages <apiURL> <adminAPIKey> --author 'sample-user' --tag 'hash-testing'
```


### add-tags

Add a tag to specific posts and pages with a specific set of filters

```sh
# Add a tag of 'Testing' to all posts and pages
gctools add-tags <apiURL> <adminAPIKey> --new_tags 'Testing'

# Add a tag of 'Testing' to all posts and pages (same result as above)
gctools add-tags <apiURL> <adminAPIKey> --new_tags 'Testing' --type posts pages

# Add a tag of 'Testing' to all posts only
gctools add-tags <apiURL> <adminAPIKey> --new_tags 'Testing' --type posts

# Add a tag of 'Testing' to all pages only
gctools add-tags <apiURL> <adminAPIKey> --new_tags 'Testing' --type pages

# Add a tag of 'Testing' to all public posts and pages
gctools add-tags <apiURL> <adminAPIKey> --visibility public --new_tags 'Testing'

# Add a tag of 'Testing' to all members-only posts and pages that also have a tag of 'hello'
gctools add-tags <apiURL> <adminAPIKey> --visibility members --tag 'hello' --new_tags 'Testing'

# Add a tag of 'Testing' to all members-only posts and pages that also have a tag of 'hello', and are by written by 'harry'
gctools add-tags <apiURL> <adminAPIKey> --visibility members --tag 'hello' --author 'harry' --new_tags 'Testing'
```

### combine-tags

Combine tags by adding the `target` tag to all posts that hav any of the `incorporate` tags. For example, posts with the `posts`, `newsletter`, and `blogs` tags will have the `articles` added to it.

```sh
gctools combine-tags <apiURL> <adminAPIKey> <jsonFile>
```

The `<jsonFile>` file needs to follow the format below, with slugs used as the values.

```json
[
    {
        "target": "articles",
        "incorporate": [
            "posts",
            "newsletter",
            "blogs"
        ]
    },
    {
        "target": "media",
        "incorporate": [
            "podcasts",
            "video"
        ]
    }
]
```


### add-preview

Insert a public preview divider at a specific point, after the `previewPosition` number.

```sh
# Add a divider to all posts as position 2
gctools add-preview <apiURL> <adminAPIKey> --previewPosition 2

# Add a divider to all posts as position 2 for members-only posts
gctools add-preview <apiURL> <adminAPIKey> --visibility members --previewPosition 2

# Add a divider to all posts as position 2 for paid posts
gctools add-preview <apiURL> <adminAPIKey> --visibility paid --previewPosition 2

# Add a divider to all posts as position 2 for paid posts that also have a tag of `hello`
gctools add-preview <apiURL> <adminAPIKey> --visibility paid --tag hello --previewPosition 2

# Add a divider to all posts as position 2 for paid posts that also have a tag of `hello`, and are by written by `harry`
gctools add-preview <apiURL> <adminAPIKey> --visibility paid --tag hello --author harry --previewPosition 2
```


### delete-tags

Delete tags, but not the content that uses that tag

```sh
# See all available options
gctools delete-tags --help

# Delete a specific tag or multiple tags
gctools delete-tags <apiURL> <adminAPIKey> --tags hash-gctools, test 1
```

### delete-labels

Delete member labels

```sh
# See all available options
gctools delete-labels --help

# Delete a specific tag or multiple labels
gctools delete-labels <apiURL> <adminAPIKey> --labels 'First' 'Second'
```


### delete-empty-tags

Delete tags that have no or a low number of associated posts

```sh
# See all available options
gctools delete-empty-tags --help

# Delete a specific tag or multiple tags
gctools delete-empty-tags <apiURL> <adminAPIKey>

# Delete a specific tag or multiple tags
gctools delete-empty-tags <apiURL> <adminAPIKey> --maxPostCount 3
```


### find-replace

Find & replace strings of text within Ghost posts

```sh
# See all available options
gctools find-replace --help

# Replace a string but only in the `mobiledoc` and `title`
gctools find-replace <apiURL> <adminAPIKey> --find 'Old text' --replace 'New text' --where mobiledoc,title

# Replace a string in all available fields
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


### change-author

Change the author assigned to a post

```sh
# See all available options
gctools change-author --help

# Change the posts written by `richard` and assign to `michael`
gctools change-author <apiURL> <adminAPIKey> --author 'richard' --new_author 'michael'
```


### add-author

Add an author to a post

```sh
# See all available options
gctools add-author --help

# Add author with the slug 'michael' to all posts
gctools add-author <apiURL> <adminAPIKey> --new_author 'michael'

# Add author with the slug 'michael' to the posts with the tag 'news` 
gctools add-author <apiURL> <adminAPIKey> --tag 'news' --new_author 'michael'

# For posts that have 'richard' as an author and with the tag 'news', add 'michael' as an author
gctools add-author <apiURL> <adminAPIKey> --author 'richard' --tag 'news' --new_author 'michael'
```


### change-visibility-posts

Change the visibility of posts

```sh
# See all available options
gctools change-visibility-posts --help

# Change the posts that are currently public to be members-only
gctools change-visibility-posts <apiURL> <adminAPIKey> --visibility 'public' --new_visibility 'members'

# Change the posts that are currently members-only to be paid-members only
gctools change-visibility-posts <apiURL> <adminAPIKey> --visibility 'members' --new_visibility 'paid'

# Change the posts tagged with 'news' to be paid-members only
gctools change-visibility-posts <apiURL> <adminAPIKey> --tag 'news' --new_visibility 'paid'

# Change the posts tagged with 'news', and written by 'jane' to be paid-members only
gctools change-visibility-posts <apiURL> <adminAPIKey> --tag 'news' --author 'jane' --new_visibility 'paid'
```


### change-visibility-pages

Change the visibility of pages

```sh
# See all available options
gctools change-visibility-pages --help

# Change the pages that are currently public to be members-only
gctools change-visibility-pages <apiURL> <adminAPIKey> --visibility 'public' --new_visibility 'members'

# Change the pages that are currently members-only to be paid-members only
gctools change-visibility-pages <apiURL> <adminAPIKey> --visibility 'members' --new_visibility 'paid'

# Change the pages tagged with 'news' to be paid-members only
gctools change-visibility-pages <apiURL> <adminAPIKey> --tag 'news' --new_visibility 'paid'

# Change the pages tagged with 'news', and written by 'jane' to be paid-members only
gctools change-visibility-pages <apiURL> <adminAPIKey> --tag 'news' --author 'jane' --new_visibility 'paid'
```


### change-status

Change the status of posts

```sh
# See all available options
gctools change-status --help

# Change the posts that are currently drafts to be public
gctools change-status <apiURL> <adminAPIKey> --status 'draft' --new_status 'published'

# Change the posts that are currently drafts with the tag `news` to be public
gctools change-status <apiURL> <adminAPIKey> --status 'draft' --tag 'news' --new_status 'published'
```


### change-role

Change the staff user role (requires a staff user token) [Ghost >= 5.2.0]

```sh
# See all available options
gctools change-role <apiURL> <adminAPIKey> --help

# Change all staff users (except the site owner) to have the Contributor role
gctools change-role <apiURL> <adminAPIKey> --newRole 'Contributor'

# Change all staff users who are currently the Editor role to have the Author role
gctools change-role <apiURL> <adminAPIKey> --filterRole 'Editor' --newRole 'Author'
```

### add-member-comp-subscription

Add complimentary subscriptions for members

```sh
# Add a complimentary plan to tier ID abcdtierid1234 that expired on May 4th 2025, but only for members with the label slug 'my-member-label-slug'
gctools add-member-comp-subscription <apiURL> <adminAPIKey> --tierId abcdtierid1234  --expireAt '2025-05-04T00:00:00.000Z' --onlyForLabelSlugs my-member-label-slug
```


### remove-member-comp-subscription

Remove complimentary subscriptions for members

```sh
# Remove a complimentary plan to tier ID abcdtierid1234, but only for members with the label slug 'my-member-label-slug'
gctools remove-member-comp-subscription <apiURL> <adminAPIKey> --tierId abcdtierid1234  --onlyForLabelSlugs my-member-label-slug
```


### add-member-newsletter-subscription

Add subscription for a specific newsletter

```sh
# Add subscription to a specific newsletter to all members
gctools add-member-newsletter-subscription <apiURL> <adminAPIKey> <newsletterID>

# Add subscription to a specific newsletter to all members that have a label slug of 'premium-blog' or 'news'
# Note: Slugs are not the same as names. You can get the label slug by filtering members and checking the URL
gctools add-member-newsletter-subscription <apiURL> <adminAPIKey> <newsletterID> --onlyForLabelSlugs 'premium-blog,news'
```


### change-tags

Takes a CSV file of URLs, tags to add, and tags to delete. For each URL in there, it will delete and add specific tags. 

```sh
# Will add the tags to the end of the tag list
gctools change-tags <apiURL> <adminAPIKey> <csvFile>

# Will use the first tag in the `add_tags` list as the primary tag
gctools change-tags <apiURL> <adminAPIKey> <csvFile> --addAsPrimaryTag true
```

The CSV must follow a specific format:

```csv
url,delete_tags,add_tags
https://example.com/my-post-slug/,Newsletter,"News, Blogs"
... as many rows as needed
```

In this CSV, the first post will have 'Newsletter` removed, and both 'News' & 'Blogs' added to the end the tag list.

If `--addAsPrimaryTag true` is set, 'News' & 'Blogs' will be added to the start of the tag list, making 'News' the new primary tag.


### post-tiers

Adds an additional tier to posts that are already set to show to a specific tier.

```sh
# Will add the tier 5678bcde to all posts that currently also have the tier abcd1234
gctools post-tiers <apiURL> <adminAPIKey> --filterTierId abcd1234 --addTierId 5678bcde

# Will add the tier 5678bcde to all posts that are set to 'Paid-members only'
gctools post-tiers <apiURL> <adminAPIKey> --visibility paid --addTierId 5678bcde
```


### set-template

Set posts to use a specific custom template.

```sh
# Set all posts to use the default template
gctools set-template <apiURL> <adminAPIKey> --templateSlug default

# Set all posts to use the template that has the filename `custom-posts-sidebar.hbs`
gctools set-template <apiURL> <adminAPIKey> --templateSlug custom-posts-sidebar

# Set all posts to use the template that has the filename `custom-posts-sidebar.hbs`, if it has the tag 'news'
gctools set-template <apiURL> <adminAPIKey> --tag 'news' --templateSlug custom-posts-sidebar
```


### page-to-post

Changes a page (or selection of pages) to a post(s).

```sh
# Will change _all_ pages to posts
gctools page-to-post <apiURL> <adminAPIKey>

# Will change a single page to a post
gctools page-to-post <apiURL> <adminAPIKey> --id abcd123480830d8dd2b7652c

# Will change any page with this lat slug to a post
gctools page-to-post <apiURL> <adminAPIKey> --tagSlug 'my-tag-slug'
```


## Develop

* `commands` handles the traditional CLI input
* `prompts` handles the interactive CLI input
* `tasks` is the tasks run by both the CLI and interactive tool


# Copyright & License

Copyright (c) 2013-2025 Ghost Foundation - Released under the [MIT license](LICENSE).
