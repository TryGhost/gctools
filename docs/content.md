# Content commands

Post, page, and tag operations via the Ghost Admin API — tagging, authorship,
visibility, bulk edits, deletions, and content seeding.

> `gctools <command> --help` is always authoritative for the current flags and defaults.

## add-preview

Insert a public preview divider at a specific point, after the `previewPosition` number.

```sh
# Add a divider to all posts after position 2
gctools add-preview <apiURL> <adminAPIKey> --previewPosition 2

# Add a divider to all posts after position 2, and overwrites if a divider already exists
gctools add-preview <apiURL> <adminAPIKey> --previewPosition 2 --overwrite

# Add a divider to all posts 50% through the post
gctools add-preview <apiURL> <adminAPIKey> --previewPosition 50%

# Add a divider to all posts after position 2 for members-only posts
gctools add-preview <apiURL> <adminAPIKey> --visibility members --previewPosition 2

# Add a divider to all posts after position 2 for paid posts
gctools add-preview <apiURL> <adminAPIKey> --visibility paid --previewPosition 2

# Add a divider to all posts after position 2 for paid posts that also have a tag of `hello`
gctools add-preview <apiURL> <adminAPIKey> --visibility paid --tag hello --previewPosition 2

# Add a divider to all posts after position 2 for paid posts that also have a tag of `hello`, and are by written by `harry`
gctools add-preview <apiURL> <adminAPIKey> --visibility paid --tag hello --author harry --previewPosition 2
```

**Available options:**
- `--visibility` (default: all): Post visibility (all, public, members, paid)
- `--tag`: Update content with this tag slug
- `--author`: Update content with this author slug
- `-pp --previewPosition` (default: 2): The card position index the public preview should be inserted after
- `-o --overwrite` (default: false): Overwrite the preview position if one already exists
- `--delayBetweenCalls` (default: 50): Delay between API calls in ms
- `-V --verbose` (default: false): Show verbose output

## add-tags

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

**Available options:**
- `--new_tags`: Comma separated list of tag names to add (not slugs), inside single quotes. i.e. 'New Tag, Podcast'
- `--type` (default: all): Content type (all, posts, pages)
- `--status` (default: all): Post status (all, draft, published)
- `--visibility` (default: all): Select posts with this visibility setting (all, public, members, paid)
- `--tag`: Select posts with these tag slugs, inside single quotes. i.e. 'existing-tag, newsletter'
- `--author`: Select posts with these author slugs, inside single quotes. i.e. 'example-author'
- `--customFilter`: Custom Ghost filter query
- `--delayBetweenCalls` (default: 50): Delay between API calls in ms
- `-V --verbose` (default: false): Show verbose output

## remove-tags

Remove tags from specific posts and pages with a specific set of filters

```sh
# See all available options
gctools remove-tags --help

# Remove 'Legacy' tag from all posts and pages
gctools remove-tags <apiURL> <adminAPIKey> --remove_tags 'Legacy'

# Remove multiple tags from posts only
gctools remove-tags <apiURL> <adminAPIKey> --remove_tags 'Legacy, Old Tag' --type posts

# Remove tags from posts with specific visibility
gctools remove-tags <apiURL> <adminAPIKey> --remove_tags 'Draft' --visibility members

# Remove tags from posts by specific author
gctools remove-tags <apiURL> <adminAPIKey> --remove_tags 'Newsletter' --author 'john-doe'

# Remove tags from posts that have specific existing tags
gctools remove-tags <apiURL> <adminAPIKey> --remove_tags 'Legacy' --tag 'old-content, archived'
```

**Interactive Mode:**
The interactive mode provides a user-friendly interface with searchable tag selection, date pickers, and all filtering options. Use `gctools i` and select "Remove tags from posts and pages".

**Available options:**
- `--remove_tags`: Comma separated list of tag names to remove (not slugs), inside single quotes. i.e. 'Legacy Tag, Old Tag'
- `--type` (default: all): Content type (all, posts, pages)
- `--status` (default: all): Post status (all, draft, published)
- `--visibility` (default: all): Select posts with this visibility setting (all, public, members, paid)
- `--tag`: Select posts with these tag slugs, inside single quotes. i.e. 'existing-tag, newsletter'
- `--author`: Select posts with these author slugs, inside single quotes. i.e. 'example-author'
- `--customFilter`: Custom Ghost filter query
- `--delayBetweenCalls` (default: 50): Delay between API calls in ms
- `-V --verbose` (default: false): Show verbose output

## change-author

Change the author assigned to a post

```sh
# See all available options
gctools change-author --help

# Change the posts written by `richard` and assign to `michael`
gctools change-author <apiURL> <adminAPIKey> --author 'richard' --new_author 'michael'
```

**Available options:**
- `--author`: Current author slug
- `--new_author`: New author slug
- `--tag`: Select posts with these tag slugs, inside single quotes. i.e. 'existing-tag, newsletter'
- `--delayBetweenCalls` (default: 50): Delay between API calls in ms
- `-V --verbose` (default: false): Show verbose output

## add-author

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

**Available options:**
- `--author`: Current author slug
- `--new_author`: New author slug
- `--tag`: Select posts with these tag slugs, inside single quotes. i.e. 'existing-tag, newsletter'
- `--delayBetweenCalls` (default: 50): Delay between API calls in ms
- `-V --verbose` (default: false): Show verbose output

## change-status

Change the status of posts

```sh
# See all available options
gctools change-status --help

# Change the posts that are currently drafts to be public
gctools change-status <apiURL> <adminAPIKey> --status 'draft' --new_status 'published'

# Change the posts that are currently drafts with the tag `news` to be public
gctools change-status <apiURL> <adminAPIKey> --status 'draft' --tag 'news' --new_status 'published'
```

**Available options:**
- `--status` (default: all): Current post status (all, draft, published)
- `--new_status` (default: draft): New status (draft, published)
- `--visibility` (default: all): Post visibility (all, public, members, paid)
- `--tag`: Filter by tag
- `--author`: Filter by author
- `--delayBetweenCalls` (default: 50): Delay between API calls in ms
- `-V --verbose` (default: false): Show verbose output

## change-visibility-posts

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

**Available options:**
- `--visibility` (default: all): Current post visibility (all, public, members, paid)
- `--new_visibility` (default: members): New visibility slug (public, members, paid)
- `--tag`: Filter by tag
- `--author`: Filter by author
- `--delayBetweenCalls` (default: 50): Delay between API calls in ms
- `-V --verbose` (default: false): Show verbose output

## change-visibility-pages

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

**Available options:**
- `--visibility` (default: all): Current page visibility (all, public, members, paid)
- `--new_visibility` (default: members): New visibility slug (public, members, paid)
- `--tag`: Filter by tag
- `--author`: Filter by author
- `--delayBetweenCalls` (default: 50): Delay between API calls in ms
- `-V --verbose` (default: false): Show verbose output

## combine-tags

Merge one tag into another. All posts with Tag B will have it replaced with Tag A at the same position. If a post already has both tags, Tag B is simply removed. Tag A is preserved in its original position.

```sh
gctools combine-tags <apiURL> <adminAPIKey> --tagA <slug-to-keep> --tagB <slug-to-remove>
```

For example, to merge the `newsletter` tag into `articles`:

```sh
gctools combine-tags <apiURL> <adminAPIKey> --tagA articles --tagB newsletter
```

**Available options:**
- `--tagA`: Slug of the tag to keep
- `--tagB`: Slug of the tag to merge into Tag A and remove
- `--delayBetweenCalls` (default: 50): Delay between API calls in ms
- `-V --verbose` (default: false): Show verbose output

## content-stats

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
- `--listEmptyAuthors` (default: false): List authors who have no posts
- `-V --verbose` (default: false): Show verbose output

## delete-empty-tags

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
- `-V --verbose` (default: false): Show verbose output

## delete-pages

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

**Available options:**
- `--tag`: Delete content with this tag slug
- `--author`: Delete content with this author slug
- `--status` (default: all): Page status (all, draft, published)
- `--delayBetweenCalls` (default: 50): Delay between API calls in ms
- `-V --verbose` (default: false): Show verbose output

## delete-posts

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

**Available options:**
- `--tag`: Delete content with this tag slug
- `--author`: Delete content with this author slug
- `--status` (default: all): Post status (all, draft, published)
- `--delayBetweenCalls` (default: 50): Delay between API calls in ms
- `-V --verbose` (default: false): Show verbose output

## delete-tags

Delete tags, but not the content that uses that tag

```sh
# See all available options
gctools delete-tags --help

# Delete a specific tag or multiple tags
gctools delete-tags <apiURL> <adminAPIKey> --tags hash-gctools, test 1
```

**Available options:**
- `--tags`: Delete content with these tag slugs
- `--delayBetweenCalls` (default: 50): Delay between API calls in ms
- `-V --verbose` (default: false): Show verbose output

## find-replace

Find & replace strings of text within Ghost posts. If `--replace` is omitted, the command runs in dry-run mode and reports the number of matches without making any changes.

```sh
# See all available options
gctools find-replace --help

# Dry run: find matches without replacing anything
gctools find-replace <apiURL> <adminAPIKey> --find 'Old text'

# Dry run with detailed per-post, per-field match report
gctools find-replace <apiURL> <adminAPIKey> --find 'Old text' --where all -V

# Replace a string but only in the `mobiledoc` and `title`
gctools find-replace <apiURL> <adminAPIKey> --find 'Old text' --replace 'New text' --where mobiledoc,title

# Replace a string in all available fields
gctools find-replace <apiURL> <adminAPIKey> --find 'Old text' --replace 'New text' --where all

# Replace a string in all available fields in posts with the `world-news` tag
gctools find-replace <apiURL> <adminAPIKey> --tag world-news --find 'Old text' --replace 'New text' --where all

# Custom delay between API calls
gctools find-replace <apiURL> <adminAPIKey> --find 'Old text' --replace 'New text' --delayBetweenCalls 100
```

Use `-V` (`--verbose`) for detailed output showing which fields matched or were replaced in each post.

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
* `feature_image`
* `codeinjection_head`
* `codeinjection_foot`

**Available options:**
- `--find`: Find
- `--replace`: Replace with (omit to do a dry run)
- `--where` (default: mobiledoc): Where to perform the find & replace (comma separated, eg: mobiledoc,title,meta_title)
- `--tag`: Filter by tag (slug, comma separated for multiple, eg: world-news,weather-reports)
- `--delayBetweenCalls` (default: 50): Delay between API calls in ms
- `-V --verbose` (default: false): Show verbose output

## random-posts

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
- `-C --count` (default: 10): Number of posts to create
- `--titleMinLength` (default: 3): Minimum words in title
- `--titleMaxLength` (default: 8): Maximum words in title
- `--contentUnit` (default: paragraphs): Content unit type (paragraphs, sentences, words)
- `--contentCount` (default: 10): Number of content units per post
- `--paragraphLowerBound` (default: 3): Min sentences per paragraph
- `--paragraphUpperBound` (default: 7): Max sentences per paragraph
- `--sentenceLowerBound` (default: 3): Min words per sentence
- `--sentenceUpperBound` (default: 15): Max words per sentence
- `--author`: Author email address (defaults to who created the API key)
- `--tag` (default: #gctools): Comma separated list of tags
- `--status` (default: published): Post status (published, draft, scheduled, sent)
- `--visibility` (default: public): Post visibility (public, members, paid)
- `--delayBetweenCalls` (default: 50): Delay between API calls in ms
- `-V --verbose` (default: false): Show verbose output

## change-tags

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

**Available options:**
- `--addAsPrimaryTag` (default: false): If enabled, newly added tags will be the primary tag. If not, they will be added last in the list
- `--delayBetweenCalls` (default: 50): Delay between API calls in ms
- `-V --verbose` (default: false): Show verbose output

## post-tiers

Adds an additional tier to posts that are already set to show to a specific tier.

```sh
# Will add the tier 5678bcde to all posts that currently also have the tier abcd1234
gctools post-tiers <apiURL> <adminAPIKey> --filterTierId abcd1234 --addTierId 5678bcde

# Will add the tier 5678bcde to all posts that are set to 'Paid-members only'
gctools post-tiers <apiURL> <adminAPIKey> --visibility paid --addTierId 5678bcde
```

**Available options:**
- `--addTierId` (required): The tier ID that will be added to these posts. i.e. '903456abcd7890efa123bc12'
- `--filterTierId`: Select posts with this tier. i.e. '123456abcd7890efa123bc12'
- `--visibility`: Select posts with this visibility setting (all, public, members, paid)
- `--delayBetweenCalls` (default: 50): Delay between API calls in ms
- `-V --verbose` (default: false): Show verbose output

## page-to-post

Changes a page (or selection of pages) to a post(s).

```sh
# Will change _all_ pages to posts
gctools page-to-post <apiURL> <adminAPIKey>

# Will change a single page to a post
gctools page-to-post <apiURL> <adminAPIKey> --id abcd123480830d8dd2b7652c

# Will change any page with this lat slug to a post
gctools page-to-post <apiURL> <adminAPIKey> --tagSlug 'my-tag-slug'
```

**Available options:**
- `--id`: The ID for the post or page
- `--tagSlug`: Select posts with this tag to change type
- `--delayBetweenCalls` (default: 100): Delay between API calls in ms
- `-V --verbose` (default: false): Show verbose output

## get-posts

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
- `-V --verbose` (default: false): Show verbose output

## set-template

Set posts to use a specific custom template.

```sh
# Set all posts to use the default template
gctools set-template <apiURL> <adminAPIKey> --templateSlug default

# Set all posts to use the template that has the filename `custom-posts-sidebar.hbs`
gctools set-template <apiURL> <adminAPIKey> --templateSlug custom-posts-sidebar

# Set all posts to use the template that has the filename `custom-posts-sidebar.hbs`, if it has the tag 'news'
gctools set-template <apiURL> <adminAPIKey> --tag 'news' --templateSlug custom-posts-sidebar
```

**Available options:**
- `--templateSlug`: The template file name without extension
- `--tag`: Select posts with this tag slug
- `--author`: Select posts with this author slug
- `--status` (default: all): Post status (all, draft, published)
- `--delayBetweenCalls` (default: 50): Delay between API calls in ms
- `-V --verbose` (default: false): Show verbose output

## set-featured-images

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
- `-V --verbose` (default: false): Show verbose output

## set-podcast

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
- `-V --verbose` (default: false): Show verbose output

## set-canonical-url

Clear or rebuild the `canonical_url` field on posts. By default the tool clears `canonical_url` (sets it to `null`), which is useful for removing custom canonical URLs that were imported from another platform. Optionally pass `--newCanonicalUrl` with a URL template — the `{slug}` placeholder is replaced with each post's slug. Posts where the value would not change are skipped automatically.

```sh
# See all available options
gctools set-canonical-url --help

# Clear canonical_url on every post (⚠️ dangerous! Run with --dryRun first)
gctools set-canonical-url <apiURL> <adminAPIKey>

# Preview which posts would have their canonical_url cleared
gctools set-canonical-url <apiURL> <adminAPIKey> --dryRun --verbose

# Clear canonical_url only on posts with a specific tag
gctools set-canonical-url <apiURL> <adminAPIKey> --tag 'imported'

# Clear canonical_url only on published posts by a specific author
gctools set-canonical-url <apiURL> <adminAPIKey> --status published --author 'jane-doe'

# Clear canonical_url on posts published in a custom date range
gctools set-canonical-url <apiURL> <adminAPIKey> --dateRange custom --dateRangeStart 2023-01-01 --dateRangeEnd 2023-12-31

# Rebuild canonical_url to point at a new domain, using {slug} as a placeholder
gctools set-canonical-url <apiURL> <adminAPIKey> --newCanonicalUrl 'https://www.somenewsite.com/topic/{slug}/'

# Rebuild canonical_url for a filtered subset
gctools set-canonical-url <apiURL> <adminAPIKey> --tag 'news' --newCanonicalUrl 'https://www.somenewsite.com/news/{slug}/'
```

**Available options:**
- `--dryRun` (default: false): Preview what would change without writing
- `--newCanonicalUrl`: URL template, e.g. `'https://example.com/topic/{slug}/'`. Omit to clear `canonical_url` to `null`.
- `--status` (default: all): Post status (`all`, `draft`, `published`)
- `--visibility` (default: all): Post visibility (`all`, `public`, `members`, `paid`)
- `--tag`: Filter by tag slug(s), comma separated
- `--author`: Filter by author slug(s), comma separated
- `--dateRange` (default: all): `all` or `custom`. When `custom`, supply `--dateRangeStart` and `--dateRangeEnd`
- `--dateRangeStart`: Start of date range (YYYY-MM-DD)
- `--dateRangeEnd`: End of date range (YYYY-MM-DD)
- `--delayBetweenCalls` (default: 50): Delay between API calls in ms
- `-V --verbose` (default: false): Show per-post old → new values (useful with `--dryRun`)

**Notes:**
- The `{slug}` placeholder in `--newCanonicalUrl` is replaced with each post's slug; you can place it anywhere in the template (path or query string).
- Posts whose computed new value matches their current `canonical_url` are skipped — only posts that would actually change are sent to the API.
- The interactive flow (`gctools i` → "Set canonical URL on posts") provides searchable tag/author pickers, a date range picker, and a clear/rebuild prompt.

## clean-slugs

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
- `--dry-run` (default: false): Show what would be changed without making actual changes
- `--delayBetweenCalls` (default: 50): Delay between API calls in ms
- `-V --verbose` (default: false): Show verbose output

## inline-media

Download external media from posts and pages, re-upload them to Ghost, and update the URLs in the content. Handles image, audio, video, and file cards in both Lexical and Mobiledoc content, gallery cards, and metadata fields (`feature_image`, `og_image`, `twitter_image`). HEIC/HEIF images are automatically converted to JPEG. Media already hosted on the Ghost site is skipped. Processed content is tagged with `#ImagesUploaded` to prevent reprocessing.

Supported file types are routed to the correct Ghost upload endpoint:
- **Images** (`/images/upload/`): JPEG, PNG, GIF, WebP, SVG, ICO, AVIF, HEIC/HEIF
- **Media** (`/media/upload/`): MP4, WebM, OGG, MP3, WAV, M4A
- **Files** (`/files/upload/`): PDF, JSON, XML, RTF, Office documents, OpenDocument formats

When `--assetDomains` is specified, a regex scan also catches file URLs in links (e.g. PDFs in `<a>` tags) that are not inside media cards.

```sh
# Inline all external media across all posts and pages
gctools inline-media <apiURL> <adminAPIKey>

# Only process a single post by slug or ID
gctools inline-media <apiURL> <adminAPIKey> --slug 'my-post-slug'
gctools inline-media <apiURL> <adminAPIKey> --id '69d78ee0149bd000016f2852'

# Only process posts (not pages)
gctools inline-media <apiURL> <adminAPIKey> --type posts

# Only process media from specific domains (also catches files in links)
gctools inline-media <apiURL> <adminAPIKey> --assetDomains 'cdn.example.com, images.example.com'

# Dry run to see what would be processed
gctools inline-media <apiURL> <adminAPIKey> --dryRun

# Dry run with verbose output to see which URLs would be inlined
gctools inline-media <apiURL> <adminAPIKey> --dryRun -V

# Only process published posts by a specific author
gctools inline-media <apiURL> <adminAPIKey> --status published --author 'example-author'

# Only process posts with a specific tag
gctools inline-media <apiURL> <adminAPIKey> --tag 'imported'
```

**Available options:**
- `--slug`: Fetch a single post by its slug
- `--id`: Fetch a single post by its ID
- `--type` (default: all): Content type (all, posts, pages)
- `--status` (default: all): Post status (all, draft, published)
- `--visibility` (default: all): Post visibility (all, public, members, paid)
- `--tag`: Filter by tag slugs (comma separated)
- `--author`: Filter by author slugs (comma separated)
- `--afterAndOnDate`: Select posts published on or after this date (inclusive). Format: YYYY-MM-DD, i.e. '2024-01-01'
- `--beforeAndOnDate`: Select posts published on or before this date (inclusive). Format: YYYY-MM-DD, i.e. '2024-12-31'
- `--assetDomains`: Comma separated list of domains to process media from
- `--dryRun` (default: false): Show what would be processed without downloading or uploading
- `-V --verbose` (default: false): Show verbose output (lists URLs found per post)
- `--delayBetweenCalls` (default: 50): Delay between API calls in ms

## update-posts-from-json

Update live Ghost posts using data from a Ghost export JSON file. Posts are matched by slug, and you choose which fields to update. Only posts with actual changes are modified — unchanged posts are skipped. Changed posts are tagged with an internal `#edited-<timestamp>` tag for easy identification.

```sh
# See all available options
gctools update-posts-from-json --help

# Dry run to preview what would change
gctools update-posts-from-json <apiURL> <adminAPIKey> /path/to/export.json --fields 'title,lexical' --dryRun

# Update title and lexical content from the JSON file
gctools update-posts-from-json <apiURL> <adminAPIKey> /path/to/export.json --fields 'title,lexical'

# Update only a single post by slug
gctools update-posts-from-json <apiURL> <adminAPIKey> /path/to/export.json --fields 'title,lexical' --slug 'my-post-slug'

# Update multiple metadata fields
gctools update-posts-from-json <apiURL> <adminAPIKey> /path/to/export.json --fields 'meta_title,meta_description,og_title,og_description'

# Update feature images
gctools update-posts-from-json <apiURL> <adminAPIKey> /path/to/export.json --fields 'feature_image,feature_image_alt,feature_image_caption'

# Update post authors (matched to existing Ghost users by email)
gctools update-posts-from-json <apiURL> <adminAPIKey> /path/to/export.json --fields 'authors'

# Custom delay between API calls
gctools update-posts-from-json <apiURL> <adminAPIKey> /path/to/export.json --fields 'title' --delayBetweenCalls 100
```

The JSON file should be in the standard Ghost export format (`{db: [{data: {posts: [...]}}]}`).

**Available fields:** `title`, `slug`, `html`, `lexical`, `feature_image`, `feature_image_alt`, `feature_image_caption`, `custom_excerpt`, `meta_title`, `meta_description`, `og_title`, `og_description`, `og_image`, `twitter_title`, `twitter_description`, `twitter_image`, `status`, `visibility`, `canonical_url`, `codeinjection_head`, `codeinjection_foot`, `authors`

**Updating authors:** Include `authors` to set each post's author(s) from the export. Authors are resolved through the export's `posts_authors` → `users` join and matched to existing Ghost users **by email**, so the matching users must already exist on the destination site (this command does not create them) and the export must include the `users` and `posts_authors` data. Author order from the export is preserved (first author = primary), and posts that have no authors in the export are left unchanged.

**Available options:**
- `--fields`: Comma-separated list of fields to update (required, unless `--insertMissing` is set)
- `--slug`: Only update the post with this slug (fetches just that one post from Ghost)
- `--insertMissing` (default: false): Create posts from the JSON that don't exist in Ghost (matched by slug). New posts default to draft and are tagged `#added-<timestamp>`
- `--skipExisting` (default: false): Skip updating posts that already exist in Ghost (typically paired with `--insertMissing`)
- `--dryRun` (default: false): Preview what would be changed without making any updates
- `--delayBetweenCalls` (default: 50): Delay between API calls in ms
- `-V --verbose` (default: false): Show verbose output, including a progress bar while posts are fetched from Ghost

## seed-demo

Seed a Ghost site with rich demo content in one run: posts with feature images and in-post image cards, a distributed tag set, an `/about` page, a "golden" post at `/style-guide`, a navigation menu (Home, About, Style Guide, Author, Collection), and optionally a dummy author attributed across the content.

The Style Guide doubles as a front-end theme stress test. It covers every editor card — header (dark/light/accent/image variants), image (regular/wide/full, linked, no-caption, adjacent), multi-row gallery, audio, video, file download, callout (full colour palette + no-emoji), toggle, bookmark (with thumbnail), button (center/left), product, signup, embed, code block, call-to-action, markdown, HTML and divider — plus the email-only `email` and `email-cta` cards, a full inline-formatting sampler (bold, italic, strikethrough, underline, inline code, highlight, super/subscript, links), heading levels h2–h6, nested lists, a table, and edge cases (long headings/unbroken strings). The paywall (public preview) card is included automatically when the site has members enabled. Card shapes mirror `@tryghost/kg-default-nodes`, so everything remains fully editable in Ghost Admin.

Images are downloaded from [Lorem Picsum](https://picsum.photos/) and re-uploaded to the site so the result is self-contained; the Style Guide's audio and video are sourced from [lorem.media](https://lorem.media/) (all permissively licensed for commercial use). Images, audio and video are chosen at random, so do review these before using the site in public demos.

```sh
# See all available options
gctools seed-demo --help

# Seed 10 posts plus an about page, style guide, and navigation
gctools seed-demo <apiURL> <adminAPIKey>

# Seed 50 posts, feature images on half of them, no in-post image cards
gctools seed-demo <apiURL> <adminAPIKey> --count 50 --featureImages 50% --imageCards false

# Spread post dates across a range (defaults the end date to now)
gctools seed-demo <apiURL> <adminAPIKey> --count 24 --dateStart 2025-01-01 --dateEnd 2025-12-31

# Add a dummy author (requires a staff access token) as primary author on ~40% of posts
gctools seed-demo <apiURL> <staffAccessToken> --addAuthor --authorShare 40

# Seed content and also set navigation automatically (pass an owner/admin staff access token as the key)
gctools seed-demo <apiURL> <staffAccessToken>

# Preview what would be created without writing anything
gctools seed-demo <apiURL> <adminAPIKey> --dryRun
```

> **Navigation & staff access tokens:** Updating the navigation menu writes to Ghost's settings, which integration API keys are not permitted to do. Supply an owner/admin [staff access token](https://docs.ghost.org/admin-api#staff-access-token-authentication) (found on a staff user's profile page, in the same `{id}:{secret}` format) as the `<adminAPIKey>` argument and navigation is written automatically. With an integration key everything else still runs; the navigation step is skipped and the menu JSON is printed for you to paste into Ghost Admin → Settings → Navigation.
>
> **Dummy author & staff access tokens:** `--addAuthor` creates a placeholder staff user (with a hosted profile image and bio) and attributes it to the Style Guide (as a second author) and a random share of posts (as primary author). Creating a staff user uses Ghost's content import endpoint, which only an owner/admin [staff access token](https://docs.ghost.org/admin-api#staff-access-token-authentication) can write to — no invite email is sent. Re-runs reuse the existing author rather than duplicating it. With an integration key the step is skipped and an importable JSON file is printed for you to load via Ghost Admin → Settings → Labs → Import content. A Contributor can be a post's primary author; it just can't publish (the API key does the publishing here).

**Available options:**
- `-C --count` (default: 10): Number of demo posts to create
- `--featureImages` (default: all): `all`, `none`, or a percentage like `50%`
- `--imageCards` (default: true): Insert 0-3 in-post image cards (weighted low, never before the first paragraph)
- `--maxImageCards` (default: 3): Maximum in-post image cards per post
- `--tags` (default: true): Distribute the five fixed tags (lorem, ipsum, dolor, sit, amet) across posts
- `--extraTags` (default: 0): Additional random tags to generate and distribute (max 30)
- `--collectionTag` (default: lorem): Tag whose archive backs the "Collection" nav item
- `--aboutPage` (default: true): Create or overwrite the `/about` page
- `--styleGuide` (default: true): Create the Style Guide post
- `--addAuthor` (default: false): Create a dummy author and attribute it to the Style Guide (second author) and a share of posts (primary author). Requires an owner/admin staff access token; with an integration key the step is skipped and importable JSON is printed
- `--authorShare` (default: 30): Percentage of posts (0-100) on which the dummy author is the primary author
- `--authorName` (default: Sam Example): Display name for the dummy author
- `--authorEmail`: Email for the dummy author (default: derived from the name, e.g. `sam-example@example.com`)
- `--authorRole` (default: Contributor): Role for the dummy author (`Contributor`, `Author`, `Editor`, `Administrator`)
- `--nav` (default: true): Update the navigation menu (requires an owner/admin staff access token; with an integration key the step is skipped and the menu JSON is printed to paste manually)
- `--authorNav` (default: true): Include the "Author" archive link
- `--collectionNav` (default: true): Include the "Collection" archive link
- `--status` (default: published): Status for created posts (published, draft)
- `--visibility` (default: public): Visibility for created posts (public, members, paid)
- `--dateStart`: Distribute post dates from this date (e.g. `2025-01-01`). Posts are spread evenly across the range with random jitter inside each slot, so they look naturally paced rather than clustered. Without it, every post is dated now. (Interactive mode offers "Past year" / "Past month" / "Custom" presets.)
- `--dateEnd` (default: now): End of the post date range; only used with `--dateStart`
- `--dryRun` (default: false): Preview without writing to the site
- `--delayBetweenCalls` (default: 50): Delay between API calls in ms
- `-V --verbose` (default: false): Show verbose output

> **Asset licensing:** None of the seeded media requires attribution.
> - **Images** come from [Lorem Picsum](https://picsum.photos/), drawn from an Unsplash pool collected under CC0 (public domain), so no credit is required. Note this is "CC0-era" Unsplash content — fine for placeholders and demos, but source properly-licensed originals if you need production brand imagery.
> - **Video & photos** from [lorem.media](https://lorem.media/) use the [Pexels](https://www.pexels.com/license/) and [Pixabay](https://pixabay.com/service/license-summary/) licenses — free for commercial use, attribution not required (only appreciated).
> - **Audio** from lorem.media comes from the Internet Archive 78rpm collection and is public domain (recordings from 1925 or earlier).
>
> lorem.media exposes optional per-asset attribution in its response headers (`X-Attribution`, `X-Source`, `X-Source-Url`) and via its `/v2/info/...` JSON endpoint if you ever want to surface credits, but it is not a licensing requirement. As with any random placeholder media, review the generated assets before using a site for a public demo.

## export-comments

Export all comments from a Ghost site as a CSV file. The output is compatible with the [Ghost Comment Importer](https://github.com/TryGhost/comment-importer), making it easy to migrate comments between Ghost sites.

```sh
# See all available options
gctools export-comments --help

# Export all published comments
gctools export-comments <apiURL> <adminAPIKey>

# Export comments with a specific status
gctools export-comments <apiURL> <adminAPIKey> --status all

# Export only hidden comments
gctools export-comments <apiURL> <adminAPIKey> --status hidden

# Verbose output
gctools export-comments <apiURL> <adminAPIKey> -V
```

The exported CSV includes the columns required by the comment importer (`id`, `name`, `email`, `created_at`, `html`, `reply_to`, `post_id`) plus additional reference columns (`post_title`, `post_slug`, `post_url`) for easier review.

The tool first tries the site-wide Admin API comments endpoint (available on newer Ghost versions). If unavailable, it falls back to fetching comments per-post via the public Members API and resolving member emails through the Admin API — making it compatible with Ghost 5.

**Available options:**
- `--status` (default: `published`): Filter by comment status (`all`, `published`, `hidden`)
- `--delayBetweenCalls` (default: 50): Delay between API calls in ms
- `-V --verbose` (default: false): Show verbose output

## keep-tags

Delete every tag that is *not* listed in a CSV of tags to keep. Useful for reconciling a site's tags against a canonical list.

**CSV format:** only the first column is read, and the first row is always treated as a header — whatever it's called. Values are matched ignoring case and surrounding whitespace, and duplicates are collapsed.

By default values are matched against the tag **slug**:

```csv
slug
news
how-to
product-updates
```

Use `--matchBy name` when your list is of human-readable tag **names**:

```csv
name
News
How To
Product Updates
```

Use `--matchBy either` for a list that mixes the two — each value is tried as a slug first, then as a name:

```csv
tag
news
How To
product-updates
```

Since the header name doesn't matter and extra columns are ignored, a CSV exported from somewhere else works as-is, as long as the column you want to match on is first:

```csv
name,slug,post_count
News,news,42
How To,how-to,17
Product Updates,product-updates,8
```

That file matches on `name`, so it needs `--matchBy name` (or `either`). Reorder the columns to match on `slug` instead.

Note that a name and a slug often normalise to the same thing — `News` and `news` both become `news` — so a list of simple one-word names will match on slug without any flag. `--matchBy` only matters for tags whose name differs from its slug, like `How To` vs `how-to`.

A report CSV is always written next to the input CSV, on both dry and real runs. It lists every tag with an `action` of `kept`, `kept_internal`, `would_delete`, `deleted` or `delete_failed`, plus a `not_in_ghost` row for each CSV value that matched no tag.

> **Safety:** internal tags (`#internal`) are never deleted, regardless of the CSV or `--force`. The command also aborts without deleting anything if the CSV yields no values, or if not a single CSV value matches a tag — either almost always means the wrong column or the wrong `--matchBy`.

```sh
# See all available options
gctools keep-tags --help

# Report what would be deleted, without changing anything
gctools keep-tags <apiURL> <adminAPIKey> /path/to/tags.csv --dryRun

# Delete every tag whose slug is not in the CSV
gctools keep-tags <apiURL> <adminAPIKey> /path/to/tags.csv

# Match against tag names instead of slugs
gctools keep-tags <apiURL> <adminAPIKey> /path/to/tags.csv --matchBy name

# Match against either the slug or the name
gctools keep-tags <apiURL> <adminAPIKey> /path/to/tags.csv --matchBy either
```

**Available options:**
- `--dryRun` (default: false): Report which tags would be deleted, without deleting anything
- `--matchBy` (default: `slug`): Match CSV values against the tag `slug`, `name`, or `either`. Note that `either` makes the "nothing matched" safety check much less likely to catch a wrong CSV
- `--force` (default: false): Bypass the safety checks that abort when the CSV is empty or matches no tags. Internal tags are still never deleted
- `--delayBetweenCalls` (default: 50): Delay between API calls in ms
- `-V --verbose` (default: false): Show verbose output
