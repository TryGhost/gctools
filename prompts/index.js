/* eslint-disable max-lines */

import zipSplit from './zip-split.js';
import zipCreate from './zip-create.js';
import jsonSplit from './json-split.js';
import fetchAssets from './fetch-assets.js';
import randomPosts from './random-posts.js';
import deletePosts from './delete-posts.js';
import deletePages from './delete-pages.js';
import addTags from './add-tags.js';
import combineTags from './combine-tags.js';
import addPreview from './add-preview.js';
import deleteTags from './delete-tags.js';
import deleteLabels from './delete-labels.js';
import deleteUnusedTags from './delete-unused-tags.js';
import findReplace from './find-replace.js';
import changeAuthor from './change-author.js';
import addAuthor from './add-author.js';
import changeVisibilityPosts from './change-visibility-posts.js';
import changeVisibilityPages from './change-visibility-pages.js';
import changeStatus from './change-status.js';
import changeRole from './change-role.js';
import contentStats from './content-stats.js';
import dedupeMembersCsv from './dedupe-members-csv.js';
import compareMemberCsv from './compare-member-csv.js';
import addMemberNewsletterSubscription from './add-member-newsletter-subscription.js';
import addMemberCompSubscription from './add-member-comp-subscription.js';
import removeMemberCompSubscription from './remove-member-comp-subscription.js';
import postTiers from './post-tiers.js';
import getPosts from './get-posts.js';
import setTemplate from './set-template.js';

export default {
    zipSplit,
    zipCreate,
    jsonSplit,
    fetchAssets,
    randomPosts,
    deletePosts,
    deletePages,
    addTags,
    combineTags,
    addPreview,
    deleteTags,
    deleteLabels,
    deleteUnusedTags,
    findReplace,
    changeAuthor,
    addAuthor,
    changeVisibilityPosts,
    changeVisibilityPages,
    changeStatus,
    changeRole,
    addMemberNewsletterSubscription,
    addMemberCompSubscription,
    removeMemberCompSubscription,
    contentStats,
    dedupeMembersCsv,
    compareMemberCsv,
    postTiers,
    getPosts,
    setTemplate
};
