import {filterBuilder} from '../lib/filter-builder.js';

import tagsObject from './fixtures/tags.json';
import authorsObject from './fixtures/authors.json';
import newslettersObject from './fixtures/newsletters.json';
import labelsObject from './fixtures/labels.json';

describe('Filter builder', function () {
    describe('Authors', function () {
        test('Include authors', function () {
            const filter = filterBuilder({
                authors: authorsObject
            });

            expect(filter).toEqual('author:[ghost-user]+author:[sample-user]');
        });

        test('Exclude authors', async function () {
            const filter = filterBuilder({
                notAuthors: authorsObject
            });

            expect(filter).toEqual('author:-[ghost-user]+author:-[sample-user]');
        });

        test('Inluce & exclude authors', async function () {
            const filter = filterBuilder({
                authors: authorsObject.slice(0, 1),
                notAuthors: authorsObject.slice(1, 2)
            });

            expect(filter).toEqual('author:[ghost-user]+author:-[sample-user]');
        });
    });

    describe('Tags', function () {
        test('Include tags', async function () {
            const filter = filterBuilder({
                tags: tagsObject
            });

            expect(filter).toEqual('tag:[lorem-ipsum]+tag:[dolor-simet]');
        });

        test('Exclude tags', async function () {
            const filter = filterBuilder({
                notTags: tagsObject
            });

            expect(filter).toEqual('tag:-[lorem-ipsum]+tag:-[dolor-simet]');
        });

        test('Inluce & exclude tags', async function () {
            const filter = filterBuilder({
                tags: tagsObject.slice(0, 1),
                notTags: tagsObject.slice(1, 2)
            });

            expect(filter).toEqual('tag:[lorem-ipsum]+tag:-[dolor-simet]');
        });
    });

    describe('Newsletters', function () {
        test('Include newsletters', async function () {
            const filter = filterBuilder({
                newsletters: newslettersObject
            });

            expect(filter).toEqual('newsletters:[default-newsletter]+newsletters:[weekly-edition]');
        });

        test('Exclude newsletters', async function () {
            const filter = filterBuilder({
                notNewsletters: newslettersObject
            });

            expect(filter).toEqual('newsletters:-[default-newsletter]+newsletters:-[weekly-edition]');
        });

        test('Include & exclude newsletters', async function () {
            const filter = filterBuilder({
                newsletters: newslettersObject.slice(0, 1),
                notNewsletters: newslettersObject.slice(1, 2)
            });

            expect(filter).toEqual('newsletters:[default-newsletter]+newsletters:-[weekly-edition]');
        });
    });

    describe('Labels', function () {
        test('Include labels', async function () {
            const filter = filterBuilder({
                labels: labelsObject
            });

            expect(filter).toEqual('label:[lorem]+label:[ipsum]+label:[dolor-simet]');
        });

        test('Exclude labels', async function () {
            const filter = filterBuilder({
                notLabels: labelsObject
            });

            expect(filter).toEqual('label:-[lorem]+label:-[ipsum]+label:-[dolor-simet]');
        });

        test('Include and exclude labels', async function () {
            const filter = filterBuilder({
                labels: labelsObject.slice(0, 1),
                notLabels: labelsObject.slice(1,2)
            });

            expect(filter).toEqual('label:[lorem]+label:-[ipsum]');
        });
    });

    describe('Visibility', function () {
        test('Include visibility', async function () {
            const filter = filterBuilder({
                visibility: ['member', 'paid']
            });

            expect(filter).toEqual('visibility:[member]+visibility:[paid]');
        });

        test('Exclude visibility', async function () {
            const filter = filterBuilder({
                notVisibility: ['member', 'paid']
            });

            expect(filter).toEqual('visibility:-[member]+visibility:-[paid]');
        });

        test('Include & exclude visibility', async function () {
            const filter = filterBuilder({
                visibility: ['member'],
                notVisibility: ['paid']
            });

            expect(filter).toEqual('visibility:[member]+visibility:-[paid]');
        });

        test('Skips visibility if contains `all`', async function () {
            const filter = filterBuilder({
                visibility: ['member', 'paid', 'all']
            });

            expect(filter).toEqual('');
        });
    });

    describe('Combinations', function () {
        test('Include visibility', async function () {
            const filter = filterBuilder({
                authors: authorsObject.slice(0, 1),
                notAuthors: authorsObject.slice(1, 2),
                tags: tagsObject.slice(0, 1),
                notTags: tagsObject.slice(1, 2),
                newsletters: newslettersObject.slice(0, 1),
                notNewsletters: newslettersObject.slice(1, 2),
                labels: labelsObject.slice(0, 1),
                notLabels: labelsObject.slice(1,2),
                visibility: ['member', 'paid']
            });

            expect(filter).toEqual('author:[ghost-user]+author:-[sample-user]+tag:[lorem-ipsum]+tag:-[dolor-simet]+visibility:[member]+visibility:[paid]+newsletters:[default-newsletter]+newsletters:-[weekly-edition]+label:[lorem]+label:-[ipsum]');
        });
    });
});
