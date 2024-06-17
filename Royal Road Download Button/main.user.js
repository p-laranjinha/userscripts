// ==UserScript==
// @name        Royal Road Download Button
// @license     MIT
// @namespace   rtonne
// @match       https://www.royalroad.com/fiction/*
// @icon        https://www.google.com/s2/favicons?sz=64&domain=royalroad.com
// @version     5.4
// @author      Rtonne
// @description Adds buttons to download to Royal Road chapters
// The following @require is needed for jszip to work with @grant
// @require     data:application/javascript,window.setImmediate%20%3D%20window.setImmediate%20%7C%7C%20((f%2C%20...args)%20%3D%3E%20window.setTimeout(()%20%3D%3E%20f(args)%2C%200))%3B
// @require     https://cdn.jsdelivr.net/npm/jszip@3.10.1
// @require     https://cdn.jsdelivr.net/npm/file-saver@2.0.5
// @require     https://update.greasyfork.org/scripts/498119/1395863/setupToggleCommands.js
// @run-at      document-end
// @grant       GM.registerMenuCommand
// @grant       GM.unregisterMenuCommand
// @grant       GM.getValue
// @grant       GM.setValue
// ==/UserScript==

/** @type {_Command[]} */
const command_list = [
  {
    id: "use_chapter_id_as_prefix",
    off_text: "🞎 Use the chapter ID as the file prefix",
    on_text: "🞕 Use the chapter ID as the file prefix",
    off_tooltip:
      "Currently using the chapter's publish date as the filename's prefix.",
    on_tooltip:
      "Currently using the chapter ID in the chapter's URL as the filename's prefix.",
  },
];
setupToggleCommands(command_list);

const FICTION_REGEX = new RegExp(
  /^https:\/\/www.royalroad.com\/fiction\/\d+?\/[^\/]+$/
);
const CHAPTER_REGEX = new RegExp(
  /^https:\/\/www.royalroad.com\/fiction\/\d+?\/[^\/]+\/chapter\/\d+?\/[^\/]+$/
);
const PARSER = new DOMParser();

if (FICTION_REGEX.test(window.location.href)) {
  // If current page is a fiction page
  setupFictionPageDownload();
}
if (CHAPTER_REGEX.test(window.location.href)) {
  // If current page is a chapter page
  setupChapterPageDownload();
}

async function setupFictionPageDownload() {
  const chapter_metadata_list = await fetchChapterMetadataList();

  if (!chapter_metadata_list.length) {
    return;
  }

  const royalroad_button_computed_style = getComputedStyle(
    document.querySelector("a.button-icon-large")
  );

  // The page has multiple sets of buttons for different widths
  const royalroad_3_button_rows = document.querySelectorAll(
    "div.row.reduced-gutter"
  );

  for (const button_row of royalroad_3_button_rows) {
    const container = document.createElement("div");
    container.style.marginBottom = "10px";
    button_row.after(container);

    const button = document.createElement("a");
    button.className =
      "button-icon-large rtonne-royalroad-download-button-fiction-button";
    button.style.marginBottom = "0";
    container.append(button);

    const progress_bar = document.createElement("div");
    progress_bar.style.position = "absolute";
    progress_bar.style.top = `calc(${royalroad_button_computed_style.height} - ${royalroad_button_computed_style.borderBottomWidth})`;
    progress_bar.style.left = "0";
    progress_bar.style.height =
      royalroad_button_computed_style.borderBottomWidth;
    progress_bar.style.background = getComputedStyle(
      document.querySelector("a.btn-primary")
    ).backgroundColor;
    progress_bar.style.width = "0";
    progress_bar.className = "rtonne-royalroad-download-button-progress-bar";
    button.append(progress_bar);

    const button_icon = document.createElement("i");
    button_icon.className = "fa fa-download";
    button.append(button_icon);

    const button_text = document.createElement("span");
    button_text.innerText = "Download Chapters";
    button_text.className = "center";
    button.append(button_text);

    const form = document.createElement("div");
    form.className = "icon-container";
    form.style.padding = "5px";
    form.style.marginLeft = "5px";
    form.style.marginRight = "5px";
    container.append(form);

    const start_select_label = document.createElement("span");
    start_select_label.innerText = "From:";
    start_select_label.className = "tip";
    start_select_label.style.position = "unset";
    form.append(start_select_label);

    const start_select = document.createElement("select");
    start_select.className =
      "form-control rtonne-royalroad-download-button-start-select";
    start_select.style.marginBottom = "5px";
    form.append(start_select);

    const end_select_label = document.createElement("span");
    end_select_label.innerText = "To:";
    end_select_label.className = "tip";
    end_select_label.style.position = "unset";
    form.append(end_select_label);

    const end_select = document.createElement("select");
    end_select.className =
      "form-control rtonne-royalroad-download-button-end-select";
    form.append(end_select);

    for (const [index, chapter_metadata] of chapter_metadata_list.entries()) {
      const option = document.createElement("option");
      option.value = index;
      option.innerText = chapter_metadata.title;
      start_select.append(option);
      end_select.append(option.cloneNode(true));
    }

    start_select.firstChild.setAttribute("selected", "selected");
    end_select.lastChild.setAttribute("selected", "selected");

    button.addEventListener("click", () => {
      const start_index = Number(start_select.value);
      const end_index = Number(end_select.value);
      const chosen_chapters_metadata_list = chapter_metadata_list.slice(
        start_index,
        end_index + 1
      );
      downloadChapters(chosen_chapters_metadata_list);
    });

    start_select.addEventListener("change", () => {
      const all_start_selects = document.querySelectorAll(
        "select.rtonne-royalroad-download-button-start-select"
      );
      for (const select of all_start_selects) {
        select.value = start_select.value;
      }
    });

    end_select.addEventListener("change", () => {
      const all_end_selects = document.querySelectorAll(
        "select.rtonne-royalroad-download-button-end-select"
      );
      for (const select of all_end_selects) {
        select.value = end_select.value;
      }
    });
  }
}

async function setupChapterPageDownload() {
  const button = document.createElement("a");
  button.className =
    "btn btn-primary rtonne-royalroad-download-button-chapter-button";

  const button_icon = document.createElement("i");
  button_icon.className = "fa fa-download";
  button.appendChild(button_icon);

  const button_text = document.createElement("span");
  button_text.innerText = " Download Chapter";
  button_text.className = "center";
  button.appendChild(button_text);

  const royalroad_fiction_page_button = document.querySelector(
    "a.btn.btn-block.btn-primary"
  );
  const royalroad_rss_button = document.querySelector("a.btn-sm.yellow-gold");

  const button_clone = button.cloneNode(true);
  button_clone.classList.add("btn-block");
  button_clone.classList.add("margin-bottom-5");
  royalroad_fiction_page_button.after(button_clone);

  button.classList.add("btn-sm");
  button.setAttribute(
    "style",
    "border-radius: 4px !important; margin-right: 5px;"
  );
  royalroad_rss_button.before(button);

  const time_element = document.querySelector("i[title='Published'] ~ time");
  const date = shortenDate(time_element.getAttribute("datetime"));

  const chapter_metadata = {
    url: window.location.href.split("https://www.royalroad.com")[1],
    date: date,
  };

  button_clone.addEventListener("click", () =>
    downloadChapters([chapter_metadata])
  );
  button.addEventListener("click", () => downloadChapters([chapter_metadata]));
}

/**
 * Get chapters' contents, pack them into a ZIP file,
 * and send a download request to the user.
 * @param {[{url: string, date: string}]} chapter_metadata_list
 */
async function downloadChapters(chapter_metadata_list) {
  const use_chapter_id_as_prefix = await GM.getValue(
    "use_chapter_id_as_prefix",
    false
  );

  const fiction_buttons = document.querySelectorAll(
    "a.rtonne-royalroad-download-button-fiction-button"
  );
  const chapter_buttons = document.querySelectorAll(
    "a.rtonne-royalroad-download-button-chapter-button"
  );
  const progress_bars = document.querySelectorAll(
    "div.rtonne-royalroad-download-button-progress-bar"
  );
  // Disable all the download buttons
  for (const button of fiction_buttons) {
    button.style.pointerEvents = "none";
    button.style.background = "#060606";
    button.style.borderBottom = "2px inset rgba(256,256,256,.1)";
  }
  for (const button of chapter_buttons) {
    button.style.pointerEvents = "none";
    button.style.opacity = ".65";
  }

  const zip = new JSZip();

  const fiction_name = window.location.href.split("/")[5];

  for (let index = 0; index < chapter_metadata_list.length; index++) {
    const chapter_metadata = chapter_metadata_list[index];
    const html = await fetchChapterHtml(chapter_metadata.url);

    let prev_date;
    let next_date;
    if (index - 1 >= 0) {
      prev_date = chapter_metadata_list[index - 1].date;
    }
    if (index + 1 < chapter_metadata_list.length - 1) {
      next_date = chapter_metadata_list[index + 1].date;
    }

    const processed_html = await processChapterHtml(
      chapter_metadata.url,
      html,
      prev_date,
      next_date
    );

    const chapter_url_split = chapter_metadata.url.split("/");
    const chapter_name = chapter_url_split[chapter_url_split.length - 1];
    let filename_prefix;
    if (use_chapter_id_as_prefix) {
      filename_prefix = chapter_url_split[chapter_url_split.length - 2];
    } else {
      filename_prefix = chapter_metadata.date;
    }

    zip.file(
      `${fiction_name}/${filename_prefix}_${chapter_name}.html`,
      processed_html
    );

    // Change the progress bars
    for (const progress_bar of progress_bars) {
      progress_bar.style.width = `${
        ((index + 1) / chapter_metadata_list.length) * 100
      }%`;
    }
  }

  await zip
    .generateAsync({
      type: "blob",
      compression: "DEFLATE",
      compressionOptions: {
        level: 9,
      },
    })
    .then((blob) => {
      saveAs(blob, fiction_name + ".zip");
    });

  // Re-enable all the download buttons, and reset the progress bars
  for (const button of fiction_buttons) {
    button.style.pointerEvents = null;
    button.style.background = null;
    button.style.borderBottom = null;
  }
  for (const button of chapter_buttons) {
    button.style.pointerEvents = null;
    button.style.opacity = null;
  }
  for (const progress_bar of progress_bars) {
    progress_bar.style.width = "0";
  }
}

/**
 * Turn RoyalRoad's chapter html into one better for offline reading.
 * @param {string} chapter_url
 * @param {HTMLHtmlElement} html
 * @param {string} [prev_date] The publish date of the previous chapter.
 * @param {string} [next_date] The publish date of the next chapter.
 */
async function processChapterHtml(chapter_url, html, prev_date, next_date) {
  const use_chapter_id_as_prefix = await GM.getValue(
    "use_chapter_id_as_prefix",
    false
  );

  // Edit spoilers so they function the same offline
  const spoilers = html.querySelectorAll(".spoiler-new, .spoiler");
  for (const spoiler of spoilers) {
    if (spoiler.classList.contains("spoiler")) {
      spoiler.innerHTML = spoiler.querySelector(".spoiler-inner").innerHTML;
    }
    spoiler.className = "spoiler";
    const spoiler_content = document.createElement("div");
    for (const child of spoiler.children) {
      spoiler_content.append(child);
    }
    const spoiler_label = document.createElement("label");
    spoiler_label.innerText = "Spoiler";
    const spoiler_checkbox = document.createElement("input");
    spoiler_checkbox.type = "checkbox";
    spoiler_label.append(spoiler_checkbox);
    spoiler.append(spoiler_label);
    spoiler.append(spoiler_content);
  }

  // Edit the header links so they work offline
  const chapter_header = html.querySelector(
    "div.fic-header > div > div.col-lg-6"
  );
  const chapter_header_links = chapter_header.querySelectorAll("a");
  for (const link of chapter_header_links) {
    link.setAttribute(
      "href",
      `https://www.royalroad.com${link.getAttribute("href")}`
    );
  }
  chapter_header.querySelector(
    "h1"
  ).innerHTML = `<a href="https://www.royalroad.com${chapter_url}" class="font-white">${
    chapter_header.querySelector("h1").innerHTML
  }</a>`;

  // Add publishing date and last edit date to the header
  // Not using html.querySelector(".profile-info > ul") so that we only get the date items
  const dates_container = document.createElement("ul");
  dates_container.className = "list-inline";
  const date_elements = html.querySelectorAll(
    ".profile-info > ul > li:has(i[title='Published']), .profile-info > ul > li:has(i[title='Last Edit'])"
  );
  for (const element of date_elements) {
    const date_time_element = element.querySelector("time");
    const date_icon_element = element.querySelector("i");
    // I could use Date.prototype.toLocaleString, but I personally prefer this
    date_time_element.innerText =
      date_time_element
        .getAttribute("datetime")
        .split(".")[0]
        .replaceAll("T", " ") + " UTC";
    date_icon_element.innerText = date_icon_element.getAttribute("title") + ":";
    dates_container.append(element);
  }
  chapter_header.append(dates_container);

  let chapter =
    getCustomChapterHeader() +
    chapter_header.outerHTML +
    '<div class="portlet">';

  const chapterElements = html.querySelector("div.chapter-content").parentNode
    .children;
  for (const element of chapterElements) {
    if (element.classList.contains("chapter-content")) {
      // Remove unnecessary classes from <p> and add chapter content
      const paragraphs = element.querySelectorAll(":scope > p");
      for (let paragraph of paragraphs) {
        paragraph.removeAttribute("class");
      }
      chapter += element.outerHTML;
    } else if (element.classList.contains("author-note-portlet")) {
      // Add author notes
      chapter += element.outerHTML;
    } else if (
      element.classList.contains("nav-buttons") ||
      element.classList.contains("margin-bottom-10")
    ) {
      // Add prev/next/index buttons and make them work offline
      const buttons = element.querySelectorAll("a");
      for (const button of buttons) {
        if (button.innerText.includes("Index")) {
          button.setAttribute("href", ".");
          break;
        }

        const adjacent_chapter_url_split = button
          .getAttribute("href")
          .split("/");

        // "unknown" should never end up being used
        let filename_prefix = "unknown";
        // Get the dates here if the button exists but the date is null
        // (can occur if a chapter comes out after we get the chapter metadata list)
        // Will also be used for the chapter button
        // TODO figure out what should happen if the prev/next chapter no longer exists
        if (button.innerText.includes("Previous")) {
          if (use_chapter_id_as_prefix) {
            filename_prefix =
              adjacent_chapter_url_split[adjacent_chapter_url_split.length - 2];
          } else {
            if (!prev_date) {
              const prev_html = await fetchChapterHtml(button.href);
              const prev_time_element = prev_html.querySelector(
                "i[title='Published'] ~ time"
              );
              prev_date = shortenDate(
                prev_time_element.getAttribute("datetime")
              );
            }
            filename_prefix = shortenDate(prev_date);
          }
        } else if (button.innerText.includes("Next")) {
          if (use_chapter_id_as_prefix) {
            filename_prefix =
              adjacent_chapter_url_split[adjacent_chapter_url_split.length - 2];
          } else {
            if (!next_date) {
              const next_html = await fetchChapterHtml(button.href);
              const next_time_element = next_html.querySelector(
                "i[title='Published'] ~ time"
              );
              next_date = shortenDate(
                next_time_element.getAttribute("datetime")
              );
            }
            filename_prefix = shortenDate(next_date);
          }
        }

        const adjacent_chapter_name =
          adjacent_chapter_url_split[adjacent_chapter_url_split.length - 1];

        button.setAttribute(
          "href",
          `${filename_prefix}_${adjacent_chapter_name}.html`
        );
      }
      chapter += element.outerHTML;
    }
  }

  chapter += getCustomChapterFooter();

  /* Regex explanation:
    Deletes whitespace at the start of each line.
    Deletes whitespace at the end of each line, including the newline.
  */
  chapter = chapter.replace(/^\s+|(\s*\n)/gm, "");

  return chapter;
}

/**
 * @param {string} chapter_url
 * @returns {Promise<HTMLHtmlElement>}
 */
async function fetchChapterHtml(chapter_url) {
  // TODO: watch out for errors like 429 (Too many requests), or if the chapter no longer exists
  const html = await fetch(chapter_url, {
    credentials: "omit",
  })
    .then((response) => response.text())
    .then((text) => PARSER.parseFromString(text, "text/html"))
    .catch((error) => {
      alert(
        "An error has ocurred while fetching a chapter. Please refresh and try again. More details in the console."
      );
      throw error;
    });

  return html;
}

/**
 * Gets all the chapters from a fiction page.
 * If url is null, the current page is used.
 * @param {string} [url]
 * @returns {Promise<[{title: string, url: string, date: string}]>}
 */
async function fetchChapterMetadataList(url = null) {
  // If its not a fiction page, return an empty chapter list
  if (
    (url === null && !FICTION_REGEX.test(window.location.href)) ||
    (url !== null && !FICTION_REGEX.test(url))
  ) {
    return [];
  }

  let html;

  if (url === null) {
    // Use current page
    html = document.querySelector("html").cloneNode(true);
    url = window.location.href;
  } else {
    // Fetch new page
    html = await fetch(url, {
      credentials: "omit",
    })
      .then((response) => response.text())
      .then((text) => PARSER.parseFromString(text, "text/html"));
  }

  const chapter_metadata_list = [
    ...html.querySelectorAll("tr.chapter-row"),
  ].map((element) => {
    const left_link = element.querySelector("td:not(.text-right) a");
    const time_element = element.querySelector("td.text-right a time");
    return {
      title: left_link.innerText.trim(),
      url: left_link.getAttribute("href"),
      date: shortenDate(time_element.getAttribute("datetime")),
    };
  });

  // Because javascript hides chapters from the list
  // we check and retry if chapters are hidden
  if (
    chapter_metadata_list.length === 20 &&
    html.querySelectorAll(".pagination-small").length > 0
  ) {
    return fetchChapterMetadataList(url);
  }

  return chapter_metadata_list;
}

/**
 * Turns a date with a format like "2023-06-21T22:02:45.0000000Z"
 * into something like "20230621220245".
 * @param {string} date
 * @returns {string}
 */
function shortenDate(date) {
  if (!date) {
    return "";
  }
  return date
    .split(".")[0]
    .replaceAll("-", "")
    .replaceAll(":", "")
    .replaceAll("T", "");
}

function getCustomChapterHeader() {
  const header = /*html*/ `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<style>
.portlet-body p,
p {
  margin-top: 0;
}
body {
  background: #181818;
  font-family: Open Sans, open-sans, Helvetica Neue, Helvetica, Roboto,
    Arial, sans-serif;
  line-height: 1.42857143;
  font-size: 16px;
  margin: 0;
}
.font-white {
  color: #fff !important;
}
.portlet {
  background: #131313;
  border: 1px solid hsla(0, 0%, 100%, 0.1);
  color: hsla(0, 0%, 100%, 0.8);
  padding: 1em 20px 0;
  margin: 10px 0;
  display: flex;
  flex-direction: column;
}
.author-note-portlet {
  background: #393939;
  color: hsla(0, 0%, 100%, 0.8);
  border: 0;
  padding: 0 10px 10px;
  margin: 0 0 1em;
}
.portlet-title {
  border-bottom: 0;
  margin-bottom: 10px;
  min-height: 41px;
  padding: 0;
  margin-left: 15px;
}
.caption {
  padding: 16px 0 2px;
  display: inline-block;
  float: left;
  font-size: 18px;
  line-height: 18px;
}
.uppercase {
  text-transform: uppercase !important;
}
.bold {
  font-weight: 700 !important;
}
a {
  color: #337ab7;
  text-shadow: none;
  text-decoration: none;
}
.portlet-body {
  padding: 10px 15px;
}
p {
  margin-bottom: 1em;
}
.col-md-5 {
  min-height: 1px;
  background: #2a3642;
  margin-left: -15px;
  margin-right: -15px;
  padding: 10px;
}
.text-center {
  text-align: center;
}
.container {
  margin-left: auto;
  margin-right: auto;
  padding-left: 15px;
  padding-right: 15px;
  width: "100%";
}
.col-md-5 > *,
.col-md-5 > * > * {
  font-weight: 300;
  margin: 10px 0;
}
table {
  background: #004b7a;
  border: none;
  border-collapse: separate;
  border-spacing: 2px;
  box-shadow: 1px 1px 1px rgba(0, 0, 0, 0.75);
  margin: 10px auto;
  width: 90%;
}
table td {
  background: rgba(0, 0, 0, 0.1);
  border: 1px solid hsla(0, 0%, 100%, 0.25) !important;
  color: #ccc;
  margin: 3px;
  padding: 5px;
}
.btn-primary {
  box-shadow: none;
  outline: none;
  line-height: 1.44;
  background-color: #337ab7;
  color: #fff;
  padding: 6px 0;
  text-align: center;
  display: inline-block;
  font-size: 14px;
  font-weight: 400;
  border: 1px solid #2e6da4;
}
.btn-primary[disabled] {
  cursor: not-allowed;
  opacity: 0.65;
}
.col-xs-12 {
  width: 100%;
}
.col-xs-6 {
  width: 50%;
  position: relative;
  float: left;
}
.visible-xs,
.visible-xs-block {
  display: none;
}
.col-xs-4 {
  width: 33.33333333%;
  margin: 0;
}
.row {
  display: flex;
  margin-bottom: 1em;
}
@media (min-width: 992px) {
  .container {
    width: 970px;
  }
  .col-md-4 {
    width: 33.33333333%;
  }
  .col-md-offset-4 {
    margin-left: 33.33333333%;
  }
}
@media (min-width: 1200px) {
  .container {
    width: 1170px;
  }
  .col-lg-3 {
    width: 25%;
  }
  .col-lg-offset-6 {
    margin-left: 50%;
  }
}
.spoiler > label > input {
  position: absolute;
  opacity: 0;
  z-index: -1;
}
.spoiler > label {
  font-weight: bold;
  cursor: pointer;
}
.spoiler > label::after {
  content: "Show";
  background: #2c2c2c;
  border: 1px solid rgba(61, 61, 61, 0.31);
  color: hsla(0, 0%, 100%, 0.8) !important;
  font-size: 12px;
  padding: 1px 5px;
  font-weight: 400;
  margin-left: 5px;
}
.spoiler > label:has(> input:checked)::after {
  content: "Hide";
}
.spoiler > label:hover::after {
  background: #3e3e3e;
}
.spoiler > div {
  display: none;
  margin-top: 20px;
}
.spoiler > label:has(> input:checked) ~ div {
  display: block;
}
img {
  height: auto !important;
  max-width: 100%;
}
.list-inline {
  list-style: none;
  padding-left: 0;
  color: hsla(0, 0%, 100%, 0.8);
}
.list-inline > li {
  display: inline-block;
  padding-left: 15px;
  padding-right: 15px;
  margin: 0;
}
hr {
  margin: 20px 0;
  border: 0;
  border-top: 1px solid hsla(0, 0%, 100%, .3);
}
</style>
</head>
<body>
<div class="container">`;

  /* Regex explanation:
  Deletes whitespace at the start of each line.
  Deletes whitespace at the end of each line, including the newline.
  Deletes whitespace before "{", "(", "}", ")", "/", ":", ",", "<", ">".
  ("?=" means that the character ahead is found but not selected for deletion)
  Deletes whitespace after "{", "(", "}", ")", "/", ":", ",", "<", ">".
  ("?<=" means that the character behind is found but not selected for deletion)
  */
  const no_newlines_header = header.replace(
    /^\s+|(\s*\n)|(\s+(?=[\{\(\}\)\/:,<>]))|((?<=[\{\(\}\)\/:,<>])\s+)/gm,
    ""
  );
  return no_newlines_header;
}

function getCustomChapterFooter() {
  return "</div></div></body></html>";
}
