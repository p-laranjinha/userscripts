// ==UserScript==
// @name        AniList Multi-Select List Entries
// @license     MIT
// @namespace   rtonne
// @match       https://anilist.co/*
// @icon        https://www.google.com/s2/favicons?sz=64&domain=anilist.co
// @version     1.0
// @author      Rtonne
// @description Adds the ability to select multiple manga/anime in your lists and act on them simultaneously
// @grant       GM.getResourceText
// @grant       GM.addStyle
// @require     components.js
// @require     helpers.js
// @resource    GLOBAL_CSS global.css
// ==/UserScript==

// TODO: make buttons work for list views
// TODO: check how the style affect other people's lists
// TODO: add scrollbar to dropdown
// TODO: make it work for different color themes
// TODO: see if changing the account color changes input colors
// TODO: check what validation errors might occur (like having finish date before start date)
// TODO: make number inputs only allow "steppable" values
// TODO: see if anything gets saved even when deleted (to know if other actions have to be done when deletion is selected)
// TODO: add info explaining what indeterminate checkboxes are
// TODO: add a warning when an error occurs (its not getting the custom lists, for example)
// TODO: make advanced scores work
// TODO: make actions return errors that require input to continue (maybe have option to just skip all with errors)
// TODO: delete waitForElementToBeDeleted if not required
// TODO: add validation to the API requesters so they fail properly on fetch error
// TODO: standardize either using dialog or popup or message box

const GLOBAL_CSS = GM.getResourceText("GLOBAL_CSS");
GM.addStyle(GLOBAL_CSS);

let WAS_LAST_LIST_ANIME = false;
let FORM;

const plus_svg = /*svg*/ `
  <svg aria-hidden="true" focusable="false" data-prefix="fas" data-icon="plus-h" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" class="svg-inline--fa fa-plus-h fa-w-16 fa-lg">
    <!--!Font Awesome Free 6.5.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.-->
    <path fill="currentColor" d="M256 80c0-17.7-14.3-32-32-32s-32 14.3-32 32V224H48c-17.7 0-32 14.3-32 32s14.3 32 32 32H192V432c0 17.7 14.3 32 32 32s32-14.3 32-32V288H400c17.7 0 32-14.3 32-32s-14.3-32-32-32H256V80z"/>
  </svg>
`;

const minus_svg = /*svg*/ `
  <svg aria-hidden="true" focusable="false" data-prefix="fas" data-icon="minus-h" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" class="svg-inline--fa fa-minus-h fa-w-16 fa-lg">
    <!--!Font Awesome Free 6.5.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.-->
    <path fill="currentColor" d="M432 256c0 17.7-14.3 32-32 32L48 288c-17.7 0-32-14.3-32-32s14.3-32 32-32l352 0c17.7 0 32 14.3 32 32z"/>
  </svg>
`;

let current_url = null;
let new_url = null;

const url_regex =
  /^https:\/\/anilist.co\/user\/.+\/((animelist)|(mangalist))(\/.*)?$/;

// Using observer to run script whenever the body changes
// because anilist doesn't reload when changing page
const observer = new MutationObserver(async () => {
  try {
    new_url = window.location.href;

    // Because anilist doesn't reload on changing url
    // we have to allow the whole website and check here if we are in a list
    if (!url_regex.test(new_url)) {
      return;
    }

    // If we have actions in the banner, it's not our list and can't edit it
    if (
      (await waitForElements(".banner-content .actions"))[0].children.length > 0
    ) {
      return;
    }

    setupButtons();
    setupForm();
  } catch (err) {
    console.log(err);
  }
});
observer.observe(document.body, {
  childList: true,
  subtree: true,
});

async function setupButtons() {
  const entries = await waitForElements(".entry, .entry-card");

  // If the url is different we are in a different list
  // Or if the list length is different, we loaded more of the same list
  if (
    current_url === new_url &&
    entries.length ===
      document.querySelectorAll(".rtonne-anilist-multiselect-addbutton").length
  ) {
    return;
  }

  current_url = new_url;

  entries.forEach((entry) => {
    const cover = entry.querySelector(".cover");

    // We return if the item already has a select button so
    // there isn't an infinite loop where adding a button triggers
    // the observer which adds more buttons
    if (cover.querySelector(".rtonne-anilist-multiselect-addbutton")) return;

    const add_button = document.createElement("div");
    add_button.className = "rtonne-anilist-multiselect-addbutton edit";
    add_button.innerHTML = plus_svg;
    cover.querySelector(".edit").after(add_button);

    const remove_button = document.createElement("div");
    remove_button.className = "rtonne-anilist-multiselect-removebutton edit";
    remove_button.innerHTML = minus_svg;
    add_button.after(remove_button);

    add_button.onclick = () => {
      entry.className += " rtonne-anilist-multiselect-selected";
    };

    remove_button.onclick = () => {
      entry.classList.remove("rtonne-anilist-multiselect-selected");
    };
  });
}

async function setupForm() {
  // Check if the form needs to be made/remade (changed from manga to anime or vice-versa)
  const [container] = await waitForElements(".filters-wrap");
  const is_list_anime = document
    .querySelector(".nav.container > a[href$='animelist']")
    .classList.contains("router-link-active");
  const list_already_exists = document.querySelector(
    ".rtonne-anilist-multiselect-form"
  );
  if (list_already_exists) {
    if (WAS_LAST_LIST_ANIME !== is_list_anime) {
      FORM.remove();
    } else {
      return;
    }
  }
  WAS_LAST_LIST_ANIME = is_list_anime;

  // Get data required for the form
  let status_options = [
    "Reading",
    "Plan to read",
    "Completed",
    "Rereading",
    "Paused",
    "Dropped",
  ];
  if (is_list_anime) {
    status_options = [
      "Watching",
      "Plan to read",
      "Completed",
      "Rewatching",
      "Paused",
      "Dropped",
    ];
  }

  let score_step = 1,
    score_max;
  const [element_with_score_type] = await waitForElements(
    ".content.container > .medialist"
  );
  if (element_with_score_type.classList.contains("POINT_10_DECIMAL")) {
    score_step = 0.5;
    score_max = 10;
  } else if (element_with_score_type.classList.contains("POINT_100")) {
    score_max = 100;
  } else if (element_with_score_type.classList.contains("POINT_10")) {
    score_max = 10;
  } else if (element_with_score_type.classList.contains("POINT_5")) {
    score_max = 5;
  } else {
    // if (element_with_score_type.classList.contains("POINT_3"))
    score_max = 3;
  }

  document.body.className +=
    " rtonne-anilist-multiselect-modal-hidden rtonne-anilist-multiselect-dialog-hidden";
  // Sending document to getCustomListsFromElement should use the first entry
  const custom_lists = (
    await getDataFromElementDialog(document)
  ).custom_lists.map((custom_list) => custom_list.name);
  document.body.classList.remove("rtonne-anilist-multiselect-modal-hidden");
  document.body.classList.remove("rtonne-anilist-multiselect-dialog-hidden");

  // Create the form
  FORM = document.createElement("div");
  FORM.className = "filters rtonne-anilist-multiselect-form";
  FORM.style.display = "none";
  container.append(FORM);

  const status_container = document.createElement("div");
  status_container.id = "rtonne-anilist-multiselect-status-input";
  status_container.className =
    "rtonne-anilist-multiselect-has-enabled-checkbox";
  FORM.append(status_container);
  const status_label = document.createElement("label");
  status_label.innerText = "Status";
  status_container.append(status_label);
  const status_enabled_checkbox = createCheckbox(status_container, "Enabled");
  const status_input = createSelectInput(status_container, status_options);

  const score_container = document.createElement("div");
  score_container.id = "rtonne-anilist-multiselect-score-input";
  score_container.className = "rtonne-anilist-multiselect-has-enabled-checkbox";
  FORM.append(score_container);
  const score_label = document.createElement("label");
  score_label.innerText = "Score";
  score_container.append(score_label);
  const score_enabled_checkbox = createCheckbox(score_container, "Enabled");
  const score_input = createNumberInput(score_container, score_max, score_step);

  /**
   * Collection of progress inputs.
   * Changes depending on if the list is for anime or manga.
   * @type {{
   *  episode_enabled_checkbox: HTMLInputElement,
   *  episode_input: HTMLInputElement,
   *  rewatches_enabled_checkbox: HTMLInputElement,
   *  rewatches_input: HTMLInputElement,
   * } | {
   *  chapter_enabled_checkbox: HTMLInputElement,
   *  chapter_input: HTMLInputElement,
   *  volume_enabled_checkbox: HTMLInputElement,
   *  volume_input: HTMLInputElement,
   *  rereads_enabled_checkbox: HTMLInputElement,
   *  rereads_input: HTMLInputElement,
   * }}
   */
  const progress_inputs = (() => {
    const result = {};
    if (is_list_anime) {
      const episode_container = document.createElement("div");
      episode_container.id = "rtonne-anilist-multiselect-episode-input";
      episode_container.className =
        "rtonne-anilist-multiselect-has-enabled-checkbox";
      FORM.append(episode_container);
      const episode_label = document.createElement("label");
      episode_label.innerText = "Episode Progress";
      episode_container.append(episode_label);
      result.episode_enabled_checkbox = createCheckbox(
        episode_container,
        "Enabled"
      );
      result.episode_input = createNumberInput(episode_container);

      const rewatches_container = document.createElement("div");
      rewatches_container.id = "rtonne-anilist-multiselect-rewatches-input";
      rewatches_container.className =
        "rtonne-anilist-multiselect-has-enabled-checkbox";
      FORM.append(rewatches_container);
      const rewatches_label = document.createElement("label");
      rewatches_label.innerText = "Total Rewatches";
      rewatches_container.append(rewatches_label);
      result.rewatches_enabled_checkbox = createCheckbox(
        rewatches_container,
        "Enabled"
      );
      result.rewatches_input = createNumberInput(rewatches_container);
    } else {
      const chapter_container = document.createElement("div");
      chapter_container.id = "rtonne-anilist-multiselect-episode-input";
      chapter_container.className =
        "rtonne-anilist-multiselect-has-enabled-checkbox";
      FORM.append(chapter_container);
      const chapter_label = document.createElement("label");
      chapter_label.innerText = "Chapter Progress";
      chapter_container.append(chapter_label);
      result.chapter_enabled_checkbox = createCheckbox(
        chapter_container,
        "Enabled"
      );
      result.chapter_input = createNumberInput(chapter_container);

      const volume_container = document.createElement("div");
      volume_container.id = "rtonne-anilist-multiselect-episode-input";
      volume_container.className =
        "rtonne-anilist-multiselect-has-enabled-checkbox";
      FORM.append(volume_container);
      const volume_label = document.createElement("label");
      volume_label.innerText = "Volume Progress";
      volume_container.append(volume_label);
      result.volume_enabled_checkbox = createCheckbox(
        volume_container,
        "Enabled"
      );
      result.volume_input = createNumberInput(volume_container);

      const rereads_container = document.createElement("div");
      rereads_container.id = "rtonne-anilist-multiselect-rewatches-input";
      rereads_container.className =
        "rtonne-anilist-multiselect-has-enabled-checkbox";
      FORM.append(rereads_container);
      const rereads_label = document.createElement("label");
      rereads_label.innerText = "Total Rereads";
      rereads_container.append(rereads_label);
      result.rereads_enabled_checkbox = createCheckbox(
        rereads_container,
        "Enabled"
      );
      result.rereads_input = createNumberInput(rereads_container);
    }
    return result;
  })();

  const start_date_container = document.createElement("div");
  start_date_container.id = "rtonne-anilist-multiselect-start-date-input";
  start_date_container.className =
    "rtonne-anilist-multiselect-has-enabled-checkbox";
  FORM.append(start_date_container);
  const start_date_label = document.createElement("label");
  start_date_label.innerText = "Start Date";
  start_date_container.append(start_date_label);
  const start_date_enabled_checkbox = createCheckbox(
    start_date_container,
    "Enabled"
  );
  const start_date_input = createDateInput(start_date_container);

  const finish_date_container = document.createElement("div");
  finish_date_container.id = "rtonne-anilist-multiselect-finish-date-input";
  finish_date_container.className =
    "rtonne-anilist-multiselect-has-enabled-checkbox";
  FORM.append(finish_date_container);
  const finish_date_label = document.createElement("label");
  finish_date_label.innerText = "Finish Date";
  finish_date_container.append(finish_date_label);
  const finish_date_enabled_checkbox = createCheckbox(
    finish_date_container,
    "Enabled"
  );
  const finish_date_input = createDateInput(finish_date_container);

  const notes_container = document.createElement("div");
  notes_container.id = "rtonne-anilist-multiselect-notes-input";
  notes_container.className = "rtonne-anilist-multiselect-has-enabled-checkbox";
  FORM.append(notes_container);
  const notes_label = document.createElement("label");
  notes_label.innerText = "Notes";
  notes_container.append(notes_label);
  const notes_enabled_checkbox = createCheckbox(notes_container, "Enabled");
  const notes_input = createTextarea(notes_container);

  /** @type {HTMLInputElement|null} */
  let hide_from_status_list_checkbox;
  /** @type {HTMLInputElement[]} */
  const custom_lists_checkboxes = [];
  if (custom_lists.length > 0) {
    const custom_lists_container = document.createElement("div");
    custom_lists_container.id = "rtonne-anilist-multiselect-custom-lists-input";
    FORM.append(custom_lists_container);
    const custom_lists_label = document.createElement("label");
    custom_lists_label.innerText = "Custom Lists";
    custom_lists_container.append(custom_lists_label);

    for (const custom_list of custom_lists) {
      custom_lists_checkboxes.push(
        createIndeterminateCheckbox(custom_lists_container, custom_list)
      );
    }

    const custom_lists_separator = document.createElement("div");
    custom_lists_separator.style.width = "100%";
    custom_lists_separator.style.marginBottom = "6px";
    custom_lists_separator.style.borderBottom =
      "solid 1px rgba(var(--color-text-lighter),.3)";
    custom_lists_container.append(custom_lists_separator);
    hide_from_status_list_checkbox = createIndeterminateCheckbox(
      custom_lists_container,
      "Hide from status lists"
    );
  }

  const other_actions_container = document.createElement("div");
  other_actions_container.id = "rtonne-anilist-multiselect-other-actions-input";
  FORM.append(other_actions_container);
  const other_actions_label = document.createElement("label");
  other_actions_label.innerText = "Other Actions";
  other_actions_container.append(other_actions_label);
  const private_checkbox = createIndeterminateCheckbox(
    other_actions_container,
    "Private"
  );
  const favourite_checkbox = createIndeterminateCheckbox(
    other_actions_container,
    "Favourite"
  );
  const delete_checkbox = createCheckbox(other_actions_container, "Delete");

  const deselect_all_button = createDangerButton(FORM, "Deselect All Entries");

  const confirm_button = createButton(FORM, "Confirm");

  const currently_selected_label = document.createElement("label");
  currently_selected_label.style.alignSelf = "center";
  currently_selected_label.style.color = "rgb(var(--color-blue))";
  FORM.append(currently_selected_label);

  deselect_all_button.onclick = () => {
    const selected_entries = document.querySelectorAll(
      ".entry.rtonne-anilist-multiselect-selected, .entry-card.rtonne-anilist-multiselect-selected"
    );
    for (const entry of selected_entries) {
      entry.classList.remove("rtonne-anilist-multiselect-selected");
    }
  };

  confirm_button.onclick = () => {
    let action_list = "";
    let values_to_be_changed = {};
    if (!delete_checkbox.checked) {
      if (status_enabled_checkbox.checked) {
        action_list += `<li>Set <u>Status</u> to <b>${status_input.value}</b>.</li>`;
        switch (status_input.value) {
          case "Reading":
          case "Watching":
            values_to_be_changed.status = "CURRENT";
            break;
          case "Plan to read":
            values_to_be_changed.status = "PLANNING";
            break;
          case "Completed":
            values_to_be_changed.status = "COMPLETED";
            break;
          case "Rereading":
          case "Rewatching":
            values_to_be_changed.status = "REPEATING";
            break;
          case "Paused":
            values_to_be_changed.status = "PAUSED";
            break;
          case "Dropped":
            values_to_be_changed.status = "DROPPED";
            break;
        }
      }
      if (score_enabled_checkbox.checked) {
        action_list += `<li>Set <u>Score</u> to <b>${score_input.value}</b>.</li>`;
        values_to_be_changed.score = Number(score_input.value);
        if (is_list_anime) {
          if (progress_inputs.episode_enabled_checkbox.checked) {
            action_list += `<li>Set <u>Episode Progress</u> to <b>${progress_inputs.episode_input.value}</b>.</li>`;
            values_to_be_changed.progress = Number(
              progress_inputs.episode_input.value
            );
          }
          if (progress_inputs.rewatches_enabled_checkbox.checked) {
            action_list += `<li>Set <u>Total Rewatches</u> to <b>${progress_inputs.rewatches_input.value}</b>.</li>`;
            values_to_be_changed.repeat = Number(
              progress_inputs.rewatches_input.value
            );
          }
        } else {
          if (progress_inputs.chapter_enabled_checkbox.checked) {
            action_list += `<li>Set <u>Chapter Progress</u> to <b>${progress_inputs.chapter_input.value}</b>.</li>`;
            values_to_be_changed.progress = Number(
              progress_inputs.chapter_input.value
            );
          }
          if (progress_inputs.volume_enabled_checkbox.checked) {
            action_list += `<li>Set <u>Volume Progress</u> to <b>${progress_inputs.volume_input.value}</b>.</li>`;
            values_to_be_changed.progressVolume = Number(
              progress_inputs.volume_input.value
            );
          }
          if (progress_inputs.rereads_enabled_checkbox.checked) {
            action_list += `<li>Set <u>Total Rereads</u> to <b>${progress_inputs.rereads_input.value}</b>.</li>`;
            values_to_be_changed.repeat = Number(
              progress_inputs.rereads_input.value
            );
          }
        }
      }
      if (start_date_enabled_checkbox.checked) {
        action_list += `<li>Set <u>Start Date</u> to <b>${start_date_input.value}</b>.</li>`;
        values_to_be_changed.startedAt = {
          year: start_date_input.value.split("-")[0],
          month: start_date_input.value.split("-")[1],
          day: start_date_input.value.split("-")[2],
        };
      }
      if (finish_date_enabled_checkbox.checked) {
        action_list += `<li>Set <u>Finish Date</u> to <b>${finish_date_input.value}</b>.</li>`;
        values_to_be_changed.completedAt = {
          year: start_date_input.value.split("-")[0],
          month: start_date_input.value.split("-")[1],
          day: start_date_input.value.split("-")[2],
        };
      }
      if (notes_enabled_checkbox.checked) {
        action_list += `<li>Set <u>Notes</u> to <b>${notes_input.value}</b>.</li>`;
        values_to_be_changed.notes = notes_input.value;
      }
      if (custom_lists.length > 0) {
        for (let i = 0; i < custom_lists.length; i++) {
          if (!custom_lists_checkboxes[i].indeterminate) {
            if (!values_to_be_changed.customLists) {
              values_to_be_changed.customLists = [];
            }
            if (custom_lists_checkboxes[i].checked) {
              action_list += `<li>Add to the <b>${custom_lists[i]}</b> <u>Custom List</u>.</li>`;
              values_to_be_changed.customLists.push(custom_lists[i]);
            } else {
              action_list += `<li>Remove from the <b>${custom_lists[i]}</b> <u>Custom List</u>.</li>`;
            }
          }
        }
        if (!hide_from_status_list_checkbox.indeterminate) {
          if (hide_from_status_list_checkbox.checked) {
            action_list += `<li><u><b>Hide</b> from status lists.</u></li>`;
            values_to_be_changed.hiddenFromStatusLists = true;
          } else {
            action_list += `<li><u><b>Show</b> on status lists.</u></li>`;
            values_to_be_changed.hiddenFromStatusLists = false;
          }
        }
      }
      if (!private_checkbox.indeterminate) {
        if (private_checkbox.checked) {
          action_list += `<li>Set as <u><b>Private</b></u>.</li>`;
          values_to_be_changed.private = true;
        } else {
          action_list += `<li>Set as <u><b>Public</b></u>.</li>`;
          values_to_be_changed.private = false;
        }
      }
      if (!favourite_checkbox.indeterminate) {
        if (favourite_checkbox.checked) {
          action_list += `<li><b>Add</b> to <u>Favourites</u>.</li>`;
          values_to_be_changed.favourite = true;
        } else {
          action_list += `<li><b>Remove</b> from <u>Favourites</u>.</li>`;
          values_to_be_changed.favourite = false;
        }
      }
    } else {
      values_to_be_changed.delete = true;
      action_list += `<li><u><b>Delete</b></u>.</li>`;
    }

    const selected_entries = document.querySelectorAll(
      ".rtonne-anilist-multiselect-selected"
    );
    const confirm_popup_button = createConfirmPopup(
      "Are you sure?",
      `You're about to do the following actions to <b><u>${
        selected_entries.length
      } entr${selected_entries.length > 1 ? "ies" : "y"}</u></b>:
      ${action_list}`
    );

    confirm_popup_button.onclick = async () => {
      // Content is in yet another function so I can do stuff after it returns anywhere
      await (async () => {
        let is_cancelled = false;
        const {
          dialog_wrapper,
          dialog_cancel_button,
          changeDialogTitle,
          changeDialogContent,
          closeDialog,
        } = createUpdatableCancelPopup("Processing the request...", "");
        dialog_wrapper.onclick = dialog_cancel_button.onclick = () => {
          is_cancelled = true;
        };

        let media_ids = [];
        for (const entry of selected_entries) {
          const entry_title_link = entry.querySelector(".title > a");
          const entry_id = Number(entry_title_link.href.split("/")[4]);
          media_ids.push(entry_id);
        }
        const { ids } = await turnMediaIdsIntoIds(media_ids);
        let dialog_data = [];

        if (values_to_be_changed.delete) {
          for (let i = 0; i < selected_entries.length && !is_cancelled; i++) {
            changeDialogContent(
              createEntryDialogContent(
                `Deleting: <b>${selected_entries[i]
                  .querySelector(".title > a")
                  .innerText.trim()}</b>`,
                selected_entries[i].querySelector(".image").style
                  .backgroundImage,
                i + 1,
                selected_entries.length
              )
            );
            await deleteEntry(ids[i]);
          }
          closeDialog();
          return;
        }
        if (values_to_be_changed.favourite !== undefined) {
          for (let i = 0; i < selected_entries.length && !is_cancelled; i++) {
            if (!dialog_data[i]) {
              dialog_data[i] = await getDataFromElementDialog(
                selected_entries[i]
              );
            }
            if (
              values_to_be_changed.favourite !== dialog_data[i].is_favourite
            ) {
              changeDialogContent(
                createEntryDialogContent(
                  `${
                    values_to_be_changed.favourite
                      ? "Adding to favourites"
                      : "Removing from favourites"
                  }: <b>${selected_entries[i]
                    .querySelector(".title > a")
                    .innerText.trim()}</b>`,
                  selected_entries[i].querySelector(".image").style
                    .backgroundImage,
                  i + 1,
                  selected_entries.length
                )
              );
              if (is_list_anime) {
                await toggleFavouriteForEntry({ animeId: media_ids[i] });
              } else {
                await toggleFavouriteForEntry({ mangaId: media_ids[i] });
              }
            }
          }
        }

        // Adding/removing from custom lists requires more meddling
        if (
          custom_lists_checkboxes.some((checkbox) => !checkbox.indeterminate)
        ) {
          // If all custom lists have been decided no further processing is required
          if (
            custom_lists_checkboxes.every((checkbox) => !checkbox.indeterminate)
          ) {
            for (let i = 0; i < selected_entries.length && !is_cancelled; i++) {
              changeDialogContent(
                createEntryDialogContent(
                  `Updating: <b>${selected_entries[i]
                    .querySelector(".title > a")
                    .innerText.trim()}</b>`,
                  selected_entries[i].querySelector(".image").style
                    .backgroundImage,
                  i + 1,
                  selected_entries.length
                )
              );
              await updateEntry(ids[i], values_to_be_changed);
            }
            closeDialog();
            return;
          }
          for (let i = 0; i < selected_entries.length && !is_cancelled; i++) {
            changeDialogContent(
              createEntryDialogContent(
                `Updating: <b>${selected_entries[i]
                  .querySelector(".title > a")
                  .innerText.trim()}</b>`,
                selected_entries[i].querySelector(".image").style
                  .backgroundImage,
                i + 1,
                selected_entries.length
              )
            );
            let final_custom_lists = [];
            if (!dialog_data[i]) {
              dialog_data[i] = await getDataFromElementDialog(
                selected_entries[i]
              );
            }
            let entry_custom_lists = dialog_data[i].custom_lists;
            for (let j = 0; j < custom_lists.length; j++) {
              if (!custom_lists_checkboxes[j].indeterminate) {
                if (custom_lists_checkboxes[j].checked) {
                  final_custom_lists.push(custom_lists[j]);
                }
              } else {
                if (entry_custom_lists[j].checked) {
                  final_custom_lists.push(custom_lists[j]);
                }
              }
            }
            await updateEntry(ids[i], {
              ...values_to_be_changed,
              customLists: final_custom_lists,
            });
          }
          closeDialog();
          return;
        }

        changeDialogContent(
          "Updating all the entries at once. Not possible to cancel."
        );
        await batchUpdateEntries(ids, values_to_be_changed);
        closeDialog();
      })();

      const finished_popup_button = createConfirmPopup(
        "Done!",
        "The request has finished. Do you want to refresh?"
      );
      finished_popup_button.onclick = () => window.location.reload();
    };
  };

  new MutationObserver(() => {
    const selected_entries = document.querySelectorAll(
      ".rtonne-anilist-multiselect-selected"
    ).length;
    currently_selected_label.innerHTML = `You have <b><u>${selected_entries}</u></b> entr${
      selected_entries > 1 ? "ies" : "y"
    } selected.`;
    if (selected_entries > 0) {
      FORM.style.display = "flex";
    } else {
      FORM.style.display = "none";
    }
  }).observe(document.querySelector(".lists"), {
    childList: true,
    subtree: true,
    attributeFilter: ["class"],
  });
}