import {getRandomPostContent} from '../lib/generate.js';

describe('Generate random posts', function () {
    test('Creates a random post with default settings', async function () {
        const post = getRandomPostContent();

        expect(post.status).toBeString();
        expect(post.visibility).toBeString();
        expect(post.title).toBeString();
        expect(post.excerpt).toBeString();
        expect(post.html).toBeString();
        expect(post.html.split('\n').length).toEqual(10);
        expect(post.tags).toBeArray();
        expect(post.tags).toBeArrayOfSize(1);
        expect(post.tags[0]).toEqual('#gctools');
        expect(post.created_at).toBeDateString();
        expect(post.updated_at).toBeDateString();
        expect(post.published_at).toBeDateString();
    });

    test('Set title size', async function () {
        const post = getRandomPostContent({
            titleMinLength: 2,
            titleMaxLength: 4
        });

        expect(post.title.split(' ').length).toBeWithin(1, 5);
    });

    test('Set number of words per sentence', async function () {
        const post = getRandomPostContent({
            sentenceLowerBound: 2,
            sentenceUpperBound: 4
        });

        const postParagraphs = post.html.split('\n');
        const firstSentances = postParagraphs[0].replace('<p>', '').replace('</p>', '').match(/([^ \r\n][^!?\.\r\n]+[\w!?\.]+)/g);
        const firstSentenceWords = firstSentances[0].split(' ');
        const secondSentenceWords = firstSentances[1].split(' ');

        expect(firstSentenceWords.length).toBeWithin(1, 5);
        expect(secondSentenceWords.length).toBeWithin(1, 5);
    });

    test('Set number of sentences per paragraphs', async function () {
        const post = getRandomPostContent({
            paragraphLowerBound: 2,
            paragraphUpperBound: 4
        });

        const postParagraphs = post.html.split('\n');
        const firstSentances = postParagraphs[0].replace('<p>', '').replace('</p>', '').match(/([^ \r\n][^!?\.\r\n]+[\w!?\.]+)/g);

        expect(firstSentances.length).toBeWithin(1, 5);
    });

    test('Set number of paragraphs', async function () {
        const post = getRandomPostContent({
            contentCount: 3
        });

        expect(post.html.split('\n').length).toEqual(3);
    });

    test('Can set the status', async function () {
        const post = getRandomPostContent({
            status: 'draft'
        });

        expect(post.status).toEqual('draft');
    });

    test('Can set the visibility', async function () {
        const post = getRandomPostContent({
            visibility: 'paid'
        });

        expect(post.visibility).toEqual('paid');
    });

    test('Define the start & end date range', async function () {
        const post = getRandomPostContent({
            startDate: '2020-06-23T15:01:50.735Z',
            endDate: '2021-06-23T15:01:50.735Z'
        });

        expect(post.created_at).toBeDateString();
        expect(post.created_at).toBeAfterOrEqualTo(new Date('2020-06-23T15:01:50.735Z'));
        expect(post.created_at).toBeBeforeOrEqualTo(new Date('2021-06-23T15:01:50.735Z'));

        expect(post.updated_at).toBeDateString();
        expect(post.updated_at).toBeAfterOrEqualTo(new Date('2020-06-23T15:01:50.735Z'));
        expect(post.updated_at).toBeBeforeOrEqualTo(new Date('2021-06-23T15:01:50.735Z'));

        expect(post.published_at).toBeDateString();
        expect(post.published_at).toBeAfterOrEqualTo(new Date('2020-06-23T15:01:50.735Z'));
        expect(post.published_at).toBeBeforeOrEqualTo(new Date('2021-06-23T15:01:50.735Z'));
    });
});


// --startDate '2020-06-23T15:01:50.735Z'
// --endDate '2022-06-23T15:01:50.735Z'

// status: 'published',
// visibility: 'public',
// title: 'Eu Ullamco Occaecat Minim Cupidatat Qui',
// excerpt: 'Fugiat dolore pariatur sint esse labore officia fugiat minim sit do elit. Et voluptate veniam Lorem irure magna labore amet et ipsum tempor sint ea culpa veniam.',
// html: '<p>Est reprehenderit minim est eiusmod velit ex sint est eu. Id ut consectetur aliqua aliqua labore mollit esse anim qui dolor. Dolore mollit tempor non dolor ipsum dolore magna exercitation velit mollit sit labore nisi. Adipisicing commodo mollit anim nostrud eiusmod ullamco ipsum culpa sint.</p>\n' +
//     '<p>Reprehenderit cillum incididunt sint dolore ea irure sunt. Aliqua duis qui nostrud qui ipsum exercitation deserunt. Duis et aliqua sit excepteur est.</p>\n' +
//     '<p>Nisi tempor fugiat incididunt ad qui velit ex. Proident qui sint. Qui et reprehenderit officia irure anim aliqua voluptate id anim aliqua. Eiusmod dolore Lorem irure dolore velit ea ipsum commodo do consequat.</p>\n' +
//     '<p>Non id id ea ullamco aliqua incididunt excepteur ea anim mollit reprehenderit cillum. Voluptate ea reprehenderit est ut non excepteur ut Lorem amet Lorem labore Lorem consequat nostrud. Sunt aute officia do labore non sint amet adipisicing eu sunt commodo et. Exercitation aute consequat velit aliquip aliquip. Cupidatat sit dolor adipisicing voluptate sit.</p>\n' +
//     '<p>Dolor officia pariatur esse reprehenderit veniam magna ullamco veniam ad nulla in. Exercitation consequat tempor amet adipisicing dolor exercitation ullamco id ullamco eu. Adipisicing est qui in ullamco reprehenderit esse enim eu veniam ad dolor ullamco. Proident proident sunt non ut do amet sit commodo ullamco deserunt. Quis nisi deserunt minim duis.</p>\n' +
//     '<p>Proident irure esse nulla officia voluptate magna non. Est in non eu ullamco sit ea. Enim qui et esse occaecat laborum exercitation quis magna voluptate qui enim non. Labore ex aliqua incididunt mollit anim dolor ut eu. Labore deserunt officia labore pariatur deserunt nulla elit incididunt exercitation excepteur.</p>\n' +
//     '<p>Non id duis mollit officia qui incididunt magna amet consequat magna. Occaecat non deserunt anim elit id nostrud excepteur consectetur magna minim non laborum esse. Lorem consectetur ut ipsum dolor nulla consectetur incididunt nisi tempor voluptate eiusmod deserunt Lorem. Ipsum sit minim fugiat adipisicing irure aute.</p>\n' +
//     '<p>Sint culpa consectetur minim duis consectetur dolore non laborum cillum consectetur ex. Fugiat incididunt laborum veniam adipisicing. Lorem nisi veniam aute eu duis duis officia quis laborum veniam ad. Ullamco voluptate ad. Nisi minim fugiat pariatur id quis amet occaecat proident pariatur Lorem.</p>\n' +
//     '<p>Do occaecat occaecat ex irure cupidatat fugiat cupidatat. Adipisicing quis culpa. Adipisicing est commodo ut veniam exercitation ea ipsum amet non irure labore. Eiusmod nostrud enim sint ex deserunt quis. Exercitation nostrud pariatur ipsum magna esse. Commodo elit excepteur esse proident.</p>\n' +
//     '<p>Nisi tempor ullamco magna anim sit incididunt do anim ipsum occaecat labore consectetur nulla magna. Mollit velit commodo exercitation. Commodo occaecat commodo veniam eu voluptate elit commodo labore culpa commodo culpa.</p>',
// tags: [ '#gctools' ],
// created_at: 2022-06-23T19:35:35.608Z,
// updated_at: 2022-06-23T19:35:35.608Z,
// published_at: 2022-06-23T19:35:35.608Z


expect(new Date('01/01/2019')).toBeAfterOrEqualTo(new Date('01/01/2018'));
expect(new Date('01/01/2019')).toBeAfterOrEqualTo(new Date('01/01/2019'));
