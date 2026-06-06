import {loremIpsum} from 'lorem-ipsum';
import {titleCase} from 'title-case';
import * as L from './lexical-cards.js';

// Build the "Style Guide" post: a single post that exercises every front-end
// content card in the Ghost editor plus the email-only cards, a full inline
// formatting/typography sampler, and a handful of edge cases — so it doubles as
// a theme stress test. Modeled on https://london.ghost.io/style-guide/.
//
// Card node shapes mirror @tryghost/kg-default-nodes so the content is fully
// editable in Ghost Admin. Images/audio/video/files are sourced + hosted via
// the asset manager when available.
const CALLOUT_COLORS = ['grey', 'white', 'blue', 'green', 'yellow', 'red', 'pink', 'purple'];

const buildStyleGuide = async ({assetManager, args, site = {}, dummyAuthor = null}) => {
    const children = [];
    const para = (sentences = 2) => L.paragraph([L.textNode(loremIpsum({count: sentences, units: 'sentences'}))]);
    const section = title => children.push(L.heading(title, 'h2'));

    children.push(L.paragraph([
        L.textNode('This post exercises every content card available in the Ghost editor, along with a full inline-formatting and typography sampler, so it can be used as a front-end theme test.')
    ]));

    // ---- Typography --------------------------------------------------------
    section('Typography');

    children.push(L.heading('Heading level 2', 'h2'));
    children.push(L.heading('Heading level 3', 'h3'));
    children.push(L.heading('Heading level 4', 'h4'));
    children.push(L.heading('Heading level 5', 'h5'));
    children.push(L.heading('Heading level 6', 'h6'));
    children.push(para(3));

    // Inline formatting sampler.
    children.push(L.heading('Inline formatting', 'h3'));
    children.push(L.paragraph([
        L.textNode('This paragraph demonstrates '),
        L.boldText('bold'),
        L.textNode(', '),
        L.italicText('italic'),
        L.textNode(', '),
        L.textNode('bold italic', L.FORMAT_BOLD | L.FORMAT_ITALIC),
        L.textNode(', '),
        L.strikeText('strikethrough'),
        L.textNode(', '),
        L.underlineText('underline'),
        L.textNode(', '),
        L.codeText('inline code'),
        L.textNode(', '),
        L.highlightText('highlighted'),
        L.textNode(', super'),
        L.superscriptText('script'),
        L.textNode(', sub'),
        L.subscriptText('script'),
        L.textNode(', and a '),
        L.linkNode('hyperlink', 'https://ghost.org'),
        L.textNode('.')
    ]));

    // Blockquotes.
    children.push(L.heading('Blockquotes', 'h3'));
    children.push(L.quote('The way to get started is to quit talking and begin doing. — Walt Disney'));
    children.push(L.aside('The only impossible journey is the one you never begin. — Tony Robbins'));

    // Lists, including a nested list.
    children.push(L.heading('Lists', 'h3'));
    children.push(L.list([
        [L.textNode('Unordered item with a '), L.linkNode('link', 'https://ghost.org')],
        [L.textNode('Item with a nested list')],
        [L.list(['Nested item one', 'Nested item two'])],
        [L.textNode('Final top-level item')]
    ]));
    children.push(L.list(['First ordered item', 'Second ordered item', 'Third ordered item'], {ordered: true}));

    // Table (via markdown).
    children.push(L.heading('Tables', 'h3'));
    children.push(L.markdown('| Plan | Price | Best for |\n| --- | --- | --- |\n| Free | $0 | Trying things out |\n| Pro | $9 | Growing publications |\n| Business | $25 | Teams & scale |'));

    // ---- Media -------------------------------------------------------------
    section('Media');

    if (assetManager) {
        const regular = await assetManager.getImage({key: 'sg-image-regular', width: 1200, height: 800});
        children.push(L.image({src: regular.url, alt: 'Regular width image', caption: 'Regular (in-column) width', width: regular.width, height: regular.height, cardWidth: 'regular'}));

        const wide = await assetManager.getImage({key: 'sg-image-wide', width: 1600, height: 900});
        children.push(L.image({src: wide.url, alt: 'Wide image', caption: 'Wide width', width: wide.width, height: wide.height, cardWidth: 'wide'}));

        const full = await assetManager.getImage({key: 'sg-image-full', width: 2000, height: 1000});
        children.push(L.image({src: full.url, alt: 'Full-bleed image', caption: 'Full width', width: full.width, height: full.height, cardWidth: 'full'}));

        // Linked image (clickable) and an image with no caption.
        const linked = await assetManager.getImage({key: 'sg-image-linked', width: 1200, height: 800});
        children.push(L.image({src: linked.url, alt: 'Linked image', caption: 'This image links to ghost.org', width: linked.width, height: linked.height, href: 'https://ghost.org'}));

        const noCaption = await assetManager.getImage({key: 'sg-image-nocaption', width: 1200, height: 800});
        children.push(L.image({src: noCaption.url, alt: 'Image without a caption', width: noCaption.width, height: noCaption.height}));

        // Two adjacent images (spacing/margin test).
        const adjA = await assetManager.getImage({key: 'sg-image-adj-a', width: 1200, height: 800});
        const adjB = await assetManager.getImage({key: 'sg-image-adj-b', width: 1200, height: 800});
        children.push(L.image({src: adjA.url, alt: 'Adjacent image A', width: adjA.width, height: adjA.height}));
        children.push(L.image({src: adjB.url, alt: 'Adjacent image B', width: adjB.width, height: adjB.height}));
    }

    // Gallery spanning multiple rows.
    children.push(L.heading('Gallery', 'h3'));
    if (assetManager) {
        const galleryImages = [];
        for (let i = 0; i < 6; i += 1) {
            // eslint-disable-next-line no-await-in-loop
            const gi = await assetManager.getImage({key: `sg-gallery-${i}`, width: 1200, height: 800});
            galleryImages.push({src: gi.url, width: gi.width, height: gi.height, fileName: `gallery-${i}.jpg`});
        }
        children.push(L.gallery(galleryImages, 'A multi-row gallery of placeholder images'));
    }

    if (assetManager) {
        children.push(L.heading('Audio', 'h3'));
        const audioAsset = await assetManager.getMedia({type: 'audio'});
        children.push(L.audio({src: audioAsset.url, title: 'Placeholder audio', mimeType: audioAsset.mimeType}));

        children.push(L.heading('Video', 'h3'));
        const videoAsset = await assetManager.getMedia({type: 'video'});
        children.push(L.video({src: videoAsset.url, caption: 'Placeholder video', mimeType: videoAsset.mimeType}));

        children.push(L.heading('File download', 'h3'));
        const fileAsset = await assetManager.getFile({key: 'sg-file', fileName: 'placeholder.txt'});
        children.push(L.file({src: fileAsset.url, fileTitle: 'Placeholder document', fileCaption: 'A downloadable file card', fileName: fileAsset.fileName, fileSize: fileAsset.fileSize}));
    }

    // ---- Cards -------------------------------------------------------------
    section('Cards');

    // Header card variants.
    children.push(L.heading('Header cards', 'h3'));
    children.push(L.header({heading: 'Dark header', subheading: 'A full-width header card with a button', buttonText: 'Get started', buttonUrl: '#/portal/signup', style: 'dark', backgroundColor: '#000000'}));
    children.push(L.header({heading: 'Light header', subheading: 'The same card on a light background', buttonText: 'Subscribe', buttonUrl: '#/portal/signup', style: 'light', backgroundColor: '#ffffff', textColor: '#000000', buttonColor: '#000000', buttonTextColor: '#ffffff'}));
    children.push(L.header({heading: 'Accent header', subheading: 'Using the theme accent colour', buttonText: 'Join', buttonUrl: '#/portal/signup', style: 'accent'}));
    if (assetManager) {
        const headerBg = await assetManager.getImage({key: 'sg-header-bg', width: 2000, height: 1000});
        children.push(L.header({heading: 'Header with background image', subheading: 'Text over a hosted background image', buttonText: 'Read more', buttonUrl: '#/portal/signup', style: 'image', backgroundImageSrc: headerBg.url, backgroundImageWidth: headerBg.width, backgroundImageHeight: headerBg.height, size: 'large'}));
    }

    // Callout palette + a no-emoji callout.
    children.push(L.heading('Callouts', 'h3'));
    CALLOUT_COLORS.forEach((color) => {
        children.push(L.callout(`${titleCase(color)} callout — ${loremIpsum({count: 1, units: 'sentences'})}`, {emoji: '💡', backgroundColor: color}));
    });
    children.push(L.callout(`Callout with no emoji — ${loremIpsum({count: 1, units: 'sentences'})}`, {emoji: '', backgroundColor: 'blue'}));

    // Toggles.
    children.push(L.heading('Toggles', 'h3'));
    children.push(L.toggle('When should I use toggles?', loremIpsum({count: 2, units: 'sentences'})));
    children.push(L.toggle('Where can I take Ghost for a spin?', loremIpsum({count: 2, units: 'sentences'})));

    // Bookmark with a populated thumbnail + icon.
    children.push(L.heading('Bookmark', 'h3'));
    let bookmarkThumb = '';
    if (assetManager) {
        const thumb = await assetManager.getImage({key: 'sg-bookmark-thumb', width: 1200, height: 800});
        bookmarkThumb = thumb.url;
    }
    children.push(L.bookmark({
        url: 'https://ghost.org',
        title: 'Ghost - The Professional Publishing Platform',
        description: 'The best open source blog & newsletter platform. Beautiful, contemporary themes for publishers, creators and businesses.',
        publisher: 'Ghost',
        author: 'Ghost Foundation',
        icon: 'https://www.google.com/s2/favicons?domain=ghost.org&sz=64',
        thumbnail: bookmarkThumb
    }));

    // Buttons (center + left).
    children.push(L.heading('Buttons', 'h3'));
    children.push(L.button({text: 'Centered button', url: '#/portal/signup', alignment: 'center'}));
    children.push(L.button({text: 'Left-aligned button', url: '#/portal/signup', alignment: 'left'}));

    // Product card.
    children.push(L.heading('Product', 'h3'));
    let productImage = '';
    let productW = null;
    let productH = null;
    if (assetManager) {
        const pImg = await assetManager.getImage({key: 'sg-product', width: 1200, height: 800});
        productImage = pImg.url;
        productW = pImg.width;
        productH = pImg.height;
    }
    children.push(L.product({
        imageSrc: productImage,
        imageWidth: productW,
        imageHeight: productH,
        title: 'Placeholder Product',
        description: loremIpsum({count: 2, units: 'sentences'}),
        ratingEnabled: true,
        starRating: 5,
        buttonEnabled: true,
        buttonText: 'Buy now',
        buttonUrl: 'https://ghost.org'
    }));

    // Newsletter signup card.
    children.push(L.heading('Signup', 'h3'));
    children.push(L.signup({
        header: 'Sign up for our newsletter',
        subheader: loremIpsum({count: 1, units: 'sentences'}),
        disclaimer: 'No spam. Unsubscribe anytime.'
    }));

    // Embed (full-size YouTube with caption).
    children.push(L.heading('Embed', 'h3'));
    children.push(L.embed({
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        embedType: 'video',
        html: '<iframe width="480" height="270" src="https://www.youtube.com/embed/dQw4w9WgXcQ" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>',
        caption: 'An embedded YouTube video',
        metadata: {}
    }));

    // Code block.
    children.push(L.heading('Code block', 'h3'));
    children.push(L.codeblock({
        code: 'function greet(name) {\n  return `Hello, ${name}!`;\n}\n\nconsole.log(greet(\'Ghost\'));',
        language: 'javascript',
        caption: 'A JavaScript snippet'
    }));

    // Call-to-action card (front-end).
    children.push(L.heading('Call to action', 'h3'));
    children.push(L.callToAction({
        textValue: `<p>${loremIpsum({count: 1, units: 'sentences'})}</p>`,
        showButton: true,
        buttonText: 'Learn more',
        buttonUrl: 'https://ghost.org',
        hasSponsorLabel: true,
        backgroundColor: 'grey'
    }));

    // Markdown + HTML cards.
    children.push(L.heading('Markdown', 'h3'));
    children.push(L.markdown('You can also write in **Markdown**, with _emphasis_, `code`, and [links](https://ghost.org).'));

    children.push(L.heading('HTML', 'h3'));
    children.push(L.html('<div style="padding:1rem;border:1px solid #ddd;border-radius:6px;">Custom HTML card content.</div>'));

    // ---- Email-only cards --------------------------------------------------
    section('Email-only cards');
    children.push(L.paragraph([
        L.textNode('The following two cards render only in email newsletters and are not visible on the website.')
    ]));
    children.push(L.email('<p>This content only appears in the email version of this post.</p>'));
    children.push(L.emailCta({
        html: '<p>This call to action is shown to free members in the email only.</p>',
        buttonText: 'Upgrade',
        buttonUrl: '#/portal/signup',
        segment: 'status:free',
        showButton: true
    }));

    // ---- Structural & edge cases ------------------------------------------
    section('Structural & edge cases');

    children.push(L.heading('Dividers', 'h3'));
    children.push(para());
    children.push(L.horizontalRule());
    children.push(para());

    // A very long heading and a long unbroken string (wrap/overflow test).
    children.push(L.heading('A deliberately long heading that should wrap gracefully across multiple lines on narrow viewports without breaking the layout', 'h3'));
    children.push(L.paragraph([L.textNode('Supercalifragilisticexpialidocious-pneumonoultramicroscopicsilicovolcanoconiosis-antidisestablishmentarianism')]));

    // Paywall (public preview) — only when members are enabled, with content on
    // both sides so the split is visible.
    if (site.membersEnabled) {
        children.push(L.heading('Public preview / paywall', 'h3'));
        children.push(para(2));
        children.push(L.paywall());
        children.push(para(2));
    }

    const post = {
        title: 'Style Guide',
        slug: 'style-guide',
        status: args.status || 'published',
        visibility: 'public',
        custom_excerpt: 'A demonstration of every content card available in the Ghost editor.',
        lexical: L.buildDoc(children),
        // Title-case the collection tag so it matches the tag the demo posts
        // create (e.g. "Lorem" -> slug "lorem") rather than spawning a duplicate.
        tags: [{name: 'Style Guide'}, {name: titleCase(args.collectionTag || 'lorem')}]
    };

    if (assetManager && args.featureImages !== 'none' && args.featureImages !== false) {
        const feature = await assetManager.getImage({key: 'sg-feature', width: 1600, height: 900});
        post.feature_image = feature.url;
        post.feature_image_alt = 'Style Guide';
        post.feature_image_caption = 'The Style Guide feature image';
    }

    // When a dummy author exists, attribute the Style Guide to the primary
    // author with the dummy as a second author (owner stays primary).
    if (dummyAuthor && site.primaryAuthor) {
        post.authors = [{email: site.primaryAuthor.email}, {email: dummyAuthor.email}];
    }

    return post;
};

export {
    buildStyleGuide
};
