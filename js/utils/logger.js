/**
 * Simple logger utility with debug mode toggle.
 * Debug state is managed internally and synchronized with app state by app.js.
 */

// Internal state for debug mode
let isDebugModeEnabled = false;
const LOG_PREFIX = '[App]'; // Optional prefix for all logs

/**
 * Checks if debug mode is enabled internally.
 * @returns {boolean} True if debug mode is enabled, false otherwise.
 */
function isDebugEnabled() {
    return isDebugModeEnabled;
}

/**
 * Toggles the internal debug logging mode on/off and updates the app state.
 */
export async function toggleDebugMode() {
  isDebugModeEnabled = !isDebugModeEnabled;
  console.log(`${LOG_PREFIX} Debug mode toggled ${isDebugModeEnabled ? 'ENABLED' : 'DISABLED'}.`);
  try {
    // Dynamically import StateManager only when needed to update state
    const { StateManager } = await import('../core/state-manager.js');
    StateManager.update({ settings: { debugModeEnabled: isDebugModeEnabled } });
  } catch (e) {
    console.error("Error updating debug mode state:", e);
  }
}

/**
 * Synchronizes the logger's internal debug state with an external value.
 * Typically called after StateManager is initialized.
 * @param {boolean} isEnabled - The desired state for debug mode.
 */
export function syncDebugMode(isEnabled) {
    if (typeof isEnabled === 'boolean' && isDebugModeEnabled !== isEnabled) {
        isDebugModeEnabled = isEnabled;
        console.log(`${LOG_PREFIX} Logger debug mode synchronized to ${isDebugModeEnabled ? 'ENABLED' : 'DISABLED'}.`);
    }
}

/**
 * Logs a debug message if debug mode is enabled internally.
 * @param {...any} args - Arguments to log.
 */
export function debug(...args) {
  if (isDebugEnabled()) { // Uses internal flag
    console.debug(`${LOG_PREFIX}[Debug]`, ...args);
  }
}

/**
 * Logs an informational message.
 * @param {...any} args - Arguments to log.
 */
export function log(...args) {
  console.log(`${LOG_PREFIX}`, ...args);
}

/**
 * Logs a warning message.
 * @param {...any} args - Arguments to log.
 */
export function warn(...args) {
  console.warn(`${LOG_PREFIX}[Warn]`, ...args);
}

/**
 * Logs an error message.
 * @param {...any} args - Arguments to log.
 */
export function error(...args) {
  console.error(`${LOG_PREFIX}[Error]`, ...args);
}

// Example: Log initial state
// log(`Logger initialized. Debug mode is currently ${isDebugModeEnabled ? 'ON' : 'OFF'}.`);
