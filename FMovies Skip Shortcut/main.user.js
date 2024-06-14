// ==UserScript==
// @name        FMovies Skip Shortcut
// @license     MIT
// @namespace   rtonne
// @match       https://*/*
// @icon        https://www.google.com/s2/favicons?sz=64&domain=fmovies24.to
// @version     1.2
// @author      Rtonne
// @description Adds a shortcut ("-") to skip to the next episode
// @run-at      document-end
// @grant       GM.setValue
// @grant       GM.getValue
// @grant       GM.addValueChangeListener
// ==/UserScript==

// Movies are probably not be needed, but there might an exception so I'll include them
const URL_REGEX = /^https:\/\/fmovies24.to\/((tv)|(movie))\/.+$/;
const IS_FMOVIES_VALUE_KEY = "is_FMovies";
const NEXT_EPISODE_VALUE_KEY = "next_episode";

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

function iFrame() {
  let isFMovies = GM.getValue(IS_FMOVIES_VALUE_KEY, false);
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
  document.addEventListener("keydown", (event) => {
    // If the correct key is pressed and an input is not focused, continue
    if (
      event.code !== "Minus" ||
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
