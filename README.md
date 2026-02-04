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
* [`json-clean`](#json-clean)
* [`fetch-assets`](#fetch-assets)
* [`dedupe-members-csv`](#dedupe-members-csv)
* [`compare-member-csv`](#compare-member-csv)
* [`random-posts`](#random-posts)
* [`delete-posts`](#delete-posts)
* [`delete-pages`](#delete-pages)
* [`add-tags`](#add-tags)
* [`combine-tags`](#combine-tags)
* [`add-preview`](#add-preview)
* [`delete-tags`](#delete-tags)
* [`delete-labels`](#delete-labels)
* [`delete-empty-tags`](#delete-empty-tags)
* [`find-replace`](#find-replace)
* [`change-author`](#change-author)
* [`add-author`](#add-author)
* [`change-visibility-posts`](#change-visibility-posts)
* [`change-visibility-pages`](#change-visibility-pages)
* [`change-status`](#change-status)
* [`change-role`](#change-role)
* [`comment-notifications`](#comment-notifications)
* [`add-member-comp-subscription`](#add-member-comp-subscription)
* [`add-member-comp-from-csv`](#add-member-comp-from-csv)
* [`remove-member-comp-subscription`](#remove-member-comp-subscription)
* [`add-member-newsletter-subscription`](#add-member-newsletter-subscription)
* [`change-tags`](#change-tags)
* [`post-tiers`](#post-tiers)
* [`set-template`](#set-template)
* [`page-to-post`](#page-to-post)
* [`content-stats`](#content-stats)
* [`get-posts`](#get-posts)
* [`set-featured-images`](#set-featured-images)
* [`clean-slugs`](#clean-slugs)
* [`set-podcast`](#set-podcast)
* [`letterdrop-stripe`](#letterdrop-stripe)

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


### json-clean

Clean a JSON file so it only contains content.

```sh
# See all available options
gctools json-clean --help

# Clean a JSON file to only contain content
gctools json-clean /path/to/file.json
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


### compare-member-csv

Compare two member CSV files to identify new, updated, and unsubscribed members. This tool is useful for tracking membership changes between two exports.

The tool will generate up to three output files in the same directory as your source files:
- `new.csv` - Members present in the new file but not in the old file (new signups)
- `unsubscribed.csv` - Members present in the old file but not in the new file (cancellations/unsubscribes)
- `updated.csv` - Members present in both files but with changes (e.g., new Stripe customer ID, label changes, subscription status changes)

```sh
# See all available options
gctools compare-member-csv --help

# Compare two member CSV files
gctools compare-member-csv <oldFile> <newFile>

# Compare with verbose output
gctools compare-member-csv <oldFile> <newFile> --verbose

# Example: Compare January and February exports
gctools compare-member-csv /path/to/members-jan-2024.csv /path/to/members-feb-2024.csv
```

The comparison uses email addresses as the unique identifier. All columns from the original CSV files are preserved in the output files. The tool handles case-insensitive email matching and ignores entries with missing or empty email fields.

**What counts as an update:**
- Changes to Stripe customer ID
- Changes to subscription status (subscribed_to_emails)
- Changes to complimentary plan status
- Changes to labels

**Output:**
- The tool displays statistics showing how many new, updated, and unsubscribed members were found
- Output files are only created when there are differences to report
- Files are saved in the same directory as the old/first CSV file


### random-posts

Insert a number of posts with random content.

```sh
# See all available options
gctools random-posts --help

# Create and insert 10 random posts
gctools random-posts <apiURL> <adminAPIKey>

# Create and insert 3000 random draft posts with 2 tags visible to members only, written by a specific author
gctools random-posts <apiURL> <adminAPIKey> --count 3000 --tag '#random,New World' --status draft --visibility members --author person@dummyemail.com

# Customize the content length and structure
gctools random-posts <apiURL> <adminAPIKey> --count 50 --contentUnit paragraphs --contentCount 5 --titleMinLength 2 --titleMaxLength 6
```

**Available options:**
- `--count` (default: 10): Number of posts to create
- `--titleMinLength` (default: 3): Minimum words in title
- `--titleMaxLength` (default: 8): Maximum words in title
- `--contentUnit` (default: paragraphs): Content unit type (paragraphs, sentences, words)
- `--contentCount` (default: 10): Number of content units per post
- `--paragraphLowerBound` (default: 3): Min sentences per paragraph
- `--paragraphUpperBound` (default: 7): Max sentences per paragraph
- `--sentenceLowerBound` (default: 3): Min words per sentence
- `--sentenceUpperBound` (default: 15): Max words per sentence
- `--author`: Author email address
- `--tag` (default: #gctools): Comma separated list of tags
- `--status` (default: published): Post status (published, draft, scheduled, sent)
- `--visibility` (default: public): Post visibility (public, members, paid)
- `--delayBetweenCalls` (default: 50): Delay between API calls in ms


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

# Add a divider to all posts as position 2, and overwrites if a divider already exists
gctools add-preview <apiURL> <adminAPIKey> --previewPosition 2 --overwrite

# Add a divider to all posts 50% through the post
gctools add-preview <apiURL> <adminAPIKey> --previewPosition 50%

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

# Delete tags with no associated posts
gctools delete-empty-tags <apiURL> <adminAPIKey>

# Delete tags with 3 or fewer associated posts
gctools delete-empty-tags <apiURL> <adminAPIKey> --maxPostCount 3

# Custom delay between API calls
gctools delete-empty-tags <apiURL> <adminAPIKey> --maxPostCount 5 --delayBetweenCalls 100
```

**Available options:**
- `--maxPostCount` (default: 0): Maximum number of associated posts a tag can have to be deleted
- `--delayBetweenCalls` (default: 50): Delay between API calls in ms


### find-replace

Find & replace strings of text within Ghost posts

```sh
# See all available options
gctools find-replace --help

# Replace a string but only in the `mobiledoc` and `title`
gctools find-replace <apiURL> <adminAPIKey> --find 'Old text' --replace 'New text' --where mobiledoc,title

# Replace a string in all available fields
gctools find-replace <apiURL> <adminAPIKey> --find 'Old text' --replace 'New text' --where all

# Custom delay between API calls
gctools find-replace <apiURL> <adminAPIKey> --find 'Old text' --replace 'New text' --delayBetweenCalls 100
```

Available `where` fields are:

* `all`
* `mobiledoc` (default)
* `html`
* `lexical`
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

### comment-notifications

Manage comment notification settings for staff users. Backup current settings to CSV, restore from a backup, or enable/disable notifications for all staff.

```sh
# See all available options
gctools comment-notifications --help

# Backup current settings to CSV (no changes made)
gctools comment-notifications <apiURL> <adminAPIKey> --backup ./backup.csv

# Backup settings, then disable notifications for all staff
gctools comment-notifications <apiURL> <adminAPIKey> --backup ./backup.csv --value false

# Disable notifications for all staff (no backup)
gctools comment-notifications <apiURL> <adminAPIKey> --value false

# Enable notifications for all staff
gctools comment-notifications <apiURL> <adminAPIKey> --value true

# Restore settings from a previous backup
gctools comment-notifications <apiURL> <adminAPIKey> --restore ./backup.csv
```

The backup CSV contains columns: `id`, `email`, `name`, `slug`, `comment_notifications`

**Available options:**
- `--backup`: Path to save backup CSV before making changes
- `--restore`: Path to CSV file to restore settings from
- `--value`: Enable (true) or disable (false) comment notifications
- `--delayBetweenCalls` (default: 1000): Delay between API calls in ms

**Notes:**
- The Owner role is always excluded from changes
- Cannot combine `--restore` with `--value` (restore uses values from the CSV)
- Using `--backup` without `--value` only creates a backup (no updates)


### add-member-comp-subscription

Add complimentary subscriptions for members

```sh
# Add a complimentary plan to tier ID abcdtierid1234 that expired on May 4th 2025, but only for members with the label slug 'my-member-label-slug'
gctools add-member-comp-subscription <apiURL> <adminAPIKey> --tierId abcdtierid1234  --expireAt '2025-05-04T00:00:00.000Z' --onlyForLabelSlugs my-member-label-slug

# Custom delay between API calls
gctools add-member-comp-subscription <apiURL> <adminAPIKey> --tierId abcdtierid1234 --delayBetweenCalls 200
```

**Available options:**
- `--tierId`: The ID for the tier to add the subscription to
- `--expireAt`: Expiration date in ISO format
- `--onlyForLabelSlugs`: Filter by member label slugs
- `--delayBetweenCalls` (default: 100): Delay between API calls in ms


### add-member-comp-from-csv

Add complimentary subscriptions for members from a CSV file

```sh
# See all available options
gctools add-member-comp-from-csv --help

# Add complimentary subscriptions from a CSV file
gctools add-member-comp-from-csv <apiURL> <adminAPIKey> <csvPath>

# Custom delay between API calls
gctools add-member-comp-from-csv <apiURL> <adminAPIKey> <csvPath> --delayBetweenCalls 200
```

The CSV file must have columns: `email`, `expireAt`, `tierName`

**Available options:**
- `--delayBetweenCalls` (default: 100): Delay between API calls in ms


### remove-member-comp-subscription

Remove complimentary subscriptions for members

```sh
# Remove a complimentary plan to tier ID abcdtierid1234, but only for members with the label slug 'my-member-label-slug'
gctools remove-member-comp-subscription <apiURL> <adminAPIKey> --tierId abcdtierid1234  --onlyForLabelSlugs my-member-label-slug

# Custom delay between API calls
gctools remove-member-comp-subscription <apiURL> <adminAPIKey> --tierId abcdtierid1234 --delayBetweenCalls 200
```

**Available options:**
- `--tierId`: The ID for the tier to remove the subscription from
- `--onlyForLabelSlugs`: Filter by member label slugs
- `--delayBetweenCalls` (default: 100): Delay between API calls in ms


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


### content-stats

Display statistics about the content in your Ghost site.

```sh
# See all available options
gctools content-stats --help

# Show basic content statistics
gctools content-stats <apiURL> <adminAPIKey>

# Show content statistics and list authors with no posts
gctools content-stats <apiURL> <adminAPIKey> --listEmptyAuthors
```

This command displays:
- Total number of posts, pages, authors, tags, and members
- Post status breakdown (published, draft, etc.)
- Visibility breakdown (public, members, paid)
- Author statistics

**Available options:**
- `--listEmptyAuthors`: List authors who have no posts


### get-posts

Retrieve all posts from Ghost (useful for debugging or data export).

```sh
# See all available options
gctools get-posts --help

# Get all posts
gctools get-posts <apiURL> <adminAPIKey>

# Custom delay between API calls
gctools get-posts <apiURL> <adminAPIKey> --delayBetweenCalls 100
```

**Available options:**
- `--delayBetweenCalls` (default: 50): Delay between API calls in ms


### set-featured-images

Set featured images for posts that don't have one by using the first image found in the post content.

```sh
# See all available options
gctools set-featured-images --help

# Set featured images for posts without them
gctools set-featured-images <apiURL> <adminAPIKey>

# Custom delay between API calls
gctools set-featured-images <apiURL> <adminAPIKey> --delayBetweenCalls 100
```

**Available options:**
- `--delayBetweenCalls` (default: 50): Delay between API calls in ms


### clean-slugs

Find and remove alphanumeric IDs from post slugs to make them cleaner and more SEO-friendly.

```sh
# See all available options
gctools clean-slugs --help

# Clean slugs by removing alphanumeric IDs
gctools clean-slugs <apiURL> <adminAPIKey>

# Dry run to see what would be changed without making changes
gctools clean-slugs <apiURL> <adminAPIKey> --dry-run

# Custom delay between API calls
gctools clean-slugs <apiURL> <adminAPIKey> --delayBetweenCalls 100
```

This command identifies and removes alphanumeric ID patterns from post slugs that may have been automatically generated, making the URLs cleaner and more human-readable.

**Available options:**
- `--dry-run`: Show what would be changed without making actual changes
- `--delayBetweenCalls` (default: 50): Delay between API calls in ms


### set-podcast

Set Facebook description for podcast posts using the first audio source URL found in the post content.

```sh
# See all available options
gctools set-podcast --help

# Set Facebook descriptions for podcast posts
gctools set-podcast <apiURL> <adminAPIKey>

# Custom delay between API calls
gctools set-podcast <apiURL> <adminAPIKey> --delayBetweenCalls 100
```

This command automatically finds the first audio element in post content and uses its source URL to populate the Facebook description field, which is useful for Ghost's [podcast workaround](https://ghost.org/tutorials/custom-rss-feed)

**Available options:**
- `--delayBetweenCalls` (default: 50): Delay between API calls in ms


### letterdrop-stripe

Add Stripe customer IDs to Letterdrop subscriber export (Beta feature).

```sh
# See all available options
gctools letterdrop-stripe --help

# Combine Letterdrop and Stripe data
gctools letterdrop-stripe <letterdropCSV> <stripeCSV>

# Skip writing CSV files
gctools letterdrop-stripe <letterdropCSV> <stripeCSV> --writeCSVs false
```

This is a beta feature for combining Letterdrop subscriber data with Stripe customer information.

**Available options:**
- `--writeCSVs` (default: true): Whether to create new CSV files


## Develop

* `commands` handles the traditional CLI input
* `prompts` handles the interactive CLI input
* `tasks` is the tasks run by both the CLI and interactive tool

## Tests

* `yarn test` to run all tests and linting
* `yarn test:only` to only run tests
* `yarn test:only -- ./test/my-file.test.js` to only run a specific file
* `yarn lint` to run linting

# Copyright & License

Copyright (c) 2013-2026 Ghost Foundation - Released under the [MIT license](LICENSE).
