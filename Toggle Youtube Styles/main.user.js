// ==UserScript==
// @name        Toggle Youtube Styles
// @license     MIT
// @namespace   rtonne
// @match       https://www.youtube.com/*
// @icon        https://www.google.com/s2/favicons?sz=64&domain=youtube.com
// @version     1.5
// @author      Rtonne
// @description Adds toggles to enable/disable some styles that change Youtube
// @require     https://update.greasyfork.org/scripts/498119/1395413/setupToggleCommands.js
// @grant       GM.addStyle
// @grant       GM.registerMenuCommand
// @grant       GM.unregisterMenuCommand
// @grant       GM.getValue
// @grant       GM.setValue
// ==/UserScript==

const commands = [
  {
    id: "guide_sections",
    default: true,
    on_text: "☑ Guide Sections",
    off_text: "☐ Guide Sections",
    toggleOnFunction: () =>
      GM.addStyle(`
      #sections.ytd-guide-renderer > ytd-guide-section-renderer:nth-child(n+3) {
        display: unset;
      }
    `),
    toggleOffFunction: () =>
      GM.addStyle(`
      #sections.ytd-guide-renderer > ytd-guide-section-renderer:nth-child(n+3) {
        display: none;
      }
    `),
  },
  {
    id: "comments",
    default: true,
    on_text: "☑ Comments",
    off_text: "☐ Comments",
    toggleOnFunction: () =>
      GM.addStyle(`
      ytd-comments#comments {
        display: unset;
      }
    `),
    toggleOffFunction: () =>
      GM.addStyle(`
      ytd-comments#comments {
        display: none;
      }
    `),
  },
  {
    id: "related_videos",
    default: true,
    on_text: "☑ Related Videos",
    off_text: "☐ Related Videos",
    toggleOnFunction: () =>
      GM.addStyle(`
      #secondary.ytd-watch-flexy > #secondary-inner > #related {
        display: unset;
      }
    `),
    toggleOffFunction: () =>
      GM.addStyle(`
      #secondary.ytd-watch-flexy > #secondary-inner > #related {
        display: none;
      }
    `),
  },
  {
    id: "shorts",
    default: true,
    on_text: "☑ Shorts",
    off_text: "☐ Shorts",
    toggleOnFunction: () =>
      GM.addStyle(`
      ytd-rich-section-renderer:has(> div > [is-shorts]) {
        display: unset;
      }
    `),
    toggleOffFunction: () =>
      GM.addStyle(`
      ytd-rich-section-renderer:has(> div > [is-shorts]) {
        display: none;
      }
    `),
  },
  {
    id: "community",
    default: true,
    on_text: "☑ Community Posts",
    off_text: "☐ Community Posts",
    toggleOnFunction: () =>
      GM.addStyle(`
      ytd-rich-section-renderer:has(> div > :not([is-shorts]):not([thumbnail-style])) {
        display: unset;
      }
    `),
    toggleOffFunction: () =>
      GM.addStyle(`
      ytd-rich-section-renderer:has(> div > :not([is-shorts]):not([thumbnail-style])) {
        display: none;
      }
    `),
  },
];

setupToggleCommands(commands);
