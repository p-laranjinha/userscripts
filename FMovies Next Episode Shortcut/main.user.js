// ==UserScript==
// @name        FMovies Next Episode Shortcut
// @license     MIT
// @namespace   rtonne
// @match       https://*/*
// @icon        https://www.google.com/s2/favicons?sz=64&domain=fmovies24.to
// @version     2.0
// @author      Rtonne
// @description Adds a shortcut to go to the next episode
// @run-at      document-end
// @grant       GM.setValue
// @grant       GM.getValue
// @grant       GM.addValueChangeListener
// @grant       GM.registerMenuCommand
// ==/UserScript==

// Movies are probably not be needed, but there might an exception so I'll include them
const URL_REGEX = /^https:\/\/fmovies24.to\/((tv)|(movie))\/.+$/;
const IS_FMOVIES_VALUE_KEY = "is_FMovies";
const NEXT_EPISODE_VALUE_KEY = "next_episode";
const KEY_CODE_VALUE_KEY = "key_code";
const DEFAULT_KEY_CODE = "KeyN";

let pauseKeydownListener = false;

GM.registerMenuCommand("Set new shortcut key", () => {
  pauseKeydownListener = true;
  const modal = document.createElement("div");
  modal.style.position = "fixed";
  modal.style.inset = "0";
  modal.style.width = "100vw";
  modal.style.height = "100vh";
  modal.style.backgroundColor = "rgba(0,0,0,0.8)";
  modal.style.display = "flex";
  modal.style.justifyContent = "center";
  modal.style.alignItems = "center";
  document.body.append(modal);
  const modal_content = document.createElement("div");
  modal_content.style.padding = "8px";
  modal_content.style.borderRadius = "3px";
  modal_content.style.backgroundColor = "dimgrey";
  modal_content.style.color = "white";
  modal_content.innerText =
    "Click the window and press the key for the new shortcut.";
  modal.append(modal_content);

  function listenerFunction(event) {
    // Escape doesn't work
    if (event.code === "Escape") {
      return;
    }
    modal.remove();
    GM.setValue(KEY_CODE_VALUE_KEY, event.code);
    pauseKeydownListener = false;
    document.removeEventListener("keydown", listenerFunction);
  }

  document.addEventListener("keydown", listenerFunction);
});

GM.registerMenuCommand("Reset shortcut key", () => {
  GM.setValue(KEY_CODE_VALUE_KEY, DEFAULT_KEY_CODE);
});

if (window.top === window.self) {
  // Run this with regular websites
  topWebsite();
} else {
  // Run this with iframes
  iFrame();
}

function topWebsite() {
  const isFMovies = !URL_REGEX.test(window.location.href);
  // If top website is not FMovies, make it known and return
  if (isFMovies) {
    GM.setValue(IS_FMOVIES_VALUE_KEY, false);
    return;
  }

  // Add a focus event listener to the window because changing tabs can set "is_FMovies" to false
  window.addEventListener("focus", () => {
    GM.setValue(IS_FMOVIES_VALUE_KEY, true);
  });
  // Add a blur event listener to the window so that another tab's iframe
  // shouldn't get the keydown event listener added
  window.addEventListener("blur", () => {
    GM.setValue(IS_FMOVIES_VALUE_KEY, false);
  });

  GM.setValue(IS_FMOVIES_VALUE_KEY, true);
  addKeydown();

  GM.setValue(NEXT_EPISODE_VALUE_KEY, false);
  GM.addValueChangeListener(NEXT_EPISODE_VALUE_KEY, (_, __, next_episode) => {
    if (next_episode) {
      GM.setValue(NEXT_EPISODE_VALUE_KEY, false);
      goToNextEpisode();
    }
  });
}

async function iFrame() {
  let isFMovies = await GM.getValue(IS_FMOVIES_VALUE_KEY, false);
  // This commented code section shouldn't be required because iframes are loaded by the user.
  // And if it wasn't commented, there was the risk of another window's iframes having this event listener added.
  // if (!isFMovies) {
  //   GM.addValueChangeListener(IS_FMOVIES_VALUE_KEY, (_, __, isFMovies) => {
  //     if (isFMovies) {
  //       addKeydown();
  //     }
  //   });
  // }
  if (isFMovies) {
    addKeydown();
  }
}

function addKeydown() {
  document.addEventListener("keydown", async (event) => {
    // If the correct key is pressed and an input is not focused, continue
    if (
      pauseKeydownListener ||
      event.code !==
        (await GM.getValue(KEY_CODE_VALUE_KEY, DEFAULT_KEY_CODE)) ||
      event.target.nodeName.toLowerCase() === "input" ||
      // Discus inputs require special treatment
      (event.target.attributes.role &&
        event.target.attributes.role.value === "textbox")
    ) {
      return;
    }
    GM.setValue(NEXT_EPISODE_VALUE_KEY, true);
  });
}

function goToNextEpisode() {
  // If we can't find the episode in the list, abort and warn user
  if (document.querySelector("section#episodes li > a.active") === null) {
    alert("Current episode not found in list.");
    return;
  }
  // Go through episode list and click the one after the active one
  const episodeList = document.querySelectorAll("section#episodes li > a");
  let currentEpisodeFound = false;
  for (const element of episodeList) {
    if (currentEpisodeFound) {
      window.location.href =
        window.location.origin + element.getAttribute("href");
      return;
    }
    if (element.className === "active") {
      currentEpisodeFound = true;
    }
  }
  // If active episode is the last one, warn the user
  if (currentEpisodeFound) {
    alert("Last episode reached.");
  }
}
