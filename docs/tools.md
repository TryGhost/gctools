# Tools commands

File utilities that work on local files — zip archives and Ghost JSON exports.
These commands do not connect to a Ghost site.

> `gctools <command> --help` is always authoritative for the current flags and defaults.

## fetch-assets

Download all available assets from a valid Ghost JSON file create a JSON file with updated image references

```sh
# See all available options
gctools fetch-assets --help

# Fetch assets from a valid Ghost JSON file, using `https://example.com` to resolve relative URLs
gctools fetch-assets /path/to/file.json --url https://example.com
```

**Available options:**
- `--url`: Provide a base URL (without trailing slash) to resolve relative asset URLs
- `--sizeLimit`: Assets larger than this size (defined in MB) will be ignored
- `--zip` (default: true): Create a zip file (set to false to skip)
- `-V --verbose` (default: false): Show verbose output

## json-split

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

**Available options:**
- `-M --maxPosts` (default: 500): Maximum number of posts per file
- `-V --verbose` (default: false): Show verbose output

## zip-create

Split a large directory into smaller directories of a defined maximum size and zip each, while maintaining the directory structure.

```sh
# See all available options
gctools zip-create --help

# Split a large directory into as many files needed for them to all be 50mb or below
gctools zip-create /path/to/big-directory -M 50
```

**Available options:**
- `-M --maxSize` (default: 100): Max zip size, in MB
- `-V --verbose` (default: false): Show verbose output

## zip-split

Split a zip file into smaller zip files of a defined maximum size, while maintaining the directory structure.

```sh
# See all available options
gctools zip-split --help

# Split a zip file into as many files needed for them to all be 50mb or below
gctools zip-split /path/to/big-file.zip -M 50
```

**Available options:**
- `-M --maxSize` (default: 100): Max zip size, in MB
- `-V --verbose` (default: false): Show verbose output
