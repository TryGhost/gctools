import {setVisibility} from '../lib/change-visibility.js';

import posts from './fixtures/posts.json';
import pages from './fixtures/pages.json';

describe('Change post visibility', function () {
    test('Leave visibility unchanged if no value is supplied', async function () {
        const thePosts = setVisibility(posts);

        expect(thePosts).toBeArray();
        expect(thePosts).toHaveLength(10);

        expect(thePosts[0].visibility).toEqual('public');
        expect(thePosts[1].visibility).toEqual('public');
        expect(thePosts[2].visibility).toEqual('public');
        expect(thePosts[3].visibility).toEqual('public');
        expect(thePosts[4].visibility).toEqual('paid');
        expect(thePosts[5].visibility).toEqual('public');
        expect(thePosts[6].visibility).toEqual('public');
        expect(thePosts[7].visibility).toEqual('public');
        expect(thePosts[8].visibility).toEqual('members');
        expect(thePosts[9].visibility).toEqual('paid');
    });

    test('Changed post visibility to be paid-only', async function () {
        const paidPosts = setVisibility(posts, 'paid');

        expect(paidPosts).toBeArray();
        expect(paidPosts).toHaveLength(10);

        paidPosts.forEach((post) => {
            expect(post.type).toEqual('post');
            expect(post.visibility).toEqual('paid');
        });
    });

    test('Changed page visibility to be members-only', async function () {
        const membersPages = setVisibility(pages, 'members');

        expect(membersPages).toBeArray();
        expect(membersPages).toHaveLength(2);

        membersPages.forEach((post) => {
            expect(post.type).toEqual('page');
            expect(post.visibility).toEqual('members');
        });
    });
});
