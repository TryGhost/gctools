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
import deleteEmptyTags from './delete-empty-tags.js';
import findReplace from './find-replace.js';
import changeAuthor from './change-author.js';
import changeVisibility from './change-visibility.js';
import changeStatus from './change-status.js';
import deleteMembers from './delete-members.js';
import changeRole from './change-role.js';
import addMemberNewsletterSubscription from './add-member-newsletter-subscription.js';
import removeMemberNewsletterSubscription from './remove-member-newsletter-subscription.js';
import contentStats from './content-stats.js';
import dedupeMembersCsv from './dedupe-members-csv.js';

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
    deleteEmptyTags,
    findReplace,
    changeAuthor,
    changeVisibility,
    changeStatus,
    deleteMembers,
    changeRole,
    addMemberNewsletterSubscription,
    removeMemberNewsletterSubscription,
    contentStats,
    dedupeMembersCsv
};
