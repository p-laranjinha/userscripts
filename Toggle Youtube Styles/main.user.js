// ==UserScript==
// @name        Toggle Youtube Styles
// @license     MIT
// @namespace   rtonne
// @match       https://www.youtube.com/*
// @icon        https://www.google.com/s2/favicons?sz=64&domain=youtube.com
// @version     1.3
// @author      Rtonne
// @description Adds toggles to enable/disable some styles that change Youtube
// @grant       GM.addStyle
// @grant       GM.registerMenuCommand
// @grant       GM.unregisterMenuCommand
// @grant       GM.getValue
// @grant       GM.setValue
// @downloadURL https://update.greasyfork.org/scripts/493625/Toggle%20Youtube%20Styles.user.js
// @updateURL https://update.greasyfork.org/scripts/493625/Toggle%20Youtube%20Styles.meta.js
// ==/UserScript==

// To check if inplace command replacement is supported
// https://violentmonkey.github.io/api/gm/#gm_registermenucommand
const inplace =
  "test" === GM.registerMenuCommand("test", () => {}, { id: "test" });
GM.unregisterMenuCommand("test");

const commands = [
  {
    id: "guide_sections",
    disabled_caption: "☑ Guide Sections",
    enabled_caption: "☐ Guide Sections",
    disableStyle: () =>
      GM.addStyle(`
      #sections.ytd-guide-renderer > ytd-guide-section-renderer:nth-child(n+3) {
        display: unset;
      }
    `),
    enableStyle: () =>
      GM.addStyle(`
      #sections.ytd-guide-renderer > ytd-guide-section-renderer:nth-child(n+3) {
        display: none;
      }
    `),
  },
  {
    id: "comments",
    disabled_caption: "☑ Comments",
    enabled_caption: "☐ Comments",
    disableStyle: () =>
      GM.addStyle(`
      ytd-comments#comments {
        display: unset;
      }
    `),
    enableStyle: () =>
      GM.addStyle(`
      ytd-comments#comments {
        display: none;
      }
    `),
  },
  {
    id: "related_videos",
    disabled_caption: "☑ Related Videos",
    enabled_caption: "☐ Related Videos",
    disableStyle: () =>
      GM.addStyle(`
      #secondary.ytd-watch-flexy > #secondary-inner > #related {
        display: unset;
      }
    `),
    enableStyle: () =>
      GM.addStyle(`
      #secondary.ytd-watch-flexy > #secondary-inner > #related {
        display: none;
      }
    `),
  },
  {
    id: "shorts",
    disabled_caption: "☑ Shorts",
    enabled_caption: "☐ Shorts",
    disableStyle: () =>
      GM.addStyle(`
      ytd-rich-section-renderer:has(> div > [is-shorts]) {
        display: unset;
      }
    `),
    enableStyle: () =>
      GM.addStyle(`
      ytd-rich-section-renderer:has(> div > [is-shorts]) {
        display: none;
      }
    `),
  },
  {
    id: "community",
    disabled_caption: "☑ Community Posts",
    enabled_caption: "☐ Community Posts",
    disableStyle: () =>
      GM.addStyle(`
      ytd-rich-section-renderer:has(> div > :not([is-shorts])) {
        display: unset;
      }
    `),
    enableStyle: () =>
      GM.addStyle(`
      ytd-rich-section-renderer:has(> div > :not([is-shorts])) {
        display: none;
      }
    `),
  },
];

for (const command of commands) {
  setCommand(command);
}
registerAllCommands();

async function registerAllCommands() {
  for (const command of commands) {
    GM.registerMenuCommand(
      await getCaption(command),
      () => toggleCommand(command),
      { id: command.id, autoClose: false }
    );
  }
}
async function unregisterAllCommands() {
  for (const command of commands) {
    GM.unregisterMenuCommand(command.id);
  }
}
async function toggleCommand(command) {
  await GM.setValue(command.id, !(await GM.getValue(command.id, false)));
  setCommand(command);
  if (inplace) {
    GM.registerMenuCommand(
      await getCaption(command),
      () => toggleCommand(command),
      { id: command.id, autoClose: false }
    );
  } else {
    unregisterAllCommands();
    registerAllCommands();
  }
}
async function setCommand(command) {
  if (await GM.getValue(command.id, false)) {
    command.enableStyle();
  } else {
    command.disableStyle();
  }
}
async function getCaption(command) {
  let caption = command.enabled_caption;
  if (!(await GM.getValue(command.id, false))) {
    caption = command.disabled_caption;
  }
  return caption;
}
