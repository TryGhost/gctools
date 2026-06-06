import {loremIpsum} from 'lorem-ipsum';
import {titleCase} from 'title-case';
import * as L from './lexical-cards.js';
import {pickTagsForPost} from './tags.js';

// Decide whether this post gets a feature image, based on the
// `featureImages` option which is one of: 'all', 'none', or a percentage
// like '50%' / '50'.
const wantsFeatureImage = (featureImages, index) => {
    if (featureImages === 'none' || featureImages === false) {
        return false;
    }
    if (featureImages === 'all' || featureImages === true || featureImages === undefined) {
        return true;
    }
    const pct = parseInt(String(featureImages).replace('%', ''), 10);
    if (isNaN(pct)) {
        return true;
    }
    // Spread the sample deterministically across the run.
    return (index % 100) < pct;
};

// Weighted-low number of in-post image cards (skewed toward 0-1, max 3).
const weightedImageCount = (max) => {
    const r = Math.random();
    let n;
    if (r < 0.4) {
        n = 0;
    } else if (r < 0.75) {
        n = 1;
    } else if (r < 0.92) {
        n = 2;
    } else {
        n = 3;
    }
    return Math.min(n, max);
};

// Normalise the various ways a date range can arrive into a {start, end}
// object, or `false` when no distribution is requested.
// - interactive mode supplies `args.dateRange` as a {start, end} object
// - CLI supplies `args.dateStart` (and optionally `args.dateEnd`, default now)
const resolveDateRange = (args = {}) => {
    if (args.dateRange && typeof args.dateRange === 'object' && args.dateRange.start) {
        return {start: args.dateRange.start, end: args.dateRange.end || new Date()};
    }
    if (args.dateStart) {
        return {start: args.dateStart, end: args.dateEnd || new Date()};
    }
    return false;
};

// Build a publication schedule of `count` dates spread across the range with
// jitter: the span is divided into `count` equal slots and one date is placed
// at a random offset within each slot. This keeps posts naturally paced (no
// clustering) while staying chronological (index 0 = oldest). Returns an array
// of `count` Date objects, or `count` nulls when there is no usable range.
const buildPublishSchedule = ({count, dateRange}) => {
    const size = Math.max(0, count || 0);

    if (!dateRange || !dateRange.start || !dateRange.end) {
        return new Array(size).fill(null);
    }

    let start = new Date(dateRange.start).getTime();
    let end = new Date(dateRange.end).getTime();

    if (Number.isNaN(start) || Number.isNaN(end)) {
        return new Array(size).fill(null);
    }
    if (start > end) {
        [start, end] = [end, start];
    }

    const span = end - start;
    const slotWidth = size > 0 ? span / size : 0;
    const dates = [];
    for (let i = 0; i < size; i += 1) {
        const slotStart = start + (slotWidth * i);
        const jittered = slotStart + (Math.random() * slotWidth);
        dates.push(new Date(jittered));
    }
    return dates;
};

const makeTitle = (args) => {
    const len = Math.floor(Math.random() * (args.titleMaxLength - args.titleMinLength + 1)) + args.titleMinLength;
    return titleCase(loremIpsum({count: len, units: 'words'}));
};

const makeParagraphText = (args) => {
    const sentences = Math.floor(Math.random() * (args.paragraphUpperBound - args.paragraphLowerBound + 1)) + args.paragraphLowerBound;
    return loremIpsum({
        count: sentences,
        units: 'sentences',
        sentenceLowerBound: args.sentenceLowerBound,
        sentenceUpperBound: args.sentenceUpperBound
    });
};

// Build a single demo post object ready for `api.posts.add`.
// `assetManager` is used to source + host images; may be null when images are
// disabled entirely.
const buildDemoPost = async ({index, args, assetManager, tagPool, author, authors = null, publishDate = null}) => {
    const paragraphCount = Math.max(2, args.contentCount || 6);
    const paragraphs = [];
    for (let i = 0; i < paragraphCount; i += 1) {
        paragraphs.push(L.paragraph([L.textNode(makeParagraphText(args))]));
    }

    // Decide image-card insertion points: never before the first paragraph,
    // and only when image cards are enabled.
    const children = [...paragraphs];
    if (assetManager && args.imageCards !== false && paragraphCount > 1) {
        const max = Math.min(args.maxImageCards ?? 3, paragraphCount - 1);
        const imageCount = weightedImageCount(max);

        // Choose distinct paragraph indices (>= 1) to insert an image after.
        const candidatePositions = [];
        for (let p = 1; p < paragraphCount; p += 1) {
            candidatePositions.push(p);
        }
        candidatePositions.sort(() => Math.random() - 0.5);
        const positions = candidatePositions.slice(0, imageCount).sort((a, b) => a - b);

        // Insert from the end so earlier indices stay valid.
        for (let j = positions.length - 1; j >= 0; j -= 1) {
            const pos = positions[j];
            // eslint-disable-next-line no-await-in-loop
            const img = await assetManager.getImage({
                key: `post-${index}-img-${j}`,
                width: 1200,
                height: 800
            });
            const card = L.image({
                src: img.url,
                alt: loremIpsum({count: 3, units: 'words'}),
                caption: titleCase(loremIpsum({count: 4, units: 'words'})),
                width: img.width,
                height: img.height
            });
            children.splice(pos, 0, card);
        }
    }

    const post = {
        title: makeTitle(args),
        status: args.status || 'published',
        visibility: args.visibility || 'public',
        custom_excerpt: loremIpsum({count: 2, units: 'sentences'}),
        lexical: L.buildDoc(children),
        tags: pickTagsForPost(tagPool, {
            index,
            collectionTag: (args.collectionTag || 'lorem').toLowerCase()
        })
    };

    // An explicit `authors` array (e.g. [dummy, owner] to make the dummy
    // primary) wins; otherwise fall back to the single primary author.
    if (authors && authors.length) {
        post.authors = authors.map(a => ({email: a.email}));
    } else if (author) {
        post.authors = [{email: author.email}];
    }

    // Distribute the publication date when a schedule is supplied; mirrors the
    // created_at/updated_at/published_at trio set by `random-posts`.
    if (publishDate) {
        post.created_at = publishDate;
        post.updated_at = publishDate;
        post.published_at = publishDate;
    }

    // Feature image.
    if (assetManager && wantsFeatureImage(args.featureImages, index)) {
        const feature = await assetManager.getImage({
            key: `post-${index}-feature`,
            width: 1600,
            height: 900
        });
        post.feature_image = feature.url;
        post.feature_image_alt = titleCase(loremIpsum({count: 3, units: 'words'}));
        post.feature_image_caption = titleCase(loremIpsum({count: 4, units: 'words'}));
    }

    return post;
};

export {
    wantsFeatureImage,
    weightedImageCount,
    resolveDateRange,
    buildPublishSchedule,
    buildDemoPost
};
