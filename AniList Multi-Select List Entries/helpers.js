/**
 * Uses a MutationObserver to wait until the element we want exists.
 * This function is required because elements take a while to appear sometimes.
 * https://stackoverflow.com/questions/5525071/how-to-wait-until-an-element-exists
 * @param {string} selector A string for document.querySelector describing the elements we want.
 * @returns {Promise<HTMLElement[]>} The list of elements found.
 */
function waitForElements(selector) {
  return new Promise((resolve) => {
    if (document.querySelector(selector)) {
      return resolve(document.querySelectorAll(selector));
    }

    const observer = new MutationObserver(() => {
      if (document.querySelector(selector)) {
        observer.disconnect();
        resolve(document.querySelectorAll(selector));
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  });
}

/**
 * Uses a MutationObserver to wait until the element no longer exists.
 * @param {HTMLElement} element
 * @returns {Promise<null>}
 */
function waitForElementToBeRemovedOrHidden(element) {
  return new Promise((resolve) => {
    if (!document.contains(element) || element.style.display === "none") {
      return resolve();
    }

    const observer = new MutationObserver(() => {
      if (!document.contains(element) || element.style.display === "none") {
        observer.disconnect();
        resolve();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributeOldValue: true,
      attributeFilter: ["style"],
    });
  });
}
