async function deleteActionOnOpenDialog() {
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
  await waitForElementToBeRemovedOrHidden(fading_in_confirm_message_container);

  // confirm_ok_button.click();

  // const new_confirm_cancel_button = document.querySelector(
  //   ".list-editor-wrap .delete-btn"
  // );
  // await waitForElementToBeRemovedOrHidden(new_confirm_cancel_button);
}

async function selectInputActionOnOpenDialog(selector, option) {
  const [select_input] = await waitForElements(".list-editor-wrap " + selector);
  select_input.click();
  const select_dropdown_options = await waitForElements(
    "body > .el-select-dropdown:not([style*='display: none;']) span"
  );
  for (const select_dropdown_option of select_dropdown_options) {
    if (select_dropdown_option.innerText === option) {
      select_dropdown_option.click();
      return;
    }
  }
}

// TODO: probably delete because it doesnt work
async function inputActionOnOpenDialog(selector, value) {
  const [input] = await waitForElements(".list-editor-wrap " + selector);
  input.value = value;
  input.setAttribute("aria-valuenow", value);
  // input.dispatchEvent(
  //   new KeyboardEvent("mousedown", {
  //     bubbles: true,
  //     cancelable: true,
  //   })
  // );
  // document.body.dispatchEvent(
  //   new KeyboardEvent("keydown", {
  //     bubbles: true,
  //     cancelable: true,
  //     key: "Enter",
  //   })
  // );
}
