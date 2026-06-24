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
* [`seed-demo`](#seed-demo)
* [`delete-posts`](#delete-posts)
* [`delete-pages`](#delete-pages)
* [`add-tags`](#add-tags)
* [`remove-tags`](#remove-tags)
* [`combine-tags`](#combine-tags)
* [`inline-media`](#inline-media)
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
* [`clean-staff-slugs`](#clean-staff-slugs)
* [`comment-notifications`](#comment-notifications)
* [`add-member-comp-subscription`](#add-member-comp-subscription)
* [`add-member-comp-from-csv`](#add-member-comp-from-csv)
* [`remove-member-comp-subscription`](#remove-member-comp-subscription)
* [`add-member-newsletter-subscription`](#add-member-newsletter-subscription)
* [`member-newsletter-backup`](#member-newsletter-backup)
* [`split-members`](#split-members)
* [`add-label-to-members`](#add-label-to-members)
* [`change-tags`](#change-tags)
* [`post-tiers`](#post-tiers)
* [`set-template`](#set-template)
* [`set-canonical-url`](#set-canonical-url)
* [`page-to-post`](#page-to-post)
* [`content-stats`](#content-stats)
* [`get-posts`](#get-posts)
* [`set-featured-images`](#set-featured-images)
* [`clean-slugs`](#clean-slugs)
* [`set-podcast`](#set-podcast)
* [`update-posts-from-json`](#update-posts-from-json)

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

Output files are saved in a folder named after the source file. For example, splitting `big-file.json` with `--M 50` produces:

```
big-file/
  big-file-posts-00.json
  big-file-posts-01.json
  ...
```

```sh
# See all available options
gctools json-split --help

# Split a JSON file into as many files needed for them to have a maximum of 50 posts per file
gctools json-split /path/to/big-file.json --M 50
```


### json-clean

Clean a JSON file so it only contains content. Optionally connect to a target Ghost site to automatically match and update user IDs, slugs, names, and emails by comparing against existing Ghost users (matched by email address). Users not found in Ghost can still be updated manually via interactive prompts.

```sh
# See all available options
gctools json-clean --help

# Clean a JSON file to only contain content
gctools json-clean /path/to/file.json

# Clean a JSON file and auto-update users from a Ghost site
gctools json-clean /path/to/file.json --ghostApiUrl https://example.ghost.io --ghostAdminKey 1234:abcd
```

**Available options:**
- `--ghostApiUrl`: Ghost site URL to fetch existing users (e.g. https://example.ghost.io)
- `--ghostAdminKey`: Ghost Admin API key to authenticate with Ghost (format: id:secret)


### fetch-assets

Download all available assets from a valid Ghost JSON file create a JSON file with updated image references

```sh
# See all available options
gctools fetch-assets --help

# Fetch assets from a valid Ghost JSON file, using `https://example.com` to resolve relative URLs
gctools fetch-assets /path/to/file.json --url https://example.com
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


### seed-demo

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
- `--count` (default: 10): Number of demo posts to create
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

> **Asset licensing:** None of the seeded media requires attribution.
> - **Images** come from [Lorem Picsum](https://picsum.photos/), drawn from an Unsplash pool collected under CC0 (public domain), so no credit is required. Note this is "CC0-era" Unsplash content — fine for placeholders and demos, but source properly-licensed originals if you need production brand imagery.
> - **Video & photos** from [lorem.media](https://lorem.media/) use the [Pexels](https://www.pexels.com/license/) and [Pixabay](https://pixabay.com/service/license-summary/) licenses — free for commercial use, attribution not required (only appreciated).
> - **Audio** from lorem.media comes from the Internet Archive 78rpm collection and is public domain (recordings from 1925 or earlier).
>
> lorem.media exposes optional per-asset attribution in its response headers (`X-Attribution`, `X-Source`, `X-Source-Url`) and via its `/v2/info/...` JSON endpoint if you ever want to surface credits, but it is not a licensing requirement. As with any random placeholder media, review the generated assets before using a site for a public demo.


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


### remove-tags

Remove tags from specific posts and pages with a specific set of filters

```sh
# See all available options
gctools remove-tags --help

# Remove 'Legacy' tag from all posts and pages
gctools remove-tags <apiURL> <adminAPIKey> --remove_tags 'Legacy'

# Remove multiple tags from posts only
gctools remove-tags <apiURL> <adminAPIKey> --remove_tags 'Legacy, Old Tag' --type posts

# Remove tags from posts published before a specific date
gctools remove-tags <apiURL> <adminAPIKey> --remove_tags 'Legacy' --before-date 2023-01-01

# Remove tags from posts with specific visibility
gctools remove-tags <apiURL> <adminAPIKey> --remove_tags 'Draft' --visibility members

# Remove tags from posts by specific author
gctools remove-tags <apiURL> <adminAPIKey> --remove_tags 'Newsletter' --author 'john-doe'

# Remove tags from posts that have specific existing tags
gctools remove-tags <apiURL> <adminAPIKey> --remove_tags 'Legacy' --tag 'old-content, archived'

# Remove tags from posts with date range filtering
gctools remove-tags <apiURL> <adminAPIKey> --remove_tags 'Old' --before-date 2023-01-01 --after-date 2022-01-01
```

**Interactive Mode:**
The interactive mode provides a user-friendly interface with searchable tag selection, date pickers, and all filtering options. Use `gctools i` and select "Remove tags from posts and pages".


### combine-tags

Merge one tag into another. All posts with Tag B will have it replaced with Tag A at the same position. If a post already has both tags, Tag B is simply removed. Tag A is preserved in its original position.

```sh
gctools combine-tags <apiURL> <adminAPIKey> --tagA <slug-to-keep> --tagB <slug-to-remove>
```

For example, to merge the `newsletter` tag into `articles`:

```sh
gctools combine-tags <apiURL> <adminAPIKey> --tagA articles --tagB newsletter
```


### inline-media

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
- `--assetDomains`: Comma separated list of domains to process media from
- `--dryRun`: Show what would be processed without downloading or uploading
- `-V --verbose`: Show verbose output (lists URLs found per post)
- `--delayBetweenCalls` (default: 50): Delay between API calls in ms


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

# Replace a string without creating post revisions
gctools find-replace <apiURL> <adminAPIKey> --find 'Old text' --replace 'New text' --no-saveRevision
```

Use `-V` (`--verbose`) for detailed output showing which fields matched or were replaced in each post.

By default, `--saveRevision` is enabled, which creates a post revision for each edited post (lexical posts only). Use `--no-saveRevision` to disable this.

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

### clean-staff-slugs

Find staff user slugs that end with a Ghost ID suffix, such as `first-last-6a32d1c818627a48420e689d`, and remove the suffix when the cleaned slug is safe to use.

The tool fetches all staff users, checks whether the cleaned slug already exists, and only updates users where the cleaned slug is unique. If `first-last` already exists, or multiple ID-suffixed staff users would collapse to `first-last`, those users are skipped.

```sh
# See all available options
gctools clean-staff-slugs --help

# Preview what would be changed without making updates
gctools clean-staff-slugs <apiURL> <adminAPIKey> --dry-run

# Clean safe staff user slugs
gctools clean-staff-slugs <apiURL> <adminAPIKey>

# Custom delay between API calls
gctools clean-staff-slugs <apiURL> <adminAPIKey> --delayBetweenCalls 100
```

The interactive mode also supports this tool via `gctools i` and uses the same saved/manual Ghost Admin authentication prompts as the other API tools.

**Available options:**
- `--dry-run`: Show what would be changed without making actual changes
- `--delayBetweenCalls` (default: 50): Delay between API calls in ms

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


### member-newsletter-backup

Backup and restore member newsletter preferences. This tool allows you to save a snapshot of which newsletters each member is subscribed to, and restore those preferences later.

```sh
# See all available options
gctools member-newsletter-backup --help

# Backup all members' newsletter preferences to CSV
gctools member-newsletter-backup <apiURL> <adminAPIKey> --backup ./backup.csv

# Backup only members with specific labels
gctools member-newsletter-backup <apiURL> <adminAPIKey> --backup ./premium-backup.csv --label premium --label vip

# Preview what would be restored (dry run)
gctools member-newsletter-backup <apiURL> <adminAPIKey> --restore ./backup.csv --dry-run

# Restore newsletter preferences from backup
gctools member-newsletter-backup <apiURL> <adminAPIKey> --restore ./backup.csv
```

The backup CSV contains columns: `id`, `email`, `name`, `newsletter_slugs`

Newsletter slugs are stored as comma-separated values (e.g., `main-newsletter,weekly-digest`), making the file human-readable and portable across Ghost instances.

**Available options:**
- `--backup`: Path to save backup CSV
- `--restore`: Path to CSV file to restore from
- `--dry-run`: Show what would be changed without making changes (restore only)
- `--label`: Filter members by label slug (backup only, can specify multiple)
- `--delayBetweenCalls` (default: 50): Delay between API calls in ms

**Notes:**
- Cannot combine `--backup` with `--restore`
- Members are matched by email address during restore (more reliable than ID across instances)
- Use `--dry-run` before restoring to preview changes


### split-members

Read a members CSV file, sort by `created_at`, and split into two evenly-distributed halves using a zipper pattern (index 0→A, 1→B, 2→A, 3→B…). This produces two balanced groups useful for segmented migrations or A/B campaigns.

```sh
# See all available options
gctools split-members --help

# Split a members CSV file
gctools split-members /path/to/members.csv

# Custom output directory and filename prefix
gctools split-members /path/to/members.csv --output ./output --baseName campaign-members
```

This produces three CSV files:
- `members-all.csv` — all members sorted by `created_at` ascending
- `members-a.csv` — even-index half (0, 2, 4…)
- `members-b.csv` — odd-index half (1, 3, 5…)

Interleaving A and B reconstructs the original sorted order. The CSV columns match whatever is in the input file.

**Available options:**
- `--output` (default: `.`): Output directory for CSV files
- `--baseName` (default: `members`): Filename prefix for output files


### add-label-to-members

Add a label to all members listed in a CSV file, using the Ghost Admin API bulk endpoint. This is useful after `split-members` to apply a label to one of the output groups.

```sh
# See all available options
gctools add-label-to-members --help

# Add a label by name (will look up or create the label)
gctools add-label-to-members https://example.com 1234:abcd /path/to/members-a.csv "Group A"

# Add a label by ID (skips the lookup)
gctools add-label-to-members https://example.com 1234:abcd /path/to/members-a.csv 69bacf7ebd018900018563b5
```

The `<label>` argument can be either a label name or a 24-character hex label ID. Members are matched by their `id` column in the CSV and processed in batches (default 50) using the bulk API endpoint.

**Available options:**
- `--delayBetweenCalls` (default: `50`): Delay between API calls in ms
- `--batchSize` (default: `50`): Number of members to process per API call


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


### set-canonical-url

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
- `--dryRun`: Preview what would change without writing
- `-V --verbose`: Show per-post old → new values (useful with `--dryRun`)
- `--newCanonicalUrl`: URL template, e.g. `'https://example.com/topic/{slug}/'`. Omit to clear `canonical_url` to `null`.
- `--status` (default: all): Post status (`all`, `draft`, `published`)
- `--visibility` (default: all): Post visibility (`all`, `public`, `members`, `paid`)
- `--tag`: Filter by tag slug(s), comma separated
- `--author`: Filter by author slug(s), comma separated
- `--dateRange` (default: all): `all` or `custom`. When `custom`, supply `--dateRangeStart` and `--dateRangeEnd`
- `--dateRangeStart`: Start of date range (YYYY-MM-DD)
- `--dateRangeEnd`: End of date range (YYYY-MM-DD)
- `--delayBetweenCalls` (default: 50): Delay between API calls in ms

**Notes:**
- The `{slug}` placeholder in `--newCanonicalUrl` is replaced with each post's slug; you can place it anywhere in the template (path or query string).
- Posts whose computed new value matches their current `canonical_url` are skipped — only posts that would actually change are sent to the API.
- The interactive flow (`gctools i` → "Set canonical URL on posts") provides searchable tag/author pickers, a date range picker, and a clear/rebuild prompt.


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


### update-posts-from-json

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

# Custom delay between API calls
gctools update-posts-from-json <apiURL> <adminAPIKey> /path/to/export.json --fields 'title' --delayBetweenCalls 100
```

The JSON file should be in the standard Ghost export format (`{db: [{data: {posts: [...]}}]}`).

**Available fields:** `title`, `slug`, `html`, `lexical`, `feature_image`, `feature_image_alt`, `feature_image_caption`, `custom_excerpt`, `meta_title`, `meta_description`, `og_title`, `og_description`, `og_image`, `twitter_title`, `twitter_description`, `twitter_image`, `status`, `visibility`, `canonical_url`, `codeinjection_head`, `codeinjection_foot`

**Available options:**
- `--fields`: Comma-separated list of fields to update (required)
- `--slug`: Only update the post with this slug (fetches just that one post from Ghost)
- `--dryRun`: Preview what would be changed without making any updates
- `--delayBetweenCalls` (default: 50): Delay between API calls in ms


### export-comments

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
