// ==UserScript==
// @name        setupToggleCommands
// @license     MIT
// @namespace   rtonne
// @match       *://*/*
// @version     1.0
// @author      Rtonne
// @description Library that creates toggleable menu commands for userscript managers
// @grant       GM.registerMenuCommand
// @grant       GM.unregisterMenuCommand
// @grant       GM.getValue
// @grant       GM.setValue
// ==/UserScript==

/**
 * Can be the only function of this library used externally.
 * @param {_Command[]} command_list The list of all toggle commands that are to be added.
 */
async function setupToggleCommands(command_list) {
  for (const command of command_list) {
    _runCommandFunction(command);
  }
  for (const command of command_list) {
    await _registerCommand(command_list, command);
  }
}

/**
 * @typedef {Object} _Command
 * @property {string} id The id of the menu command and the key for the value.
 * @property {string} off_text The text displayed when the last function ran was toggleOffFunction.
 * @property {string} on_text The text displayed when the last function ran was toggleOnFunction.
 * @property {string} [off_tooltip] The tooltip shown while hovering the command when the last function ran was toggleOffFunction.
 * @property {string} [on_tooltip] The tooltip shown while hovering the command when the last function ran was toggleOnFunction.
 * @property {boolean} [default_value] The default value. Its "false" by default.
 * @property {boolean} [auto_close] If the userscript manager popup closes when the command is clicked. Its "false" by default.
 * @property {() => void} [toggleOffFunction] A function to be run then toggling off the command.
 * @property {() => void} [toggleOnFunction] A function to be run then toggling on the command.
 */

// To check if in place command replacement is supported
// https://violentmonkey.github.io/api/gm/#gm_registermenucommand
const _can_replace_in_place =
  "test" === GM.registerMenuCommand("test", () => {}, { id: "test" });
GM.unregisterMenuCommand("test");

/**
 * Runs the correct command function, and toggles the command text.
 * @param {_Command[]} command_list The list of all commands (may be used to replace old commands).
 * @param {_Command} command The command being toggled.
 */
async function _toggleCommand(command_list, command) {
  await GM.setValue(
    command.id,
    !(await GM.getValue(command.id, command.default_value))
  );
  _runCommandFunction(command);
  if (_can_replace_in_place) {
    await _registerCommand(command_list, command);
  } else {
    // If we can't replace commands, we need to remove them all, then re-add them
    for (const command of command_list) {
      GM.unregisterMenuCommand(command.id);
    }
    for (const command of command_list) {
      await _registerCommand(command_list, command);
    }
  }
}

/**
 * Registers the command with the correct text.
 * @param {_Command[]} command_list The list of all commands (may be used to replace old commands).
 * @param {_Command} command
 */
async function _registerCommand(command_list, command) {
  let text = command.on_text;
  let tooltip = command.on_tooltip;
  if (!(await GM.getValue(command.id, command.default_value))) {
    text = command.off_text;
    tooltip = command.off_tooltip;
  }

  GM.registerMenuCommand(text, () => _toggleCommand(command_list, command), {
    id: command.id,
    title: tooltip,
    autoClose: command.auto_close !== undefined && command.auto_close,
  });
}

/**
 * Runs the correct command function.
 * @param {_Command} command
 */
async function _runCommandFunction(command) {
  if (await GM.getValue(command.id, command.default_value)) {
    if (command.toggleOnFunction) {
      command.toggleOnFunction();
    }
  } else {
    if (command.toggleOffFunction) {
      command.toggleOffFunction();
    }
  }
}
