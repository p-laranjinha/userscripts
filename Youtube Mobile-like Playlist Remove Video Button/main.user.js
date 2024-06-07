// ==UserScript==
// @name        Youtube Mobile-like Playlist Remove Video Button
// @license     MIT
// @namespace   rtonne
// @match       https://www.youtube.com/*
// @icon        https://www.google.com/s2/favicons?sz=64&domain=youtube.com
// @grant       none
// @version     1.5
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

        const [popup] = await waitForElements(
          document,
          "tp-yt-iron-dropdown.ytd-popup-container:has(> div > ytd-menu-popup-renderer):not([style*='display: none;'])"
        );

        // Set the popup left to -10000px to hide it
        popup.style.left = "-10000px";

        const [popup_remove_button] = await waitForElements(
          popup,
          `ytd-menu-service-item-renderer:has(path[d="${getSvgPathD()}"])`
        );
        await removeVideo(popup_remove_button, element);

        // In case of error and the popup doesn't hide
        document.body.click();
      };
    });
  } catch (err) {
    console.error(err);
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

/**
 * Uses a MutationObserver to wait until the element we want exists.
 * This function is required because elements take a while to appear sometimes.
 * https://stackoverflow.com/questions/5525071/how-to-wait-until-an-element-exists
 * @param {HTMLElement} node The element being used for querySelector
 * @param {string} selector A string for node.querySelector describing the elements we want.
 * @returns {Promise<HTMLElement[]>} The list of elements found.
 */
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
      attributeFilter: ["style"], // This needs to be used because in this case the selector can depend on style
    });
  });
}
/**
 * Removes the video that the popup belongs to.
 * Will try multiple times because of errors like "Precondition check failed".
 * @param {HTMLElement} popup_remove_button The popup button that remove the video.
 * @param {HTMLElement} element The element that represents the video being removed.
 * @returns
 */
function removeVideo(popup_remove_button, element) {
  return new Promise((resolve) => {
    // Observer should trigger either when the element is removed
    // or an error notification appears
    const observer = new MutationObserver(() => {
      if (!document.contains(element)) {
        observer.disconnect();
        // disconnect and resolve don't immediately stop execution so return is also required
        return resolve();
      }
      popup_remove_button.click();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    popup_remove_button.click();
  });
}
