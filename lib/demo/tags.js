import {loremIpsum} from 'lorem-ipsum';
import {titleCase} from 'title-case';

// The five fixed tags the demo content is always built around. The first of
// these (`lorem`) is the default "Collection" tag surfaced in navigation.
const FIXED_TAGS = ['lorem', 'ipsum', 'dolor', 'sit', 'amet'];

// Sanity cap so demo sites don't end up tag-spammy. Bump this locally if you
// specifically want to stress-test a tag-heavy theme.
const MAX_EXTRA_TAGS = 30;

// Build the pool of tag names to distribute across posts: the five fixed tags
// plus up to `extraTags` (capped at 100) unique generated tags.
const buildTagPool = ({extraTags = 0} = {}) => {
    const pool = [...FIXED_TAGS];
    const wanted = Math.max(0, Math.min(parseInt(extraTags, 10) || 0, MAX_EXTRA_TAGS));

    const seen = new Set(pool);
    const target = FIXED_TAGS.length + wanted;
    // The lorem-ipsum vocabulary of single words is small, so use two-word
    // names and fall back to a numeric suffix to guarantee `wanted` unique tags
    // (up to the MAX_EXTRA_TAGS cap).
    while (pool.length < target) {
        let name = loremIpsum({count: 2, units: 'words'}).trim().toLowerCase();
        if (!name || seen.has(name)) {
            name = `${name || 'tag'} ${pool.length}`;
        }
        seen.add(name);
        pool.push(name);
    }

    return pool;
};

// Pick a small, random set of tag names for a single post. The configured
// collection tag is guaranteed onto roughly half of posts so its archive page
// (used by the "Collection" nav item) is well populated.
const pickTagsForPost = (pool, {index = 0, min = 1, max = 3, collectionTag = 'lorem'} = {}) => {
    const count = Math.min(pool.length, min + Math.floor(Math.random() * (max - min + 1)));
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    const chosen = shuffled.slice(0, count);

    // Deterministically seed the collection tag onto alternating posts so the
    // collection archive is never empty.
    if (collectionTag && index % 2 === 0 && !chosen.includes(collectionTag)) {
        chosen[chosen.length - 1] = collectionTag;
    }

    // Ghost auto-creates tags by name on post insert; return name objects so
    // the primary tag ordering is explicit.
    return chosen.map(name => ({name: titleCase(name)}));
};

export {
    FIXED_TAGS,
    MAX_EXTRA_TAGS,
    buildTagPool,
    pickTagsForPost
};
