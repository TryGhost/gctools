// Builders for Ghost (Koenig) Lexical nodes.
//
// Ghost stores post/page content as a Lexical JSON document in the `lexical`
// field. These helpers produce the node shapes that Ghost's editor and
// server-side renderer (`@tryghost/kg-default-nodes`) understand, so content
// created here is fully editable in Ghost Admin.
//
// Text uses the `extended-text` node and headings use `extended-heading`, which
// is what Koenig serialises. Card nodes (image, gallery, callout, etc.) are
// always direct children of `root` — never nested inside a paragraph, which is
// a known cause of dropped image cards on the HTML->Lexical path.

// Lexical text-format bitmask (see lexical's TextNode format constants). These
// can be OR'd together, e.g. FORMAT_BOLD | FORMAT_ITALIC.
const FORMAT_BOLD = 1;
const FORMAT_ITALIC = 2;
const FORMAT_STRIKETHROUGH = 4;
const FORMAT_UNDERLINE = 8;
const FORMAT_CODE = 16;
const FORMAT_SUBSCRIPT = 32;
const FORMAT_SUPERSCRIPT = 64;
const FORMAT_HIGHLIGHT = 128;

// --- inline / text -------------------------------------------------------

const textNode = (text, format = 0) => {
    return {
        type: 'extended-text',
        detail: 0,
        format,
        mode: 'normal',
        style: '',
        text,
        version: 1
    };
};

const boldText = text => textNode(text, FORMAT_BOLD);
const italicText = text => textNode(text, FORMAT_ITALIC);
const strikeText = text => textNode(text, FORMAT_STRIKETHROUGH);
const underlineText = text => textNode(text, FORMAT_UNDERLINE);
const codeText = text => textNode(text, FORMAT_CODE);
const subscriptText = text => textNode(text, FORMAT_SUBSCRIPT);
const superscriptText = text => textNode(text, FORMAT_SUPERSCRIPT);
const highlightText = text => textNode(text, FORMAT_HIGHLIGHT);

const linkNode = (text, url) => {
    return {
        type: 'link',
        version: 1,
        rel: null,
        target: null,
        title: null,
        url,
        direction: 'ltr',
        format: '',
        indent: 0,
        children: [textNode(text)]
    };
};

// --- blocks --------------------------------------------------------------

const paragraph = (children = []) => {
    const kids = Array.isArray(children) ? children : [textNode(String(children))];
    return {
        type: 'paragraph',
        children: kids,
        direction: 'ltr',
        format: '',
        indent: 0,
        version: 1
    };
};

const heading = (text, tag = 'h2') => {
    return {
        type: 'extended-heading',
        tag,
        children: [textNode(text)],
        direction: 'ltr',
        format: '',
        indent: 0,
        version: 1
    };
};

const quote = (text) => {
    return {
        type: 'quote',
        children: [textNode(text)],
        direction: 'ltr',
        format: '',
        indent: 0,
        version: 1
    };
};

const aside = (text) => {
    return {
        type: 'aside',
        children: [textNode(text)],
        direction: 'ltr',
        format: '',
        indent: 0,
        version: 1
    };
};

const list = (items = [], {ordered = false} = {}) => {
    return {
        type: 'list',
        listType: ordered ? 'number' : 'bullet',
        tag: ordered ? 'ol' : 'ul',
        start: 1,
        direction: 'ltr',
        format: '',
        indent: 0,
        version: 1,
        children: items.map((item, index) => {
            const kids = Array.isArray(item) ? item : [textNode(String(item))];
            return {
                type: 'listitem',
                value: index + 1,
                children: kids,
                direction: 'ltr',
                format: '',
                indent: 0,
                version: 1
            };
        })
    };
};

const horizontalRule = () => {
    return {type: 'horizontalrule', version: 1};
};

// --- cards ---------------------------------------------------------------

const image = ({src, alt = '', caption = '', cardWidth = 'regular', width = null, height = null, href = ''}) => {
    return {
        type: 'image',
        version: 1,
        src,
        width,
        height,
        title: '',
        alt,
        caption,
        cardWidth,
        href
    };
};

const gallery = (images = [], caption = '') => {
    return {
        type: 'gallery',
        version: 1,
        caption,
        images: images.map((img, index) => {
            return {
                fileName: img.fileName || `image-${index}.jpg`,
                row: Math.floor(index / 3),
                width: img.width || 1200,
                height: img.height || 800,
                src: img.src,
                caption: img.caption || ''
            };
        })
    };
};

const callout = (text, {emoji = '💡', backgroundColor = 'blue'} = {}) => {
    return {
        type: 'callout',
        version: 1,
        calloutEmoji: emoji,
        calloutText: text,
        backgroundColor
    };
};

const toggle = (heading_, content) => {
    return {
        type: 'toggle',
        version: 1,
        heading: heading_,
        content: `<p>${content}</p>`
    };
};

const bookmark = ({url, title, description = '', icon = '', thumbnail = '', author = '', publisher = '', caption = ''}) => {
    return {
        type: 'bookmark',
        version: 1,
        url,
        caption,
        metadata: {
            url,
            title,
            description,
            icon,
            thumbnail,
            author,
            publisher
        }
    };
};

const button = ({text, url, alignment = 'center'}) => {
    return {
        type: 'button',
        version: 1,
        buttonText: text,
        buttonUrl: url,
        alignment
    };
};

// Header card (modern v2). Shape mirrors @tryghost/kg-default-nodes HeaderNode.
// `style` is 'dark' | 'light' | 'accent' | 'image'; when a backgroundImageSrc is
// supplied the card renders over the image.
const header = ({
    heading: head,
    subheading = '',
    buttonText = '',
    buttonUrl = '',
    size = 'small',
    style = 'dark',
    alignment = 'center',
    backgroundColor = '#000000',
    backgroundImageSrc = '',
    backgroundImageWidth = null,
    backgroundImageHeight = null,
    accentColor = '#FF1A75',
    textColor = '#FFFFFF',
    buttonColor = '#ffffff',
    buttonTextColor = '#000000',
    layout = 'full',
    backgroundSize = 'cover',
    swapped = false
}) => {
    return {
        type: 'header',
        version: 2,
        size,
        style,
        buttonEnabled: Boolean(buttonText && buttonUrl),
        buttonUrl,
        buttonText,
        header: head,
        subheader: subheading,
        backgroundImageSrc,
        accentColor,
        alignment,
        backgroundColor,
        backgroundImageWidth,
        backgroundImageHeight,
        backgroundSize,
        textColor,
        buttonColor,
        buttonTextColor,
        layout,
        swapped
    };
};

const markdown = (md) => {
    return {type: 'markdown', version: 1, markdown: md};
};

const html = (markup) => {
    return {type: 'html', version: 1, html: markup};
};

const audio = ({src, title = 'Audio', duration = 0, mimeType = 'audio/mpeg', thumbnailSrc = ''}) => {
    return {
        type: 'audio',
        version: 1,
        src,
        title,
        duration,
        mimeType,
        thumbnailSrc
    };
};

const video = ({src, caption = '', fileName = 'video.mp4', mimeType = 'video/mp4', width = 1280, height = 720, duration = 0, thumbnailSrc = '', ratio = 1.7778}) => {
    return {
        type: 'video',
        version: 1,
        src,
        caption,
        fileName,
        mimeType,
        width,
        height,
        duration,
        thumbnailSrc,
        customThumbnailSrc: '',
        thumbnailWidth: width,
        thumbnailHeight: height,
        cardWidth: 'regular',
        ratio,
        loop: false
    };
};

const embed = ({url, html: embedHtml = '', embedType = 'video', caption = '', metadata = {}}) => {
    return {
        type: 'embed',
        version: 1,
        url,
        html: embedHtml,
        embedType,
        caption,
        metadata
    };
};

// Syntax-highlighted code block. `language` is a Prism language slug.
const codeblock = ({code, language = '', caption = ''}) => {
    return {
        type: 'codeblock',
        version: 1,
        code,
        language,
        caption
    };
};

// Downloadable file card. `fileSize` is in bytes.
const file = ({src, fileTitle = '', fileCaption = '', fileName = '', fileSize = 0}) => {
    return {
        type: 'file',
        version: 1,
        src,
        fileTitle,
        fileCaption,
        fileName,
        fileSize
    };
};

// Product card with optional star rating and button.
const product = ({
    imageSrc = '',
    imageWidth = null,
    imageHeight = null,
    title = '',
    description = '',
    ratingEnabled = false,
    starRating = 5,
    buttonEnabled = false,
    buttonText = '',
    buttonUrl = ''
}) => {
    return {
        type: 'product',
        version: 1,
        productImageSrc: imageSrc,
        productImageWidth: imageWidth,
        productImageHeight: imageHeight,
        productTitle: title,
        productDescription: description,
        productRatingEnabled: ratingEnabled,
        productStarRating: starRating,
        productButtonEnabled: buttonEnabled,
        productButton: buttonText,
        productUrl: buttonUrl
    };
};

// Newsletter signup card.
const signup = ({
    header: head = '',
    subheader = '',
    disclaimer = '',
    buttonText = 'Subscribe',
    alignment = 'left',
    layout = 'wide',
    backgroundColor = '#F0F0F0',
    backgroundImageSrc = '',
    backgroundSize = 'cover',
    textColor = '#000000',
    buttonColor = 'accent',
    buttonTextColor = '#FFFFFF',
    successMessage = 'Email sent! Check your inbox to complete your signup.',
    labels = [],
    swapped = false
}) => {
    return {
        type: 'signup',
        version: 1,
        alignment,
        backgroundColor,
        backgroundImageSrc,
        backgroundSize,
        textColor,
        buttonColor,
        buttonTextColor,
        buttonText,
        disclaimer,
        header: head,
        layout,
        subheader,
        successMessage,
        swapped,
        labels
    };
};

// Public-preview / paywall divider. No properties — splits free/paid content.
const paywall = () => {
    return {type: 'paywall', version: 1};
};

// Email-only content card (renders in newsletters, not on the web).
const email = (markup) => {
    return {type: 'email', version: 1, html: markup};
};

// Email call-to-action card (newsletter only). `segment` is a members filter.
const emailCta = ({
    html: markup = '',
    buttonText = '',
    buttonUrl = '',
    alignment = 'left',
    segment = 'status:free',
    showButton = false,
    showDividers = true
}) => {
    return {
        type: 'email-cta',
        version: 1,
        alignment,
        buttonText,
        buttonUrl,
        html: markup,
        segment,
        showButton,
        showDividers
    };
};

// Default per-card visibility (everyone, on web + email).
const defaultVisibility = () => {
    const ALL = 'status:free,status:-free';
    return {
        web: {nonMember: true, memberSegment: ALL},
        email: {memberSegment: ALL}
    };
};

// Call-to-action card (front-end visible). Carries a `visibility` object.
const callToAction = ({
    textValue = '',
    layout = 'minimal',
    alignment = 'left',
    showButton = true,
    showDividers = true,
    buttonText = 'Learn more',
    buttonUrl = '',
    buttonColor = '#000000',
    buttonTextColor = '#ffffff',
    hasSponsorLabel = true,
    sponsorLabel = '<p><span style="white-space: pre-wrap;">SPONSORED</span></p>',
    backgroundColor = 'grey',
    linkColor = 'text',
    imageUrl = '',
    imageWidth = null,
    imageHeight = null
}) => {
    return {
        type: 'call-to-action',
        version: 1,
        layout,
        alignment,
        textValue,
        showButton,
        showDividers,
        buttonText,
        buttonUrl,
        buttonColor,
        buttonTextColor,
        hasSponsorLabel,
        sponsorLabel,
        backgroundColor,
        linkColor,
        imageUrl,
        imageWidth,
        imageHeight,
        visibility: defaultVisibility()
    };
};

// --- document ------------------------------------------------------------

// Wrap an array of block/card nodes into a complete Lexical root document and
// return it as the JSON string Ghost expects in the `lexical` field.
const buildDoc = (children = []) => {
    return JSON.stringify({
        root: {
            type: 'root',
            children,
            direction: 'ltr',
            format: '',
            indent: 0,
            version: 1
        }
    });
};

export {
    FORMAT_BOLD,
    FORMAT_ITALIC,
    FORMAT_STRIKETHROUGH,
    FORMAT_UNDERLINE,
    FORMAT_CODE,
    FORMAT_SUBSCRIPT,
    FORMAT_SUPERSCRIPT,
    FORMAT_HIGHLIGHT,
    textNode,
    boldText,
    italicText,
    strikeText,
    underlineText,
    codeText,
    subscriptText,
    superscriptText,
    highlightText,
    linkNode,
    paragraph,
    heading,
    quote,
    aside,
    list,
    horizontalRule,
    image,
    gallery,
    callout,
    toggle,
    bookmark,
    button,
    header,
    markdown,
    html,
    audio,
    video,
    embed,
    codeblock,
    file,
    product,
    signup,
    paywall,
    email,
    emailCta,
    callToAction,
    buildDoc
};
