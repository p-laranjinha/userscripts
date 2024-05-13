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
// TODO: make a version that uses the API instead of automated clicks (example:https://greasyfork.org/en/scripts/460393-entry-deleter)

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
  console.log("observer");
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
  const first_entry_edit_button = document.querySelector(
    ".entry-card .edit:not([class^='rtonne-anilist-multiselect'])"
  );
  first_entry_edit_button.click();
  const [first_entry_dialog_close_button] = await waitForElements(
    ".el-dialog__headerbtn"
  );
  const [first_entry_dialog_custom_lists_container] = await waitForElements(
    ".custom-lists"
  );
  const first_entry_dialog_custom_lists_labels =
    first_entry_dialog_custom_lists_container.querySelectorAll(
      ".el-checkbox__label"
    );
  first_entry_dialog_close_button.click();
  document.body.classList.remove("rtonne-anilist-multiselect-modal-hidden");
  document.body.classList.remove("rtonne-anilist-multiselect-dialog-hidden");
  const custom_lists = Array.from(first_entry_dialog_custom_lists_labels).map(
    (label) => label.innerText.trim()
  );

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
    const selected = document.querySelectorAll(
      ".rtonne-anilist-multiselect-selected"
    ).length;

    let action_list = "";
    if (!delete_checkbox.checked) {
      if (status_enabled_checkbox.checked) {
        action_list += `<li>Set <u>Status</u> to <b>${status_input.value}</b>.</li>`;
      }
      if (score_enabled_checkbox.checked) {
        action_list += `<li>Set <u>Score</u> to <b>${score_input.value}</b>.</li>`;
      }
      if (is_list_anime) {
        if (progress_inputs.episode_enabled_checkbox.checked) {
          action_list += `<li>Set <u>Episode Progress</u> to <b>${progress_inputs.episode_input.value}</b>.</li>`;
        }
        if (progress_inputs.rewatches_enabled_checkbox.checked) {
          action_list += `<li>Set <u>Total Rewatches</u> to <b>${progress_inputs.rewatches_input.value}</b>.</li>`;
        }
      } else {
        if (progress_inputs.chapter_enabled_checkbox.checked) {
          action_list += `<li>Set <u>Chapter Progress</u> to <b>${progress_inputs.chapter_input.value}</b>.</li>`;
        }
        if (progress_inputs.volume_enabled_checkbox.checked) {
          action_list += `<li>Set <u>Volume Progress</u> to <b>${progress_inputs.volume_input.value}</b>.</li>`;
        }
        if (progress_inputs.rereads_enabled_checkbox.checked) {
          action_list += `<li>Set <u>Total Rereads</u> to <b>${progress_inputs.rereads_input.value}</b>.</li>`;
        }
      }
      if (start_date_enabled_checkbox.checked) {
        action_list += `<li>Set <u>Start Date</u> to <b>${start_date_input.value}</b>.</li>`;
      }
      if (finish_date_enabled_checkbox.checked) {
        action_list += `<li>Set <u>Finish Date</u> to <b>${finish_date_input.value}</b>.</li>`;
      }
      if (notes_enabled_checkbox.checked) {
        action_list += `<li>Set <u>Notes</u> to <b>${notes_input.value}</b>.</li>`;
      }
      for (let i = 0; i < custom_lists.length; i++) {
        if (!custom_lists_checkboxes[i].indeterminate) {
          if (custom_lists_checkboxes[i].checked) {
            action_list += `<li>Add to the <b>${custom_lists[i]}</b> <u>Custom List</u>.</li>`;
          } else {
            action_list += `<li>Remove from the <b>${custom_lists[i]}</b> <u>Custom List</u>.</li>`;
          }
        }
      }
      if (!hide_from_status_list_checkbox.indeterminate) {
        if (hide_from_status_list_checkbox.checked) {
          action_list += `<li><u><b>Hide</b> from status lists.</u></li>`;
        } else {
          action_list += `<li><u><b>Show</b> on status lists.</u></li>`;
        }
      }
      if (!private_checkbox.indeterminate) {
        if (private_checkbox.checked) {
          action_list += `<li>Set as <u><b>Private</b></u>.</li>`;
        } else {
          action_list += `<li>Set as <u><b>Public</b></u>.</li>`;
        }
      }
      if (!favourite_checkbox.indeterminate) {
        if (favourite_checkbox.checked) {
          action_list += `<li><b>Add</b> to <u>Favourites</u>.</li>`;
        } else {
          action_list += `<li><b>Remove</b> from <u>Favourites</u>.</li>`;
        }
      }
    } else {
      action_list += `<li><u><b>Delete</b></u>.</li>`;
    }

    const confirm_popup_button = createConfirmPopup(
      "Are you sure?",
      `You're about to do the following actions to <b><u>${selected} entr${
        selected > 1 ? "ies" : "y"
      }</u></b>:
      ${action_list}`
    );

    confirm_popup_button.onclick = async () => {
      createConfirmPopup("test", "test");
      const selected_entries = document.querySelectorAll(
        ".rtonne-anilist-multiselect-selected"
      );
      selected_entries[0]
        .querySelector(".edit:not([class^='rtonne-anilist-multiselect'])")
        .click();
      if (!delete_checkbox.checked) {
        if (status_enabled_checkbox.checked) {
        }
        if (score_enabled_checkbox.checked) {
        }
        if (is_list_anime) {
          if (progress_inputs.episode_enabled_checkbox.checked) {
          }
          if (progress_inputs.rewatches_enabled_checkbox.checked) {
          }
        } else {
          if (progress_inputs.chapter_enabled_checkbox.checked) {
          }
          if (progress_inputs.volume_enabled_checkbox.checked) {
          }
          if (progress_inputs.rereads_enabled_checkbox.checked) {
          }
        }
        if (start_date_enabled_checkbox.checked) {
        }
        if (finish_date_enabled_checkbox.checked) {
        }
        if (notes_enabled_checkbox.checked) {
        }
        for (let i = 0; i < custom_lists.length; i++) {
          if (!custom_lists_checkboxes[i].indeterminate) {
            if (custom_lists_checkboxes[i].checked) {
            } else {
            }
          }
        }
        if (!hide_from_status_list_checkbox.indeterminate) {
          if (hide_from_status_list_checkbox.checked) {
          } else {
          }
        }
        if (!private_checkbox.indeterminate) {
          if (private_checkbox.checked) {
          } else {
          }
        }
        if (!favourite_checkbox.indeterminate) {
          if (favourite_checkbox.checked) {
          } else {
          }
        }
      } else {
        const [dialog_delete_button] = await waitForElements(
          ".list-editor-wrap .delete-btn"
        );
        dialog_delete_button.click();

        const [confirm_ok_button] = await waitForElements(
          ".el-message-box .el-button--small.el-button--primary"
        );
        // I need to wait for the confirm cancel button as well so it all load properly, somehow
        await waitForElements(
          ".el-message-box .el-button--small:not(.el-button--primary)"
        );
        const fading_in_confirm_message_container = document.querySelector(
          ".el-message-box__wrapper.msgbox-fad-enter-active"
        );
        // Wait until message container finished fading in
        await waitForElementToBeRemovedOrHidden(
          fading_in_confirm_message_container
        );

        // confirm_ok_button.click();

        // const new_confirm_cancel_button = document.querySelector(
        //   ".list-editor-wrap .delete-btn"
        // );
        // await waitForElementToBeRemovedOrHidden(new_confirm_cancel_button);
      }
    };
  };

  new MutationObserver(() => {
    const selected = document.querySelectorAll(
      ".rtonne-anilist-multiselect-selected"
    ).length;
    currently_selected_label.innerHTML = `You have <b><u>${selected}</u></b> entr${
      selected > 1 ? "ies" : "y"
    } selected.`;
    if (selected > 0) {
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
