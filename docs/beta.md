# Beta commands

Experimental features that may change or be promoted to another group.
Expect rough edges and check the output carefully.

> `gctools <command> --help` is always authoritative for the current flags and defaults.

## json-clean

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
- `-V --verbose` (default: true): Show verbose output
