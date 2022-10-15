import _ from 'lodash';
import {titleCase} from 'title-case';
import {loremIpsum} from 'lorem-ipsum';
import {maybeStringToArray} from '../lib/utils.js';

const getRandomPostContent = async (options) => {
    const args = _.defaultsDeep(options, {
        titleMinLength: 3,
        titleMaxLength: 8,
        status: 'published',
        visibility: 'public',
        contentCount: 10,
        paragraphLowerBound: 3,
        paragraphUpperBound: 7,
        sentenceLowerBound: 3,
        sentenceUpperBound: 15,
        contentUnit: 'paragraphs',
        author: false,
        tag: '#gctools'
    });

    let titleLength = Math.floor(Math.random() * (args.titleMaxLength - args.titleMinLength + 1)) + args.titleMinLength;

    let post = {
        status: args.status,
        visibility: args.visibility,
        title: loremIpsum({
            count: titleLength,
            units: 'words'
        }),
        excerpt: loremIpsum({
            count: 2,
            units: 'sentences'
        }),
        html: loremIpsum({
            count: args.contentCount,
            format: 'html',
            paragraphLowerBound: args.paragraphLowerBound, // Min. number of sentences per paragraph.
            paragraphUpperBound: args.paragraphUpperBound, // Max. number of sentences per paragraph.
            random: Math.random,
            sentenceLowerBound: args.sentenceLowerBound, // Min. number of words per sentence.
            sentenceUpperBound: args.sentenceUpperBound, // Max. number of words per sentence.
            suffix: '\n',
            units: args.contentUnit,
            words: undefined
        })
    };

    post.title = titleCase(post.title);

    if (args.author) {
        post.authors = maybeStringToArray(args.author);
    }

    if (args.tag) {
        post.tags = maybeStringToArray(args.tag);
    }

    if (args.dateRange) {
        let startDate = new Date(args.dateRange.start);
        let endDate = new Date(args.dateRange.end);

        const randomDate = new Date(startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime()));

        post.created_at = randomDate;
        post.updated_at = randomDate;
        post.published_at = randomDate;
    }

    if (!args.dateRange) {
        const dateNow = new Date();
        post.created_at = dateNow;
        post.updated_at = dateNow;
        post.published_at = dateNow;
    }

    return post;
};

export {
    getRandomPostContent
};
