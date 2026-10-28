import fs from 'fs-extra';
import fsUtils from '@tryghost/mg-fs-utils';
import errors from '@tryghost/errors';

// Shared by the tools that delete everything except a list of things to keep (tags, labels).
// A keep value is `{raw, normalised}`: `normalised` is what's compared, `raw` is what reports
// echo back, so a user can find the exact value they gave

const normalise = (value) =>
    String(value ?? '')
        .trim()
        .toLowerCase();

/**
 * Turns a list of strings into deduped keep values, dropping blanks
 *
 * @param {Array<unknown>} values
 * @returns {Array<{raw: string, normalised: string}>}
 */
const keepValuesFrom = (values) => {
    const seen = new Set();
    const keepValues = [];

    (values ?? []).forEach((raw) => {
        const value = normalise(raw);

        if (!value || seen.has(value)) {
            return;
        }

        seen.add(value);
        keepValues.push({ raw: String(raw).trim(), normalised: value });
    });

    return keepValues;
};

/**
 * Takes parsed CSV rows and returns the keep values of the first column
 *
 * @param {Array<object>} rows
 * @returns {Array<{raw: string, normalised: string}>}
 */
const getKeepValues = (rows) => {
    if (!rows || rows.length === 0) {
        return [];
    }

    const column = Object.keys(rows[0])[0];

    return keepValuesFrom(rows.map((row) => row[column]));
};

/**
 * Finds every keep value that names an item by slug and/or name, in keep list order. One
 * item can match several values, e.g. a label's name and its slug, and each of them counts
 * as used
 *
 * @param {{name?: string, slug?: string}} item
 * @param {Array<{raw: string, normalised: string}>} keepValues
 * @param {'slug'|'name'|'either'} matchBy
 * @returns {Array<{matchedBy: 'slug'|'name', csvValue: {raw: string, normalised: string}}>}
 */
const findMatches = (item, keepValues, matchBy) => {
    const itemSlug = normalise(item.slug);
    const itemName = normalise(item.name);
    const matches = [];

    for (const value of keepValues) {
        if (matchBy !== 'name' && value.normalised === itemSlug) {
            matches.push({ matchedBy: 'slug', csvValue: value });
        } else if (matchBy !== 'slug' && value.normalised === itemName) {
            matches.push({ matchedBy: 'name', csvValue: value });
        }
    }

    return matches;
};

/**
 * Reads a single-column CSV of values to keep. The first row is always treated as a header
 *
 * @param {string} csvFile
 * @returns {Promise<{column: string|null, keepValues: Array<{raw: string, normalised: string}>}>}
 * @throws {errors.NotFoundError} when the file doesn't exist
 * @throws {errors.ValidationError} when the file can't be parsed
 */
const readKeepFile = async (csvFile) => {
    if (!(await fs.pathExists(csvFile))) {
        throw new errors.NotFoundError({
            message: `CSV file not found: ${csvFile}`,
        });
    }

    let rows;

    try {
        rows = await fsUtils.csv.parseCSV(csvFile);
    } catch (parseError) {
        throw new errors.ValidationError({
            message: `Failed to parse CSV file: ${parseError.message}`,
        });
    }

    return {
        column: rows.length ? Object.keys(rows[0])[0] : null,
        keepValues: getKeepValues(rows),
    };
};

export { normalise, keepValuesFrom, getKeepValues, findMatches, readKeepFile };
