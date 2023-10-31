// ==UserScript==
// @name        FMovies Skip Shortcut
// @license     MIT
// @namespace   rtonne
// @match       https://fmoviesz.to/*
// @grant       none
// @version     1.0
// @author      Rtonne
// @description Adds a shortcut ("-") to skip to the next episode
// @run-at      document-end
// ==/UserScript==

document.addEventListener("keydown", (event) => {
  // If key pressed is "-" and the search box is not focused, continue
  if (
    event.code !== "Minus" ||
    document.querySelector("div.search-box input") === document.activeElement
  ) {
    return;
  }
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
        "https://fmoviesz.to" + element.getAttribute("href");
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
});
