// ==UserScript==
// @name        Youtube Mobile-like Playlist Remove Video Button
// @license     MIT
// @namespace   rtonne
// @match       https://www.youtube.com/*
// @grant       none
// @version     1.3
// @author      Rtonne
// @description Adds a button to remove videos from playlists just like on mobile
// @run-at      document-end
// ==/UserScript==

let currentUrl = null;

const urlRegex = /^https:\/\/www.youtube.com\/playlist\?list=.*$/;

// Using observer to run script whenever the body changes
// because youtube doesn't reload when changing page
const observer = new MutationObserver(async () => {
  try {
    let newUrl = window.location.href;

    // Because youtube doesn't reload on changing url
    // we have to allow the whole website and check here if we are in a playlist
    if (!urlRegex.test(newUrl)) {
      return;
    }
    const elements = await waitForElements(
      document,
      "ytd-playlist-video-renderer"
    );

    // If the url is different we are in a different playlist
    // Or if the playlist length is different, we loaded more of the same playlist
    if (
      currentUrl === newUrl &&
      elements.length ===
        document.querySelectorAll(".rtonne-youtube-playlist-delete-button")
          .length
    ) {
      return;
    }

    currentUrl = newUrl;

    // If the list cannot be sorted, we assume we can't remove from it either
    if (
      !document.querySelector(
        "#header-container > #filter-menu > yt-sort-filter-sub-menu-renderer"
      )
    ) {
      return;
    }

    elements.forEach((element) => {
      // Youtube reuses elements, so we check if element already has a button
      if (element.querySelector(".rtonne-youtube-playlist-delete-button"))
        return;

      // ===========
      // Now we create the button and add it to each video
      // ===========

      const elementStyle = document.defaultView.getComputedStyle(element);
      const button = document.createElement("button");
      button.className = "rtonne-youtube-playlist-delete-button";
      button.innerHTML = getYoutubeTrashSvg();
      button.style.height = elementStyle.height;
      button.style.padding = "0";
      button.style.borderRadius = `0 ${elementStyle.borderTopRightRadius} ${elementStyle.borderBottomRightRadius} 0`;
      button.style.borderWidth = "0";
      button.style.fill = "var(--yt-spec-text-primary)";
      button.onmouseover = () => {
        button.style.backgroundColor = "var(--yt-spec-static-brand-red)";
      };
      button.onmouseleave = () => {
        button.style.backgroundColor = "var(--yt-spec-additive-background)";
      };
      button.onmouseleave();

      element.onmouseover = () => {
        button.style.width = "var(--yt-icon-width)";
      };
      element.onmouseleave = () => {
        button.style.width = "0";
      };
      element.onmouseleave();
      element.appendChild(button);

      button.onclick = async () => {
        // Click the 3 dot menu button on the video
        element.querySelector("button.yt-icon-button").click();

        const popup = (
          await waitForElements(
            document,
            "tp-yt-iron-dropdown.ytd-popup-container:has(> div > ytd-menu-popup-renderer)"
          )
        )[0];

        // Set the popup opacity to 0 to hide it
        popup.style.opacity = "0";

        const removeMenuItem = (
          await waitForElements(
            popup,
            `ytd-menu-service-item-renderer:has(path[d="${getSvgPathD()}"])`
          )
        )[0];

        // Click the remove video from playlist button in the popup
        removeMenuItem.click();

        // Set the opacity back to default
        popup.style.opacity = null;
      };
    });
  } catch (err) {
    console.log(err);
  }
});
observer.observe(document.body, {
  childList: true,
  subtree: true,
});

// I couldn't check if we changed from an editable list to a non-editable list
// in the other observer, so I have this one to just do that and remove the buttons
const sortObserver = new MutationObserver(() => {
  if (!urlRegex.test(window.location.href)) {
    return;
  }
  if (
    !document.querySelector(
      "#header-container > #filter-menu > yt-sort-filter-sub-menu-renderer"
    )
  ) {
    document
      .querySelectorAll(".rtonne-youtube-playlist-delete-button")
      .forEach((element) => element.remove());
  }
});
sortObserver.observe(document.body, {
  childList: true,
  subtree: true,
});

function getYoutubeTrashSvg() {
  return `<div style="height: 24px;">
<svg enable-background="new 0 0 24 24" height="24" viewBox="0 0 24 24" width="24" focusable="false" style="pointer-events: none; display: block; width: 100%; height: 100%;">
<path d="${getSvgPathD()}"></path>
</svg></div>`;
}

// This function is separate to find the menu's remove button in the observer
function getSvgPathD() {
  return "M11 17H9V8h2v9zm4-9h-2v9h2V8zm4-4v1h-1v16H6V5H5V4h4V3h6v1h4zm-2 1H7v15h10V5z";
}

// https://stackoverflow.com/questions/5525071/how-to-wait-until-an-element-exists
// This function is required because youtube uses too much JS
// and elements take a while to appear sometimes
function waitForElements(node, selector) {
  return new Promise((resolve) => {
    if (node.querySelector(selector)) {
      return resolve(node.querySelectorAll(selector));
    }

    const observer = new MutationObserver(() => {
      if (node.querySelector(selector)) {
        observer.disconnect();
        resolve(node.querySelectorAll(selector));
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  });
}
