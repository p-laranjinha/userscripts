// ==UserScript==
// @name        Royal Road Download Button
// @license     MIT
// @namespace   rtonne
// @match       https://www.royalroad.com/fiction/*
// @icon        https://www.google.com/s2/favicons?sz=64&domain=royalroad.com
// @grant       none
// @version     4.8
// @author      Rtonne
// @description Adds buttons to download to Royal Road chapters
// @require     https://cdn.jsdelivr.net/npm/jszip@3.10.1
// @require     https://cdn.jsdelivr.net/npm/file-saver@2.0.5
// @run-at      document-end
// ==/UserScript==

(async () => {
  try {
    const chapterRegex = new RegExp(
      /https:\/\/www.royalroad.com\/fiction\/.*?\/chapter\/.*/g
    );

    if (chapterRegex.test(window.location.href)) {
      // If URL is of a chapter
      chapterPageDownload();
    } else {
      // If URL is of a fiction
      fictionPageDownload();
    }
  } catch (err) {
    console.log(err);
  }
})();

async function chapterPageDownload() {
  // Fetch full chapter list to know how many chapters there are and the index of this one
  // So we know what the file name will be
  const chapters = await fetchChapterList(
    window.location.href.match(
      /https:\/\/www.royalroad.com\/fiction\/.*?(?=\/chapter\/.*)/g
    )[0]
  );

  //=====
  // Create the download buttons
  //=====

  const button = document.createElement("a");
  button.className = "btn btn-primary RRScraperDownloadButton";

  const i = document.createElement("i");
  i.className = "fa fa-download";
  button.appendChild(i);

  const span = document.createElement("span");
  span.innerText = " Download Chapter";
  span.className = "center";
  button.appendChild(span);

  const fictionPageButton = document.querySelector(
    "a.btn.btn-block.btn-primary"
  );
  const rssButton = document.querySelector("a.btn-sm.yellow-gold");

  //=====
  // Insert clones of the created elements to both positions
  // And add their event functions
  //=====

  let onClick = () => {
    downloadChapters(
      [],
      chapters.length,
      chapters.findIndex((chapter) =>
        window.location.href.includes(chapter.url)
      )
    );
  };

  let buttonClone = button.cloneNode(true);
  buttonClone.classList.add("btn-block");
  buttonClone.classList.add("margin-bottom-5");
  buttonClone.onclick = onClick;
  fictionPageButton.insertAdjacentElement("afterend", buttonClone);

  buttonClone = button.cloneNode(true);
  buttonClone.classList.add("btn-sm");
  buttonClone.setAttribute(
    "style",
    "border-radius: 4px !important; margin-right: 5px;"
  );
  buttonClone.onclick = onClick;
  rssButton.insertAdjacentElement("beforebegin", buttonClone);
}

async function fictionPageDownload() {
  const chapters = await fetchChapterList();

  //=====
  // Create the download buttons and other elements
  //=====

  const container = document.createElement("div");
  container.style.marginBottom = "10px";

  const button = document.createElement("a");
  button.className = "button-icon-large RRScraperDownloadAllButton";
  button.style.marginBottom = "0";
  container.appendChild(button);

  const buttonStyle = getComputedStyle(
    document.querySelector("a.button-icon-large")
  );
  const progressBar = document.createElement("div");
  progressBar.style.position = "absolute";
  progressBar.style.top = `calc(${buttonStyle.height} - ${buttonStyle.borderBottomWidth})`;
  progressBar.style.left = "0";
  progressBar.style.height = buttonStyle.borderBottomWidth;
  progressBar.style.background = getComputedStyle(
    document.querySelector("a.btn-primary")
  ).backgroundColor;
  progressBar.style.width = "0";
  progressBar.className = "RRScraperProgressBar";
  button.appendChild(progressBar);

  const i = document.createElement("i");
  i.className = "fa fa-download";
  button.appendChild(i);

  const span = document.createElement("span");
  span.innerText = "Download Chapters";
  span.className = "center";
  button.appendChild(span);

  const form = document.createElement("div");
  form.className = "icon-container";
  form.style.padding = "5px";
  form.style.marginLeft = "5px";
  form.style.marginRight = "5px";
  container.appendChild(form);

  const labelFrom = document.createElement("span");
  labelFrom.innerText = "From:";
  labelFrom.className = "tip";
  labelFrom.style.position = "unset";
  form.appendChild(labelFrom);

  const selectFrom = document.createElement("select");
  selectFrom.className = "form-control RRScraperFromSelect";
  selectFrom.style.marginBottom = "5px";
  form.appendChild(selectFrom);

  const labelTo = document.createElement("span");
  labelTo.innerText = "To:";
  labelTo.className = "tip";
  labelTo.style.position = "unset";
  form.appendChild(labelTo);

  const selectTo = document.createElement("select");
  selectTo.className = "form-control RRScraperToSelect";
  form.appendChild(selectTo);

  for (const [index, chapter] of chapters.entries()) {
    const option = document.createElement("option");
    option.value = index;
    option.innerText = chapter.title;
    selectFrom.appendChild(option);
    selectTo.appendChild(option.cloneNode(true));
  }

  selectFrom.firstChild.setAttribute("selected", "selected");
  selectTo.lastChild.setAttribute("selected", "selected");

  //=====
  // Insert clones of the created elements to both button lists for different screen widths
  // And add their event functions
  //=====

  const defaultButtonRows = document.querySelectorAll("div.row.reduced-gutter");
  defaultButtonRows.forEach((defaultButtonRow) => {
    const containerClone = container.cloneNode(true);
    defaultButtonRow.insertAdjacentElement("afterend", containerClone);

    containerClone.querySelector("a.RRScraperDownloadAllButton").onclick =
      () => {
        const startIndex = Number(
          document.querySelector("select.RRScraperFromSelect").value
        );
        const endIndex = Number(
          document.querySelector("select.RRScraperToSelect").value
        );
        const chosenChapters = chapters.slice(startIndex, endIndex + 1);
        downloadChapters(
          chosenChapters.map((chapter) => chapter.url),
          chapters.length,
          startIndex
        );
      };

    containerClone.querySelector("select.RRScraperFromSelect").onchange =
      () => {
        document
          .querySelectorAll("select.RRScraperFromSelect")
          .forEach((select) => {
            select.value = containerClone.querySelector(
              "select.RRScraperFromSelect"
            ).value;
          });
      };

    containerClone.querySelector("select.RRScraperToSelect").onchange = () => {
      document
        .querySelectorAll("select.RRScraperToSelect")
        .forEach((select) => {
          select.value = containerClone.querySelector(
            "select.RRScraperToSelect"
          ).value;
        });
    };
  });
}

async function fetchChapterList(url = null) {
  const parser = new DOMParser();
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
      .then((text) => parser.parseFromString(text, "text/html"));
  }

  const chapters = [
    ...html.querySelectorAll("tr.chapter-row td:not(.text-right) a"),
  ].map((element) => {
    return {
      title: element.innerText.trim(),
      url: element.getAttribute("href"),
    };
  });

  // Because javascript hides chapters from the list
  // we check and retry if chapters are hidden
  if (
    chapters.length === 20 &&
    html.querySelectorAll(".pagination-small").length > 0
  ) {
    return fetchChapterList(url);
  }

  return chapters;
}

async function downloadChapters(chapterUrls, totalChapterCount, startIndex) {
  const chapterRegex = new RegExp(
    /https:\/\/www.royalroad.com\/fiction\/.*?\/chapter\/.*/g
  );
  if (chapterUrls.length === 0 && !chapterRegex.test(window.location.href))
    return;

  // Disable all the download buttons
  document
    .querySelectorAll("a.RRScraperDownloadAllButton")
    .forEach((element) => {
      element.style.pointerEvents = "none";
      element.style.background = "#060606";
      element.style.borderBottom = "2px inset rgba(256,256,256,.1)";
    });
  document.querySelectorAll("a.RRScraperDownloadButton").forEach((element) => {
    element.style.pointerEvents = "none";
    element.style.opacity = ".65";
  });

  const zip = new JSZip();
  const parser = new DOMParser();

  const fictionName = window.location.href.split("/")[5];

  const totalChapterCountLength = totalChapterCount.toString().length;

  // 0 required so all chapter numbers use the same amount of characters
  const fillZeros = "0".repeat(totalChapterCountLength);

  // timeoutLoop for the progress bar to work
  let index = 0;
  async function timeoutLoop() {
    let chapterUrl;
    let html;
    if (chapterUrls.length > 0) {
      // If its downloading from a fiction page
      chapterUrl = chapterUrls[index];

      html = await fetch("https://www.royalroad.com" + chapterUrl, {
        credentials: "omit",
      })
        .then((response) => response.text())
        .then((text) => parser.parseFromString(text, "text/html"));
      if (
        html.body.firstChild.tagName === "PRE" &&
        html.body.firstChild.innerText === "Slow down!"
      ) {
        // When pages are loaded too fast RoyalRoad may tell you to slow down
        // So we retry it if it does
        print("Slow down!");
        setTimeout(timeoutLoop, 0);
        return;
      }
    } else {
      // If its downloading from a chapter page
      chapterUrl = window.location.href.match(/\/fiction.*/g)[0];
      html = document.querySelector("html").cloneNode(true);
    }

    // Edit spoilers so they function the same offline
    html.querySelectorAll(".spoiler-new, .spoiler").forEach((element) => {
      if (element.classList.contains("spoiler")) {
        element.innerHTML = element.querySelector(".spoiler-inner").innerHTML;
      }
      element.className = "spoiler";
      const spoilerContent = document.createElement("div");
      [...element.children].forEach((child) =>
        spoilerContent.appendChild(child)
      );
      const spoilerLabel = document.createElement("label");
      spoilerLabel.innerText = "Spoiler";
      const spoilerCheckbox = document.createElement("input");
      spoilerCheckbox.type = "checkbox";
      spoilerLabel.appendChild(spoilerCheckbox);
      element.appendChild(spoilerLabel);
      element.appendChild(spoilerContent);
    });

    // Edit the header links so they work offline
    let chapterHeader = html.querySelector(
      "div.fic-header > div > div.col-lg-6"
    );
    chapterHeader.querySelectorAll("a").forEach((element) => {
      element.setAttribute(
        "href",
        `https://www.royalroad.com${element.getAttribute("href")}`
      );
    });
    chapterHeader.querySelector(
      "h1"
    ).innerHTML = `<a href="https://www.royalroad.com${chapterUrl}" class="font-white">${
      chapterHeader.querySelector("h1").innerHTML
    }</a>`;

    let chapter = getCustomHeader() + chapterHeader.outerHTML;

    chapter += '\n<div class="portlet">';

    [...html.querySelector("div.chapter-content").parentNode.children].forEach(
      (element) => {
        if (
          element.classList.contains("chapter-content") ||
          element.classList.contains("author-note-portlet")
        ) {
          // Add chapter content and author notes
          chapter += "\n" + element.outerHTML;
        } else if (
          element.classList.contains("nav-buttons") ||
          element.classList.contains("margin-bottom-10")
        ) {
          // Add prev/next/index buttons and make them work offline
          element.querySelectorAll("a").forEach((element2) => {
            if (element2.innerText.includes("Index")) {
              element2.setAttribute("href", ".");
              return;
            }
            let adjFilledIndex = "";
            if (startIndex < 0) {
              // if chapter couldn't be found in list
              // either because it was renamed or deleted
              adjFilledIndex = "unknown";
            } else if (element2.innerText.includes("Previous")) {
              adjFilledIndex = (fillZeros + (index + startIndex)).slice(
                totalChapterCountLength * -1
              );
            } else if (element2.innerText.includes("Next")) {
              adjFilledIndex = (fillZeros + (index + startIndex + 2)).slice(
                totalChapterCountLength * -1
              );
            }
            let adjChapterUrlSplit = element2.getAttribute("href").split("/");
            let adjChapterName =
              adjChapterUrlSplit[adjChapterUrlSplit.length - 1];
            element2.setAttribute(
              "href",
              `${adjFilledIndex}_${adjChapterName}.html`
            );
          });
          chapter += "\n" + element.outerHTML;
        }
      }
    );

    chapter += getCustomFooter();

    chapter = chapter.replace(/^\s+|(\s*\n)/gm, "");

    let chapterUrlSplit = chapterUrl.split("/");
    let chapterName = chapterUrlSplit[chapterUrlSplit.length - 1];

    let filledIndex;
    if (startIndex < 0) {
      // if chapter couldn't be found in list
      // either because it was renamed or deleted
      filledIndex = "unknown";
    } else {
      filledIndex = (fillZeros + (index + startIndex + 1)).slice(
        totalChapterCountLength * -1
      );
    }

    zip.file(`${fictionName}/${filledIndex}_${chapterName}.html`, chapter);

    // Change progress bar
    document.querySelectorAll("div.RRScraperProgressBar").forEach((element) => {
      element.style.width = `${((index + 1) / chapterUrls.length) * 100}%`;
    });

    if (++index < chapterUrls.length) {
      // If there are chapters left, fetch them
      setTimeout(timeoutLoop, 0);
    } else {
      // If all chapters have been fetched, zip them and download them
      zip
        .generateAsync({
          type: "blob",
          compression: "DEFLATE",
          compressionOptions: {
            level: 9,
          },
        })
        .then((blob) => {
          saveAs(blob, fictionName + ".zip");

          // Re-enable all the download buttons
          document
            .querySelectorAll("a.RRScraperDownloadAllButton")
            .forEach((element) => {
              element.style.pointerEvents = null;
              element.style.background = null;
              element.style.borderBottom = null;
              element.querySelector("div.RRScraperProgressBar").style.width =
                "0";
            });
          document
            .querySelectorAll("a.RRScraperDownloadButton")
            .forEach((element) => {
              element.style.pointerEvents = null;
              element.style.opacity = null;
            });
        });
    }
  }
  setTimeout(timeoutLoop, 0);
}

function getCustomHeader() {
  return `<!DOCTYPE html>
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
</style>
</head>
<body>
<div class="container">`.replace(
    /^\s+|(\s*\n)|(\s+(?=[\{\(\}\)\/:,<>]))|((?<=[\{\(\}\)\/:,<>])\s+)/gm,
    ""
  );
}

function getCustomFooter() {
  return "</div></div></body></html>";
}
