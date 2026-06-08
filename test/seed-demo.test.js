import {describe, test} from 'node:test';
import assert from 'node:assert/strict';
import * as L from '../lib/demo/lexical-cards.js';
import {FIXED_TAGS, buildTagPool, pickTagsForPost} from '../lib/demo/tags.js';
import {buildDemoPost, wantsFeatureImage, weightedImageCount, resolveDateRange, buildPublishSchedule} from '../lib/demo/demo-post.js';
import {buildDesiredNavigation} from '../lib/demo/navigation.js';
import {buildStyleGuide} from '../lib/demo/style-guide.js';
import {buildDummyAuthor, slugify, pickPrimaryAuthorIndices, buildImportFile} from '../lib/demo/author.js';

// A fake asset manager so tests never touch the network or a Ghost site.
const fakeAssetManager = () => {
    return {
        getImage: async ({key, width = 1200, height = 800}) => ({url: `https://example.com/${key}.jpg`, width, height}),
        getMedia: async ({type}) => ({url: `https://example.com/${type}`, mimeType: type === 'audio' ? 'audio/mpeg' : 'video/mp4', hotlinked: false}),
        getFile: async ({fileName = 'placeholder.txt'}) => ({url: `https://example.com/${fileName}`, fileName, fileSize: 1024})
    };
};

const baseArgs = {
    count: 5,
    titleMinLength: 3,
    titleMaxLength: 8,
    contentCount: 6,
    paragraphLowerBound: 2,
    paragraphUpperBound: 4,
    sentenceLowerBound: 3,
    sentenceUpperBound: 10,
    status: 'published',
    visibility: 'public',
    featureImages: 'all',
    imageCards: true,
    maxImageCards: 3,
    collectionTag: 'lorem'
};

describe('Lexical cards', function () {
    test('buildDoc produces a valid root document', function () {
        const doc = JSON.parse(L.buildDoc([L.paragraph([L.textNode('Hello')])]));
        assert.strictEqual(doc.root.type, 'root');
        assert.strictEqual(doc.root.children.length, 1);
        assert.strictEqual(doc.root.children[0].type, 'paragraph');
    });

    test('image card is a top-level node with expected shape', function () {
        const card = L.image({src: 'https://example.com/a.jpg', alt: 'Alt', caption: 'Cap', width: 1200, height: 800});
        assert.strictEqual(card.type, 'image');
        assert.strictEqual(card.src, 'https://example.com/a.jpg');
        assert.strictEqual(card.cardWidth, 'regular');
        assert.strictEqual(card.alt, 'Alt');
    });

    test('headings and lists build correctly', function () {
        assert.strictEqual(L.heading('Title', 'h2').tag, 'h2');
        const list = L.list(['a', 'b'], {ordered: true});
        assert.strictEqual(list.listType, 'number');
        assert.strictEqual(list.children.length, 2);
    });

    test('text format helpers set the expected bitmask', function () {
        assert.strictEqual(L.boldText('x').format, L.FORMAT_BOLD);
        assert.strictEqual(L.italicText('x').format, L.FORMAT_ITALIC);
        assert.strictEqual(L.strikeText('x').format, L.FORMAT_STRIKETHROUGH);
        assert.strictEqual(L.underlineText('x').format, L.FORMAT_UNDERLINE);
        assert.strictEqual(L.codeText('x').format, L.FORMAT_CODE);
        assert.strictEqual(L.highlightText('x').format, L.FORMAT_HIGHLIGHT);
        assert.strictEqual(L.subscriptText('x').format, L.FORMAT_SUBSCRIPT);
        assert.strictEqual(L.superscriptText('x').format, L.FORMAT_SUPERSCRIPT);
        // OR'd formats combine.
        assert.strictEqual(L.textNode('x', L.FORMAT_BOLD | L.FORMAT_ITALIC).format, 3);
    });

    test('new card builders produce the documented node shapes', function () {
        assert.deepStrictEqual(L.paywall(), {type: 'paywall', version: 1});

        const cb = L.codeblock({code: 'a=1', language: 'python', caption: 'c'});
        assert.deepStrictEqual(cb, {type: 'codeblock', version: 1, code: 'a=1', language: 'python', caption: 'c'});

        const f = L.file({src: 'u', fileTitle: 't', fileCaption: 'c', fileName: 'n.txt', fileSize: 10});
        assert.strictEqual(f.type, 'file');
        assert.strictEqual(f.fileSize, 10);

        const p = L.product({title: 'T', ratingEnabled: true, starRating: 4, buttonEnabled: true, buttonText: 'Buy', buttonUrl: 'u'});
        assert.strictEqual(p.type, 'product');
        assert.strictEqual(p.productTitle, 'T');
        assert.strictEqual(p.productStarRating, 4);
        assert.strictEqual(p.productButton, 'Buy');

        const s = L.signup({header: 'H'});
        assert.strictEqual(s.type, 'signup');
        assert.deepStrictEqual(s.labels, []);
        assert.strictEqual(s.buttonText, 'Subscribe');

        const e = L.email('<p>hi</p>');
        assert.deepStrictEqual(e, {type: 'email', version: 1, html: '<p>hi</p>'});

        const cta = L.emailCta({html: '<p>x</p>', buttonText: 'Go', buttonUrl: 'u', showButton: true});
        assert.strictEqual(cta.type, 'email-cta');
        assert.strictEqual(cta.segment, 'status:free');

        const c2a = L.callToAction({textValue: '<p>x</p>', buttonUrl: 'u'});
        assert.strictEqual(c2a.type, 'call-to-action');
        assert.strictEqual(c2a.visibility.web.nonMember, true);
        assert.strictEqual(c2a.visibility.web.memberSegment, 'status:free,status:-free');
    });

    test('header card emits the modern v2 shape', function () {
        const h = L.header({heading: 'Hi', subheading: 'Sub', buttonText: 'Go', buttonUrl: 'u', style: 'light'});
        assert.strictEqual(h.type, 'header');
        assert.strictEqual(h.version, 2);
        assert.strictEqual(h.style, 'light');
        assert.strictEqual(h.buttonEnabled, true);
        assert.strictEqual(h.header, 'Hi');
        assert.strictEqual(h.subheader, 'Sub');
    });
});

describe('Tags', function () {
    test('pool always contains the five fixed tags', function () {
        const pool = buildTagPool({extraTags: 0});
        assert.deepStrictEqual(pool.slice(0, 5), FIXED_TAGS);
    });

    test('extra tags are added and capped at 30', function () {
        const pool = buildTagPool({extraTags: 10});
        assert.strictEqual(pool.length, 15);
        const capped = buildTagPool({extraTags: 500});
        assert.strictEqual(capped.length, 35);
    });

    test('pickTagsForPost returns name objects from the pool', function () {
        const pool = buildTagPool({extraTags: 0});
        const tags = pickTagsForPost(pool, {index: 0, collectionTag: 'lorem'});
        assert.ok(tags.length >= 1);
        tags.forEach(t => assert.strictEqual(typeof t.name, 'string'));
    });
});

describe('Feature image sampling', function () {
    test('all / none', function () {
        assert.strictEqual(wantsFeatureImage('all', 0, 10), true);
        assert.strictEqual(wantsFeatureImage('none', 0, 10), false);
    });

    test('percentage', function () {
        assert.strictEqual(wantsFeatureImage('50%', 10, 100), true);
        assert.strictEqual(wantsFeatureImage('50%', 60, 100), false);
    });

    test('weightedImageCount respects the max', function () {
        for (let i = 0; i < 200; i += 1) {
            const n = weightedImageCount(2);
            assert.ok(n >= 0 && n <= 2);
        }
    });
});

describe('buildDemoPost', function () {
    test('produces a post with lexical, tags and a feature image', async function () {
        const post = await buildDemoPost({
            index: 0,
            args: baseArgs,
            assetManager: fakeAssetManager(),
            tagPool: buildTagPool({extraTags: 0}),
            author: {email: 'a@b.com'}
        });
        assert.strictEqual(typeof post.lexical, 'string');
        assert.ok(post.tags.length >= 1);
        assert.ok(post.feature_image);
        assert.deepStrictEqual(post.authors, [{email: 'a@b.com'}]);
    });

    test('never places an image card before the first paragraph', async function () {
        // Run enough times to exercise the random placement.
        for (let i = 0; i < 30; i += 1) {
            // eslint-disable-next-line no-await-in-loop
            const post = await buildDemoPost({
                index: i,
                args: {...baseArgs, maxImageCards: 3},
                assetManager: fakeAssetManager(),
                tagPool: buildTagPool({extraTags: 0}),
                author: {email: 'a@b.com'}
            });
            const doc = JSON.parse(post.lexical);
            assert.strictEqual(doc.root.children[0].type, 'paragraph', 'first node must be a paragraph');
        }
    });

    test('no image cards when imageCards is false', async function () {
        const post = await buildDemoPost({
            index: 0,
            args: {...baseArgs, imageCards: false},
            assetManager: fakeAssetManager(),
            tagPool: buildTagPool({extraTags: 0}),
            author: null
        });
        const doc = JSON.parse(post.lexical);
        const imageNodes = doc.root.children.filter(n => n.type === 'image');
        assert.strictEqual(imageNodes.length, 0);
    });
});

describe('Publication dates', function () {
    test('resolveDateRange normalises CLI flags and interactive object', function () {
        assert.strictEqual(resolveDateRange({}), false);
        assert.strictEqual(resolveDateRange({dateStart: false}), false);

        const fromCli = resolveDateRange({dateStart: '2025-01-01'});
        assert.strictEqual(fromCli.start, '2025-01-01');
        assert.ok(fromCli.end instanceof Date);

        const range = {start: new Date('2024-01-01'), end: new Date('2024-12-31')};
        assert.deepStrictEqual(resolveDateRange({dateRange: range}), range);
    });

    test('buildPublishSchedule returns nulls when there is no range', function () {
        const schedule = buildPublishSchedule({count: 4, dateRange: false});
        assert.strictEqual(schedule.length, 4);
        schedule.forEach(d => assert.strictEqual(d, null));
    });

    test('buildPublishSchedule spreads dates across the range, in order', function () {
        const start = new Date('2025-01-01T00:00:00.000Z');
        const end = new Date('2025-12-31T00:00:00.000Z');
        const count = 12;
        const schedule = buildPublishSchedule({count, dateRange: {start, end}});

        assert.strictEqual(schedule.length, count);

        // Every date sits within the range.
        schedule.forEach((d) => {
            assert.ok(d.getTime() >= start.getTime());
            assert.ok(d.getTime() <= end.getTime());
        });

        // Chronological: each slot is strictly after the previous one.
        for (let i = 1; i < schedule.length; i += 1) {
            assert.ok(schedule[i].getTime() >= schedule[i - 1].getTime());
        }

        // Each date lands inside its own slot (the "spread", not clustered).
        const slot = (end.getTime() - start.getTime()) / count;
        schedule.forEach((d, i) => {
            const slotStart = start.getTime() + (slot * i);
            assert.ok(d.getTime() >= slotStart);
            assert.ok(d.getTime() <= slotStart + slot);
        });
    });

    test('buildPublishSchedule guards invalid dates', function () {
        const schedule = buildPublishSchedule({count: 3, dateRange: {start: 'nonsense', end: 'also-bad'}});
        assert.strictEqual(schedule.length, 3);
        schedule.forEach(d => assert.strictEqual(d, null));
    });

    test('buildDemoPost applies a supplied publishDate to all three date fields', async function () {
        const when = new Date('2025-06-15T12:00:00.000Z');
        const post = await buildDemoPost({
            index: 0,
            args: baseArgs,
            assetManager: fakeAssetManager(),
            tagPool: buildTagPool({extraTags: 0}),
            author: null,
            publishDate: when
        });
        assert.strictEqual(post.created_at, when);
        assert.strictEqual(post.updated_at, when);
        assert.strictEqual(post.published_at, when);
    });

    test('buildDemoPost leaves dates unset without a publishDate', async function () {
        const post = await buildDemoPost({
            index: 0,
            args: baseArgs,
            assetManager: fakeAssetManager(),
            tagPool: buildTagPool({extraTags: 0}),
            author: null
        });
        assert.strictEqual(post.published_at, undefined);
    });
});

describe('Style Guide', function () {
    const types = async (site) => {
        const post = await buildStyleGuide({assetManager: fakeAssetManager(), args: baseArgs, site});
        const doc = JSON.parse(post.lexical);
        return doc.root.children.map(n => n.type);
    };

    test('includes the full front-end card set', async function () {
        const t = await types({membersEnabled: true});
        for (const type of ['header', 'callout', 'toggle', 'bookmark', 'button', 'image', 'gallery', 'audio', 'video', 'file', 'product', 'signup', 'embed', 'codeblock', 'call-to-action', 'markdown', 'html', 'horizontalrule', 'email', 'email-cta']) {
            assert.ok(t.includes(type), `expected a "${type}" card in the style guide`);
        }
    });

    test('includes the paywall only when members are enabled', async function () {
        const withMembers = await types({membersEnabled: true});
        assert.ok(withMembers.includes('paywall'));

        const withoutMembers = await types({membersEnabled: false});
        assert.ok(!withoutMembers.includes('paywall'));
    });
});

describe('Author', function () {
    test('slugify produces a clean slug', function () {
        assert.strictEqual(slugify('Sam Example'), 'sam-example');
        assert.strictEqual(slugify('  Dr. Foo  Bar! '), 'dr-foo-bar');
    });

    test('buildDummyAuthor derives slug/email and hosts a profile image', async function () {
        const author = await buildDummyAuthor({assetManager: fakeAssetManager(), args: {}});
        assert.strictEqual(author.name, 'Sam Example');
        assert.strictEqual(author.slug, 'sam-example');
        assert.strictEqual(author.email, 'sam-example@example.com');
        assert.strictEqual(author.role, 'Contributor');
        assert.ok(author.profile_image, 'expected a profile_image');
        assert.ok(/^[a-f0-9]{24}$/.test(author.id), 'expected a 24-hex id');
        assert.ok(author.bio && author.bio.length > 0);
    });

    test('buildDummyAuthor honours overrides', async function () {
        const author = await buildDummyAuthor({
            assetManager: fakeAssetManager(),
            args: {authorName: 'Jane Doe', authorEmail: 'jane@test.dev', authorRole: 'Editor'}
        });
        assert.strictEqual(author.name, 'Jane Doe');
        assert.strictEqual(author.slug, 'jane-doe');
        assert.strictEqual(author.email, 'jane@test.dev');
        assert.strictEqual(author.role, 'Editor');
    });

    test('buildDummyAuthor falls back to a hotlinked avatar without an asset manager', async function () {
        const author = await buildDummyAuthor({assetManager: null, args: {}});
        assert.ok(author.profile_image.startsWith('https://picsum.photos/'));
    });

    test('pickPrimaryAuthorIndices selects the right share within range', function () {
        const set = pickPrimaryAuthorIndices({count: 10, share: 30});
        assert.strictEqual(set.size, 3);
        for (const i of set) {
            assert.ok(i >= 0 && i < 10);
        }
    });

    test('pickPrimaryAuthorIndices handles 0 and 100 percent', function () {
        assert.strictEqual(pickPrimaryAuthorIndices({count: 8, share: 0}).size, 0);
        assert.strictEqual(pickPrimaryAuthorIndices({count: 8, share: 100}).size, 8);
    });

    test('buildImportFile yields an importable users payload', function () {
        const author = {id: 'abc', name: 'Sam', slug: 'sam', email: 's@e.com', role: 'Contributor', bio: 'hi', profile_image: 'x'};
        const file = buildImportFile(author);
        assert.ok(file.data && Array.isArray(file.data.users));
        assert.strictEqual(file.data.users[0].email, 's@e.com');
        assert.deepStrictEqual(file.data.users[0].roles, ['Contributor']);
    });

    test('buildDemoPost honours an explicit authors array in order', async function () {
        const post = await buildDemoPost({
            index: 0,
            args: baseArgs,
            assetManager: fakeAssetManager(),
            tagPool: buildTagPool({extraTags: 0}),
            author: {email: 'owner@site.com'},
            authors: [{email: 'dummy@site.com'}, {email: 'owner@site.com'}]
        });
        assert.deepStrictEqual(post.authors, [{email: 'dummy@site.com'}, {email: 'owner@site.com'}]);
    });

    test('style guide adds the dummy author as a second author', async function () {
        const post = await buildStyleGuide({
            assetManager: fakeAssetManager(),
            args: baseArgs,
            site: {membersEnabled: true, primaryAuthor: {email: 'owner@site.com'}},
            dummyAuthor: {email: 'dummy@site.com'}
        });
        assert.deepStrictEqual(post.authors, [{email: 'owner@site.com'}, {email: 'dummy@site.com'}]);
    });
});

describe('Navigation', function () {
    test('builds canonical order and preserves custom items', function () {
        const current = [
            {label: 'Home', url: '/'},
            {label: 'Contact', url: '/contact/'}
        ];
        const nav = buildDesiredNavigation({
            current,
            parts: {
                about: true,
                styleGuide: {slug: 'style-guide'},
                author: {slug: 'jane'},
                collection: {tag: 'lorem'}
            }
        });
        assert.deepStrictEqual(nav.map(n => n.label), ['Home', 'About', 'Style Guide', 'Author', 'Collection', 'Contact']);
        assert.strictEqual(nav[3].url, '/author/jane/');
        assert.strictEqual(nav[4].url, '/tag/lorem/');
    });

    test('omits disabled parts', function () {
        const nav = buildDesiredNavigation({current: [], parts: {about: true}});
        assert.deepStrictEqual(nav.map(n => n.label), ['Home', 'About']);
    });
});
