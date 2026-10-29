# Staff commands

Staff user operations via the Ghost Admin API — roles, slugs, notification
preferences, bios, and staff cleanup. Some of these require a staff access token.

> `gctools <command> --help` is always authoritative for the current flags and defaults.

## change-role

Change the staff user role (requires a staff user token) [Ghost >= 5.2.0]

```sh
# See all available options
gctools change-role <apiURL> <adminAPIKey> --help

# Change all staff users (except the site owner) to have the Contributor role
gctools change-role <apiURL> <adminAPIKey> --newRole 'Contributor'

# Change all staff users who are currently the Editor role to have the Author role
gctools change-role <apiURL> <adminAPIKey> --filterRole 'Editor' --newRole 'Author'
```

**Available options:**
- `--filterRole`: Comma-separated list of roles to change
- `--newRole`: The new role name (`Contributor`, `Author`, `Editor`, `Administrator`)
- `--delayBetweenCalls` (default: 1000): Delay between API calls in ms
- `-V --verbose` (default: false): Show verbose output

## clean-staff-slugs

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
- `--dry-run` (default: false): Show what would be changed without making actual changes
- `--delayBetweenCalls` (default: 50): Delay between API calls in ms
- `-V --verbose` (default: false): Show verbose output

## comment-notifications

Manage comment and membership notification settings for staff users. Backup current settings to CSV, restore from a backup, or enable/disable comment notifications for all staff. Bulk updates also disable free-member signup, paid-subscription cancellation, and paid-subscription start notifications.

```sh
# See all available options
gctools comment-notifications --help

# Backup current settings to CSV (no changes made)
gctools comment-notifications <apiURL> <adminAPIKey> --backup ./backup.csv

# Backup settings, then disable notifications for all staff
gctools comment-notifications <apiURL> <adminAPIKey> --backup ./backup.csv --value false

# Disable notifications for all staff (no backup)
gctools comment-notifications <apiURL> <adminAPIKey> --value false

# Enable comment notifications for all staff (membership notifications remain disabled)
gctools comment-notifications <apiURL> <adminAPIKey> --value true

# Restore settings from a previous backup
gctools comment-notifications <apiURL> <adminAPIKey> --restore ./backup.csv
```

The backup CSV contains columns: `id`, `email`, `name`, `slug`, `comment_notifications`, `free_member_signup_notification`, `paid_subscription_canceled_notification`, `paid_subscription_started_notification`

**Available options:**
- `--backup`: Path to save backup CSV before making changes
- `--restore`: Path to CSV file to restore settings from
- `--value`: Enable (true) or disable (false) comment notifications; the three membership notification settings are always disabled
- `--delayBetweenCalls` (default: 1000): Delay between API calls in ms
- `-V --verbose` (default: false): Show verbose output

**Notes:**
- The Owner role is always excluded from changes
- Cannot combine `--restore` with `--value` (restore uses values from the CSV)
- Using `--backup` without `--value` only creates a backup (no updates)
- Backups created before the membership notification columns were added can still be restored; missing settings are left unchanged

## delete-staff-users

Permanently delete staff users in selected roles when they have no posts or pages. You can optionally limit the operation to staff whose email has an exact domain. The site owner and the staff user whose token is running the command are always protected. A [staff access token](https://docs.ghost.org/admin-api#staff-access-token-authentication) with permission to delete the selected users is required; an integration Admin API key will be rejected.

The command treats Ghost's authenticated `count.posts` value as the combined post/page count. If that count is missing, the staff user is skipped. Every user is fetched and checked again immediately before deletion.

```sh
# See all available options
gctools delete-staff-users --help

# Preview content-free Contributors and Authors
gctools delete-staff-users <apiURL> <staffAccessToken> --roles 'Contributor,Author' --dry-run

# Permanently delete the eligible staff users
gctools delete-staff-users <apiURL> <staffAccessToken> --roles 'Contributor,Author' --yes

# Only delete eligible staff whose email ends with @example.com
gctools delete-staff-users <apiURL> <staffAccessToken> --roles 'Contributor,Author' --email-domain 'example.com' --yes

# Show every eligible and skipped staff user
gctools delete-staff-users <apiURL> <staffAccessToken> --roles 'Contributor' --dry-run --verbose
```

The interactive mode also supports this tool via `gctools i`. It reuses saved/manual credentials, defaults to preview, and asks for confirmation before deletion.

**Available options:**

- `--roles`: Required comma-separated list of roles to delete; each value must be `Contributor`, `Author`, `Editor`, or `Administrator`
- `--email-domain`: Only delete staff whose email ends with this exact domain; accepts `example.com` or `@example.com`
- `--dry-run` (default: false): Preview eligible staff users without deleting anything
- `--yes` (default: false): Confirm permanent deletion; cannot be combined with `--dry-run`
- `--delayBetweenCalls` (default: 200): Delay between deletion attempts in ms
- `-V --verbose` (default: false): Show every eligible and skipped staff user

## update-staff-bio

Fill empty staff bios from a CSV file with `slug` and `bio` columns. Staff are matched by their exact slug; existing non-empty bios are preserved. Blank CSV bios are ignored, and bios longer than 250 characters after trimming are skipped.

```csv
slug,bio
jane-doe,"Writer, editor and photographer."
john-smith,Contributor covering technology.
```

```sh
# See all available options
gctools update-staff-bio --help

# Fill empty staff bios using the CSV
gctools update-staff-bio <apiURL> <adminAPIKey> ./staff-bios.csv

# Show individual row results and set the delay between updates
gctools update-staff-bio <apiURL> <adminAPIKey> ./staff-bios.csv --verbose --delayBetweenCalls 200

# Match CSV values such as t-s to staff emails such as t-s@example.com
gctools update-staff-bio <apiURL> <adminAPIKey> ./staff-bios.csv --email-domain example.com
```

With `--email-domain`, the CSV's `slug` column supplies the part before `@`, and matching uses the complete email address instead of the user's slug. For example, `t-s` matches `t-s@example.com` even if that user's slug is different. Email matching is case-insensitive and restricted to the exact domain: other domains and subdomains are excluded. The domain also accepts a leading `@`, as in `--email-domain @example.com`. Without this option, matching uses the exact user slug.

The summary reports updated users, existing bios, overlong bios, unmatched slugs, and errors. Skipped overlong bios are exported to `bios-too-long.csv` and unmatched users to `bios-not-found.csv`, beside the input CSV. Missing slugs and API failures are reported as errors; processing continues through the remaining rows before the command exits unsuccessfully.

**Available options:**

- `--email-domain`: Match CSV `slug` values to email prefixes at this exact domain instead of user slugs
- `--delayBetweenCalls` (default: 100): Delay between successful API updates in ms
- `-V --verbose` (default: false): Show individual row results
