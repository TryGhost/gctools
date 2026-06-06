import {loremIpsum} from 'lorem-ipsum';
import * as L from './lexical-cards.js';

// Build the /about page object. Used to create or overwrite the page at
// /about. Includes a short intro, a feature image (when images are enabled),
// and a couple of sections.
const buildAboutPage = async ({assetManager, args}) => {
    const children = [
        L.paragraph([L.textNode(loremIpsum({count: 3, units: 'sentences'}))]),
        L.heading('Our story', 'h2'),
        L.paragraph([L.textNode(loremIpsum({count: 4, units: 'sentences'}))])
    ];

    if (assetManager && args.imageCards !== false) {
        const img = await assetManager.getImage({key: 'about-inline', width: 1200, height: 800});
        children.push(L.image({
            src: img.url,
            alt: 'About image',
            caption: 'Placeholder imagery',
            width: img.width,
            height: img.height
        }));
    }

    children.push(L.heading('What we do', 'h2'));
    children.push(L.paragraph([L.textNode(loremIpsum({count: 4, units: 'sentences'}))]));

    const page = {
        title: 'About',
        slug: 'about',
        status: 'published',
        lexical: L.buildDoc(children)
    };

    if (assetManager && args.featureImages !== 'none' && args.featureImages !== false) {
        const feature = await assetManager.getImage({key: 'about-feature', width: 1600, height: 900});
        page.feature_image = feature.url;
        page.feature_image_alt = 'About';
    }

    return page;
};

export {
    buildAboutPage
};
