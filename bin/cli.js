#!/usr/bin/env node
import prettyCLI from '@tryghost/pretty-cli';

prettyCLI.preface('Command line utilities for working with Ghost content');

import addMemberCompSubscriptionCommands from '../commands/add-member-comp.js';
import removeMemberCompSubscriptionCommands from '../commands/remove-member-comp.js';
import addMemberNewsletterSubscriptionCommands from '../commands/add-member-newsletter-subscription.js';
import addPreviewCommands from '../commands/add-preview.js';
import addTagsCommands from '../commands/add-tags.js';
import changeAuthorCommands from '../commands/change-author.js';
import addAuthorCommands from '../commands/add-author.js';
import changeRoleCommands from '../commands/change-role.js';
import changeStatusCommands from '../commands/change-status.js';
import changeVisibilityPostsCommands from '../commands/change-visibility-posts.js';
import changeVisibilityPagesCommands from '../commands/change-visibility-pages.js';
import combineTagsCommands from '../commands/combine-tags.js';
import contentStatsCommands from '../commands/content-stats.js';
import dedupeMembersCsvCommands from '../commands/dedupe-members-csv.js';
import compareMemberCsvCommands from '../commands/compare-member-csv.js';
import deleteUnusedTagsCommands from '../commands/delete-unused-tags.js';
import deletePagesCommands from '../commands/delete-pages.js';
import deletePostsCommands from '../commands/delete-posts.js';
import deleteTagsCommands from '../commands/delete-tags.js';
import deleteLabelsCommands from '../commands/delete-labels.js';
import fetchAssetsCommands from '../commands/fetch-assets.js';
import findReplaceCommands from '../commands/find-replace.js';
import interactiveCommands from '../commands/interactive.js';
import jsonCleanCommands from '../commands/json-clean.js';
import jsonSplitCommands from '../commands/json-split.js';
import randomPostCommands from '../commands/random-post.js';
import zipCreateCommands from '../commands/zip-create.js';
import zipSplitCommands from '../commands/zip-split.js';
import changeTags from '../commands/change-tags.js';
import postTiers from '../commands/post-tiers.js';
import pageToPost from '../commands/page-to-post.js';
import getPosts from '../commands/get-posts.js';
import setTemplate from '../commands/set-template.js';
import addMemberCompFromCSVCommands from '../commands/add-member-comp-from-csv.js';
import setFeaturedImages from '../commands/set-featured-images.js';
import setPodcast from '../commands/set-podcast.js';
import cleanSlugs from '../commands/clean-slugs.js';
import commentNotifications from '../commands/comment-notifications.js';
import memberNewsletterBackup from '../commands/member-newsletter-backup.js';

prettyCLI.command(addMemberCompSubscriptionCommands);
prettyCLI.command(removeMemberCompSubscriptionCommands);
prettyCLI.command(addMemberNewsletterSubscriptionCommands);
prettyCLI.command(addPreviewCommands);
prettyCLI.command(addTagsCommands);
prettyCLI.command(changeAuthorCommands);
prettyCLI.command(addAuthorCommands);
prettyCLI.command(changeRoleCommands);
prettyCLI.command(changeStatusCommands);
prettyCLI.command(changeVisibilityPostsCommands);
prettyCLI.command(changeVisibilityPagesCommands);
prettyCLI.command(combineTagsCommands);
prettyCLI.command(contentStatsCommands);
prettyCLI.command(dedupeMembersCsvCommands);
prettyCLI.command(compareMemberCsvCommands);
prettyCLI.command(deleteUnusedTagsCommands);
prettyCLI.command(deletePagesCommands);
prettyCLI.command(deletePostsCommands);
prettyCLI.command(deleteTagsCommands);
prettyCLI.command(deleteLabelsCommands);
prettyCLI.command(fetchAssetsCommands);
prettyCLI.command(findReplaceCommands);
prettyCLI.command(interactiveCommands);
prettyCLI.command(jsonCleanCommands);
prettyCLI.command(jsonSplitCommands);
prettyCLI.command(randomPostCommands);
prettyCLI.command(zipCreateCommands);
prettyCLI.command(zipSplitCommands);
prettyCLI.command(changeTags);
prettyCLI.command(postTiers);
prettyCLI.command(pageToPost);
prettyCLI.command(getPosts);
prettyCLI.command(setTemplate);
prettyCLI.command(addMemberCompFromCSVCommands);
prettyCLI.command(setFeaturedImages);
prettyCLI.command(setPodcast);
prettyCLI.command(cleanSlugs);
prettyCLI.command(commentNotifications);
prettyCLI.command(memberNewsletterBackup);

prettyCLI.style({
    usageCommandPlaceholder: () => '<source or utility>'
});

prettyCLI.groupOrder([
    'Interactive:',
    'Tools:',
    'Content:',
    'Members:',
    'Staff:',
    'Global Options:',
    'Beta:'
]);

prettyCLI.parseAndExit();
