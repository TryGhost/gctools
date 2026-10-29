# Members commands

Member operations via the Ghost Admin API and member CSV files — complimentary
subscriptions, newsletter preferences, labels, and CSV comparison tools.

> `gctools <command> --help` is always authoritative for the current flags and defaults.

## add-member-comp-subscription

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
- `-V --verbose` (default: false): Show verbose output

## remove-member-comp-subscription

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
- `-V --verbose` (default: false): Show verbose output

## add-member-newsletter-subscription

Add subscription for a specific newsletter

```sh
# Add subscription to a specific newsletter to all members
gctools add-member-newsletter-subscription <apiURL> <adminAPIKey> <newsletterID>

# Add subscription to a specific newsletter to all members that have a label slug of 'premium-blog' or 'news'
# Note: Slugs are not the same as names. You can get the label slug by filtering members and checking the URL
gctools add-member-newsletter-subscription <apiURL> <adminAPIKey> <newsletterID> --onlyForLabelSlugs 'premium-blog,news'
```

**Available options:**
- `--onlyForLabelSlugs`: Optional label to filter members
- `--delayBetweenCalls` (default: 100): Delay between API calls in ms
- `-V --verbose` (default: false): Show verbose output

## dedupe-members-csv

Create new CSV files that only contain new or updated members, by comparing the existing members with the output from the output from [`@tryghost/migrate`](https://github.com/TryGhost/migrate/tree/main/packages/mg-substack-members-csv).

```sh
# See all available options
gctools dedupe-members-csv --help

gctools dedupe-members-csv <existing-members> [new-free] [new-comp] [new-paid]
```

**Available options:**
- `--delayBetweenCalls` (default: 50): Delay between API calls in ms
- `-V --verbose` (default: false): Show verbose output

## compare-member-csv

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

**Available options:**
- `-V --verbose` (default: false): Show verbose output

## delete-labels

Delete member labels: the ones you name, the ones no member has, or all of them. With `--all` or `--unused` you can pass a list of labels to keep. Labels are matched by name or slug, ignoring case.

The tool fetches the labels it needs with their member counts first, and stops if any request fails. With `--labels` it asks Ghost only for the labels you named, unless a name contains a quote or backslash; with `--all` or `--unused` it fetches every label. On SQLite, a name typed in a different case from the label in Ghost may not be found, unless it matches the label's slug. Such a label is reported as not in Ghost, and not deleted. The tool then lists what it would delete and asks you to confirm (default: **No**). There is no flag to skip that prompt. With `--unused`, each label's member count is checked again just before it's deleted, and labels that have gained members are skipped. A report CSV of every deleted, kept, skipped and failed label is written to the folder of `--keepFile`, or to the current folder.

Deleting a label is expensive for Ghost: it loads and detaches the label's members and purges the site cache. Labels are therefore deleted one at a time with a delay between calls. Raise `--concurrency` with care.

```sh
# See all available options
gctools delete-labels --help

# Delete specific labels
gctools delete-labels <apiURL> <adminAPIKey> --labels 'First' 'Second'

# Preview, then delete, every label no member has
gctools delete-labels <apiURL> <adminAPIKey> --unused --dryRun
gctools delete-labels <apiURL> <adminAPIKey> --unused

# Delete every label except the ones listed
gctools delete-labels <apiURL> <adminAPIKey> --all --keep 'VIP' 'Paid'
gctools delete-labels <apiURL> <adminAPIKey> --all --keepFile /path/to/labels-to-keep.csv

# Delete every label
gctools delete-labels <apiURL> <adminAPIKey> --all --force
```

Also available in `gctools i` as **Delete labels**.

**Available options:**
- `--labels`: Names or slugs of the labels to delete
- `--all` (default: false): Delete every label. Requires `--keep`, `--keepFile` or `--force`
- `--unused` (default: false): Delete only labels that no member has
- `--keep`: Names or slugs of labels never to delete. Use with `--all` or `--unused`
- `--keepFile`: Path to a single-column CSV of labels never to delete. The first row is always treated as a header
- `--dryRun` (default: false): Report which labels would be deleted, without prompting or deleting
- `--force` (default: false): Bypass the checks for `--all` without a keep list, and for a keep list that is empty or matches nothing
- `--concurrency` (default: 1): How many labels to delete at once. If a delete fails, deletes already started finish and no new ones start
- `--timeout` (default: 60000): How long to wait for Ghost to answer each request, in ms. Raise it if deleting labels with very many members times out
- `--delayBetweenCalls` (default: 50): Delay between API calls in ms
- `-V --verbose`: List every label to delete, not just the first 20

## add-member-comp-from-csv

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
- `-V --verbose` (default: false): Show verbose output

## member-newsletter-backup

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
- `--dry-run` (default: false): Show what would be changed without making changes (restore only)
- `--label`: Filter members by label slug (backup only, can specify multiple)
- `--delayBetweenCalls` (default: 50): Delay between API calls in ms
- `-V --verbose` (default: false): Show verbose output

**Notes:**
- Cannot combine `--backup` with `--restore`
- Members are matched by email address during restore (more reliable than ID across instances)
- Use `--dry-run` before restoring to preview changes

## split-members

Split members into two evenly-distributed halves, and optionally bulk-label each group. Members can be **fetched live from the Ghost Admin API** (optionally filtered) or read from a **CSV file**. They are sorted by `created_at`, then split using a zipper pattern (index 0→A, 1→B, 2→A, 3→B…), producing two balanced groups useful for segmented migrations or A/B campaigns.

```sh
# See all available options
gctools split-members --help

# Split an existing members CSV file
gctools split-members /path/to/members.csv

# Fetch all members from Ghost, then split
gctools split-members --apiURL https://example.com --adminAPIKey 1234:abcd

# Fetch only the members matching a filter, then split. --filter accepts an NQL
# filter, or a URL pasted straight from the Ghost members screen
# (Admin → Members → set a filter → copy the browser URL)
gctools split-members --apiURL https://example.com --adminAPIKey 1234:abcd --filter "status:free"
gctools split-members --apiURL https://example.com --adminAPIKey 1234:abcd \
  --filter "https://example.com/ghost/#/members?filter=created_at%3A%3C%3D%272026-06-02T03%3A59%3A59.999Z%27%2Bstatus%3Afree"

# Custom output directory and filename prefix
gctools split-members /path/to/members.csv --output ./output --baseName campaign-members

# Split AND bulk-add a label to each group (labels are created if they don't exist)
gctools split-members --apiURL https://example.com --adminAPIKey 1234:abcd --filter "status:free" \
  --addLabels --labelA "Experiment A" --labelB "Experiment B" --chunkSize 100
```

This produces three CSV files:
- `members-all.csv` — all members sorted by `created_at` ascending
- `members-a.csv` — even-index half (0, 2, 4…)
- `members-b.csv` — odd-index half (1, 3, 5…)

Interleaving A and B reconstructs the original sorted order. When fetching from the API, the files use Ghost's native member-export columns (`id`, `email`, `name`, `note`, `subscribed_to_emails`, `complimentary_plan`, `stripe_customer_id`, `created_at`, `deleted_at`, `labels`, `tiers`) so they can be re-imported. When reading a CSV, the columns match whatever is in the input file.

With `--addLabels`, after the split the tool resolves `--labelA`/`--labelB` to label IDs (creating any that don't exist), then bulk-adds label A to group A and label B to group B via the Admin API `members/bulk/` endpoint, in chunks of `--chunkSize` members per request and rate-limited to `--requestsPerSecond` requests per second.

**Available options:**
- `--output` (default: `.`): Output directory for CSV files
- `--baseName` (default: `members`): Filename prefix for output files
- `--apiURL`: URL to your Ghost API (required when no CSV path is given)
- `--adminAPIKey`: Admin API key (required when no CSV path is given)
- `--filter`: Filter members when fetching — an NQL filter (e.g. `status:free`) or a pasted Ghost members URL
- `--addLabels` (default: `false`): After splitting, bulk-add a label to each group
- `--labelA`: Label name (or 24-character hex ID) to add to group A (required with `--addLabels`)
- `--labelB`: Label name (or 24-character hex ID) to add to group B (required with `--addLabels`)
- `--chunkSize` (default: `100`): Members per bulk label request
- `--requestsPerSecond` (default: `5`): Maximum bulk label API requests per second
- `-V --verbose` (default: false): Show verbose output

**Notes:**
- Provide **either** a CSV path **or** `--apiURL` + `--adminAPIKey`. If both are given, the CSV is used.
- `--addLabels` always needs `--apiURL`, `--adminAPIKey`, `--labelA`, and `--labelB` — even when splitting from a CSV (which must contain a member `id` column).
- To label an existing CSV without splitting, use [`add-label-to-members`](#add-label-to-members) instead.

## add-label-to-members

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
- `--batchSize` (default: `50`): Number of members to process per API call
- `--delayBetweenCalls` (default: `50`): Delay between API calls in ms
- `-V --verbose` (default: false): Show verbose output
