/**
 * Creates a select input.
 * @param {HTMLElement} container A parent element to append the input to.
 * @param {string[]} options The option values for the select input.
 * @returns The select input element.
 */
function createSelectInput(container, options) {
  const input_container_1 = document.createElement("div");
  input_container_1.className = "el-select";
  input_container_1.style.width = "100%";
  container.append(input_container_1);
  const input_container_2 = document.createElement("div");
  input_container_2.className = "el-input el-input--suffix";
  input_container_1.append(input_container_2);
  const input = document.createElement("input");
  input.className = "el-input__inner";
  input.readOnly = true;
  input.autocomplete = "off";
  input_container_2.append(input);
  const input_suffix = document.createElement("span");
  input_suffix.className = "el-input__suffix";
  input_container_2.append(input_suffix);
  const input_suffix_inner = document.createElement("span");
  input_suffix_inner.className = "el-input__suffix-inner";
  input_suffix.append(input_suffix_inner);
  const input_icon = document.createElement("i");
  input_icon.className = "el-select__caret el-input__icon el-icon-arrow-up";
  input_suffix_inner.append(input_icon);

  input.value = options[0];

  const dropdown = document.createElement("div");
  dropdown.className = "el-select-dropdown el-popper";
  dropdown.style.minWidth = "180px";
  dropdown.style.zIndex = "10000";
  dropdown.style.position = "absolute";
  dropdown.style.transition =
    "transform .3s cubic-bezier(.23,1,.32,1),opacity .3s cubic-bezier(.23,1,.32,1)";
  dropdown.style.opacity = "0";
  container.append(dropdown);
  const dropdown_arrow = document.createElement("div");
  dropdown_arrow.className = "popper__arrow";
  dropdown_arrow.style.left = "35px";
  dropdown_arrow.setAttribute("x-arrow", "");
  dropdown.append(dropdown_arrow);
  const dropdown_scrollbar = document.createElement("div");
  dropdown_scrollbar.className = "el-scrollbar";
  dropdown.append(dropdown_scrollbar);
  const dropdown_list_container = document.createElement("div");
  dropdown_list_container.className =
    "el-select-dropdown__wrap el-scrollbar__wrap";
  dropdown_list_container.style.marginBottom = "-14px";
  dropdown_list_container.style.marginRight = "-14px";
  dropdown_scrollbar.append(dropdown_list_container);
  const dropdown_list = document.createElement("ul");
  dropdown_list.className = "el-scrollbar__view el-select-dropdown__list";
  dropdown_list_container.append(dropdown_list);
  for (const option of options) {
    const dropdown_list_item = document.createElement("li");
    dropdown_list_item.className = "el-select-dropdown__item";
    dropdown_list_item.innerText = option;
    dropdown_list_item.onmousedown = () => {
      input.value = option;
    };
    dropdown_list.append(dropdown_list_item);
  }
  const dropdown_dims = dropdown.getBoundingClientRect();
  const dropdown_arrow_dims = dropdown_arrow.getBoundingClientRect();
  const full_dropdown_height =
    dropdown_dims.height + dropdown_arrow_dims.height;
  dropdown.style.transform = "scaleY(0)";

  function setDropdownPosition() {
    const input_dims = input_container_1.getBoundingClientRect();
    const dropdown_fits_below =
      window.innerHeight - input_dims.bottom >= full_dropdown_height;
    if (dropdown_fits_below) {
      dropdown.style.top = `${window.scrollY + input_dims.bottom}px`;
      dropdown.setAttribute("x-placement", "bottom-start");
      dropdown.style.transformOrigin = "center top";
    } else {
      // Subtract 17px for the margins
      dropdown.style.top = `${
        window.scrollY + input_dims.top - dropdown_dims.height - 17
      }px`;
      dropdown.setAttribute("x-placement", "top-start");
      dropdown.style.transformOrigin = "center bottom";
    }
    dropdown.style.left = `${window.scrollX + input_dims.left}px`;
  }

  new IntersectionObserver(
    () => {
      setDropdownPosition();
    },
    {
      rootMargin: `0px 0px -${dropdown_dims.height}px 0px`,
      threshold: 1,
    }
  ).observe(input_container_1);

  let isFocused = false;
  input_container_1.onclick = (event) => {
    if (isFocused) {
      input.blur();
    } else {
      input.focus();
    }
  };
  input.onmousedown = () => false; // Prevent default

  input.onfocus = () => {
    isFocused = true;
    setDropdownPosition();
    input_container_2.className += " is-focus";
    input_icon.className += " is-reverse";

    for (const item of dropdown_list.children) {
      item.classList.remove("selected");
      if (item.innerText === input.value) {
        item.className += " selected";
      }
    }

    dropdown.style.transform = "scaleY(1)";
    dropdown.style.opacity = "1";
  };

  input.onblur = () => {
    isFocused = false;
    input_container_2.classList.remove("is-focus");
    input_icon.classList.remove("is-reverse");
    dropdown.style.transform = "scaleY(0)";
    dropdown.style.opacity = "0";
  };

  // To prevent the input blurring when clicking the icon
  input_icon.onmousedown = (event) => {
    event.preventDefault();
  };

  return input;
}

/**
 * Creates a number input.
 * @param {HTMLElement} container A parent element to append the input to.
 * @param {number} max_value The maximum value the input can reach.
 * @param {number} step The step value of the input.
 * @returns The number input element.
 */
function createNumberInput(container, max_value = Infinity, step = 1) {
  const input_container_1 = document.createElement("div");
  input_container_1.className = "el-input-number is-controls-right";
  input_container_1.style.width = "100%";
  container.append(input_container_1);
  const input_decrease_button = document.createElement("span");
  input_decrease_button.className = "el-input-number__decrease is-disabled";
  input_decrease_button.role = "button";
  input_container_1.append(input_decrease_button);
  const input_decrease_button_arrow = document.createElement("i");
  input_decrease_button_arrow.className = "el-icon-arrow-down";
  input_decrease_button.append(input_decrease_button_arrow);
  const input_increase_button = document.createElement("span");
  input_increase_button.className = "el-input-number__increase";
  input_increase_button.role = "button";
  input_container_1.append(input_increase_button);
  const input_increase_button_arrow = document.createElement("i");
  input_increase_button_arrow.className = "el-icon-arrow-up";
  input_increase_button.append(input_increase_button_arrow);
  const input_container_2 = document.createElement("div");
  input_container_2.className = "el-input";
  input_container_1.append(input_container_2);
  const input = document.createElement("input");
  input.className = "el-input__inner";
  input.type = "number";
  input.min = input.value = 0;
  input.max = max_value;
  input.step = step;
  input_container_2.append(input);

  function setButtonDisabledStatus() {
    if (Number(input.value) <= input_min) {
      input_decrease_button.className += " is-disabled";
    } else {
      input_decrease_button.classList.remove("is-disabled");
    }
    if (Number(input.value) >= input_max) {
      input_increase_button.className += " is-disabled";
    } else {
      input_increase_button.classList.remove("is-disabled");
    }
  }
  input_decrease_button.onclick = () => {
    input.stepDown();
    setButtonDisabledStatus();
  };
  input_increase_button.onclick = () => {
    input.stepUp();
    setButtonDisabledStatus();
  };
  input.oninput = setButtonDisabledStatus;

  const input_max = Number(input.max);
  const input_min = Number(input.min);
  function makeValueValid() {
    if (Number(input.value) > input_max) {
      input.value = input_max;
    }
    if (Number(input.value) < input_min) {
      input.value = input_min;
    }
  }
  input.onblur = makeValueValid;
  input.onkeydown = (event) => {
    if (event.key === "Enter") {
      makeValueValid();
    }
  };

  return input;
}

/**
 * Creates a date input.
 * @param {HTMLElement} container A parent element to append the input to.
 * @returns The date input element.
 */
function createDateInput(container) {
  const input_container = document.createElement("div");
  input_container.className = "el-input el-input--suffix";
  container.append(input_container);
  const input = document.createElement("input");
  input.className = "el-input__inner";
  input.type = "date";
  input.style.width = "100%";
  input_container.append(input);
  const input_icon_container = document.createElement("span");
  input_icon_container.className = "el-input__suffix";
  input_container.append(input_icon_container);
  const input_icon = document.createElement("i");
  input_icon.className = "el-input__icon el-icon-date";
  input_icon.style.pointerEvents = "auto";
  input_icon_container.append(input_icon);

  input_icon.onclick = () => {
    input.showPicker();
  };

  return input;
}

/**
 * Creates a textarea.
 * @param {HTMLElement} container A parent element to append the input to.
 * @returns The textarea element.
 */
function createTextarea(container) {
  const textarea_container = document.createElement("div");
  textarea_container.className = "el-textarea";
  container.append(textarea_container);
  const textarea = document.createElement("textarea");
  textarea.className = "el-textarea__inner";
  textarea.style.minHeight = "34px";
  textarea_container.append(textarea);

  return textarea;
}

/**
 * Creates a checkbox.
 * @param {HTMLElement} container A parent element to append the checkbox to.
 * @param {string} text The text of the checkbox's label.
 * @returns The checkbox element.
 */
function createCheckbox(container, text) {
  const checkbox_container = document.createElement("div");
  checkbox_container.className = "rtonne-anilist-multiselect-checkbox";
  checkbox_container.style.paddingBottom = "4px";
  container.append(checkbox_container);
  const label = document.createElement("label");
  label.innerText = text;
  label.className = "el-checkbox";
  label.style.fontSize = "1.2rem";
  label.style.fontWeight = "400";
  checkbox_container.append(label);
  const middle_label = document.createElement("label");
  middle_label.className = "el-checkbox__input";
  middle_label.style.marginRight = "4px";
  middle_label.style.verticalAlign = "text-top";
  label.prepend(middle_label);
  const button_label = document.createElement("label");
  button_label.className = "el-checkbox__inner";
  button_label.style.cursor = "pointer";
  middle_label.append(button_label);
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.className = "el-checkbox__original";
  button_label.prepend(checkbox);

  checkbox.onchange = () => {
    if (checkbox.checked) {
      label.className += " is-checked";
      middle_label.className += " is-checked";
    } else {
      label.classList.remove("is-checked");
      middle_label.classList.remove("is-checked");
    }
  };

  return checkbox;
}

/**
 * Creates an indeterminate checkbox.
 * When the return checkbox.readOnly or checkbox.indeterminate is true,
 *    it is on a 3rd state where it isn't on nor off.
 * From https://css-tricks.com/indeterminate-checkboxes/.
 * @param {HTMLElement} container A parent element to append the input to.
 * @param {string} text The text of the checkbox's label.
 * @returns The checkbox element.
 */
function createIndeterminateCheckbox(container, text) {
  const checkbox_container = document.createElement("div");
  checkbox_container.className = "rtonne-anilist-multiselect-checkbox";
  checkbox_container.style.paddingBottom = "4px";
  container.append(checkbox_container);
  const label = document.createElement("label");
  label.innerText = text;
  label.className = "el-checkbox";
  label.style.fontSize = "1.2rem";
  label.style.fontWeight = "400";
  checkbox_container.append(label);
  const middle_label = document.createElement("label");
  middle_label.className = "el-checkbox__input";
  middle_label.style.marginRight = "4px";
  middle_label.style.verticalAlign = "text-top";
  label.prepend(middle_label);
  const button_label = document.createElement("label");
  button_label.className = "el-checkbox__inner";
  button_label.style.cursor = "pointer";
  middle_label.append(button_label);
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.className = "el-checkbox__original";
  checkbox.readOnly = true;
  checkbox.indeterminate = true;
  button_label.prepend(checkbox);

  checkbox.onclick = () => {
    if (checkbox.readOnly) {
      checkbox.checked = checkbox.readOnly = false;
    } else if (!checkbox.checked) {
      checkbox.readOnly = checkbox.indeterminate = true;
    }
  };

  checkbox.onchange = () => {
    if (checkbox.checked) {
      label.className += " is-checked";
      middle_label.className += " is-checked";
    } else {
      label.classList.remove("is-checked");
      middle_label.classList.remove("is-checked");
    }
  };

  return checkbox;
}

/**
 * Creates a button.
 * @param {HTMLElement} container A parent element to append the input to.
 * @param {string} text The text inside the button.
 * @returns The button element.
 */
function createButton(container, text) {
  const button = document.createElement("button");
  button.innerText = text;
  button.style.backgroundColor = "rgb(var(--color-blue))";
  button.style.color = "rgb(var(--color-text-bright))";
  button.style.border = "none";
  button.style.borderRadius = "3px";
  button.style.cursor = "pointer";
  button.style.fontSize = "12px";
  button.style.padding = "9px 15px";
  button.style.transition = ".2s";
  container.append(button);
  return button;
}

/**
 * Creates a cancel button.
 * @param {HTMLElement} container A parent element to append the input to.
 * @param {string} text The text inside the button.
 * @returns The button element.
 */
function createCancelButton(container, text) {
  const button = createButton(container, text);
  button.style.backgroundColor = "rgba(var(--color-background),.8)";
  button.style.color = "rgb(var(--color-text))";
  return button;
}

/**
 * Creates a cancel button with a lighter background.
 * @param {HTMLElement} container A parent element to append the input to.
 * @param {string} text The text inside the button.
 * @returns The button element.
 */
function createCancelLighterButton(container, text) {
  const button = createButton(container, text);
  button.style.backgroundColor = "rgba(var(--color-foreground),.8)";
  button.style.color = "rgb(var(--color-text))";
  return button;
}

/**
 * Creates a danger button.
 * @param {HTMLElement} container A parent element to append the input to.
 * @param {string} text The text inside the button.
 * @returns The button element.
 */
function createDangerButton(container, text) {
  const button = createButton(container, text);
  button.style.backgroundColor = "rgba(var(--color-red),.8)";
  button.style.color = "rgb(var(--color-white))";
  return button;
}

/**
 * Creates a popup.
 * @param {string} title_text A text/html title for the popup.
 * @param {string} message_text The text/html content of the popup.
 * @returns The confirm button of the popup.
 */
function createConfirmPopup(title_text, message_text) {
  const modal = document.createElement("div");
  modal.className = "v-modal";
  modal.style.zIndex = "19999";
  document.body.append(modal);

  const wrapper = document.createElement("div");
  wrapper.className = "el-message-box__wrapper";
  wrapper.style.zIndex = "20000";
  document.body.append(wrapper);
  const container = document.createElement("div");
  container.className = "el-message-box";
  wrapper.append(container);

  const header = document.createElement("div");
  header.className = "el-message-box__header";
  container.append(header);
  const title = document.createElement("div");
  title.className = "el-message-box__title";
  title.innerHTML = `<span>${title_text}</span>`;
  header.append(title);
  const close_button = document.createElement("button");
  close_button.className = "el-message-box__headerbtn";
  header.append(close_button);
  const close_button_icon = document.createElement("i");
  close_button_icon.className = "el-message-box__close el-icon-close";
  close_button.append(close_button_icon);

  const content = document.createElement("div");
  content.className = "el-message-box__content";
  container.append(content);
  const message = document.createElement("div");
  message.className = "el-message-box__message";
  message.innerHTML = `<p>${message_text}</p>`;
  content.append(message);

  const buttons = document.createElement("div");
  buttons.className = "el-message-box__btns";
  container.append(buttons);
  const cancel_button = createCancelButton(buttons, "Cancel");
  const confirm_button = createButton(buttons, "Confirm");

  close_button.onclick =
    cancel_button.onclick =
    wrapper.onclick =
      () => {
        modal.remove();
        wrapper.remove();
      };

  // Used .addEventListener instead of .onclick
  // so either can be used outside this function
  confirm_button.addEventListener("click", () => {
    modal.remove();
    wrapper.remove();
  });

  return confirm_button;
}
