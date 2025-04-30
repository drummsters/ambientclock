import { EventBus } from './event-bus.js';
import { getDefaultState } from '../state/default-state.js';
import * as logger from '../utils/logger.js'; // Import the logger

/**
 * Manages the application state, including persistence and notifications via EventBus.
 */
export const StateManager = {
  state: {},
  defaultState: {}, // Store the initial default state
  // Removed internal subscribers object - rely solely on EventBus
  STORAGE_KEY: 'ambient-clock-v2-settings',
  saveTimeoutId: null,
  SAVE_DELAY: 1000, // Debounce delay for saving to localStorage

  /**
   * Initializes the StateManager with initial state or loads from localStorage.
   * @param {object} initialState - The default state structure and values.
   * @returns {Promise<void>} A promise that resolves when initialization is complete.
   */
  async init(initialState) {
    // Store the provided initial state as the default
    this.defaultState = this.deepClone(initialState);
    logger.debug('Stored default state:', this.defaultState); // Changed to debug

    const loadedState = this.loadState(); // Load state from storage
    const initialClone = this.deepClone(initialState); // Start with a fresh clone of defaults

    if (Object.keys(loadedState).length > 0) {
      logger.log('Loaded state from localStorage. Merging into defaults.'); // Keep as log
      // Merge loaded state into the initial state structure, prioritizing initial state
      this.state = this.deepMerge(initialClone, loadedState);
    } else {
      logger.log('No saved state found, using initial state.'); // Keep as log
      this.state = initialClone; // Use the default state directly
    }

    // --- State Correction Logic ---
    // Correct known incorrect PascalCase element types from loaded state
    if (this.state.elements) {
        const elements = this.state.elements;
        const corrections = {
            "FavoriteToggleElement": "favorite-toggle",
            "youtube-favorite-toggle": "favorite-toggle", // Added correction for youtube-favorite-toggle
            // Add other corrections here if needed in the future
        };

        for (const elementId in elements) {
            if (elements.hasOwnProperty(elementId)) {
                const elementType = elements[elementId].type;
                if (elementType && corrections[elementType]) {
                    const correctedType = corrections[elementType];
                    logger.warn(`Correcting element type for ID "${elementId}": "${elementType}" -> "${correctedType}"`);
                    elements[elementId].type = correctedType;
                }
            }
        }
    }
    // --- End State Correction Logic ---


    // Always save after merging/loading to ensure consistent structure
    this.scheduleSave();

    // Subscribe to the reset event
    EventBus.subscribe('state:reset', () => this.resetState());

    // Event publication moved to app.js after await StateManager.init()
  },

  /**
   * Returns a deep clone of the current state.
   * @returns {object} A copy of the current state.
   */
  getState() {
    return this.deepClone(this.state);
  },

  /**
   * Updates the state by merging changes and notifies subscribers.
   * @param {object} changes - An object representing the changes to merge into the state.
   */
  update(changes) {
    // Create a new state object by deep merging changes
    const newState = this.deepMerge(this.getState(), changes); // Use getState() for a clone

    // Check if the state actually changed to avoid unnecessary updates/saves
    if (JSON.stringify(this.state) === JSON.stringify(newState)) {
      // logger.debug('State update skipped, no changes detected.'); // Keep commented
      return;
    }

    const oldState = this.state; // Keep reference to old state for comparison
    this.state = newState;

    // Publish specific event if currentImageMetadata changed
    if (changes.hasOwnProperty('currentImageMetadata')) {
      const oldMeta = oldState.currentImageMetadata;
      const newMeta = changes.currentImageMetadata;
      const oldUrl = oldMeta?.url;
      const newUrl = newMeta?.url;
      if (oldUrl !== newUrl) {
        EventBus.publish('state:currentImageMetadata:changed', newMeta);
      }
    }

    // Notify subscribers about the specific changes
    this.notifySubscribers(changes, oldState);

    // Schedule saving to localStorage with debounce
    this.scheduleSave();
  },

  /**
   * Subscribes a callback to changes in a specific part of the state.
   * @param {string} path - The dot-notation path to the state property (e.g., 'elements.clock-1.options.face').
   * @deprecated Use EventBus.subscribe('state:path:changed', callback) instead.
   * @param {string} path - The dot-notation path to the state property.
   * @param {Function} callback - The callback function.
   * @returns {Function} A no-op unsubscribe function.
   */
  subscribe(path, callback) {
    logger.warn(`StateManager.subscribe is deprecated for path "${path}". Use EventBus.subscribe('state:${path}:changed', callback) instead.`); // Use logger.warn
    // Return a dummy unsubscribe function
    return () => {};
  },

  /**
   * Notifies subscribers whose subscribed paths are affected by the changes.
   * @param {object} changes - The changes object that was applied.
   * Notifies about state changes by publishing events to the EventBus.
   * @param {object} changes - The changes object that was applied.
   * @param {object} oldState - The state before the changes were applied.
   */
  notifySubscribers(changes, oldState) {
    const changedPaths = this.getChangedPaths(changes);

    // Determine all unique paths (including parent paths) that might have changed
    const potentiallyAffectedPaths = new Set();
    changedPaths.forEach(path => {
      let currentPath = '';
      path.split('.').forEach(part => {
        currentPath = currentPath ? `${currentPath}.${part}` : part;
        potentiallyAffectedPaths.add(currentPath);
      });
    });

    // Publish events for paths where the value actually changed
    potentiallyAffectedPaths.forEach(path => {
      const newValue = this.getNestedValue(this.state, path);
      const oldValue = this.getNestedValue(oldState, path);

      // Use JSON.stringify for comparison (acknowledging its limitations)
      // A more robust deep comparison could be used if needed.
      if (JSON.stringify(newValue) !== JSON.stringify(oldValue)) {
        EventBus.publish(`state:${path}:changed`, newValue);
      }
    });

    // Publish a general state change event
    EventBus.publish('state:changed', { newState: this.getState(), changes });
  },

  /**
   * Schedules saving the state to localStorage after a delay.
   */
  scheduleSave() {
    if (this.saveTimeoutId) {
      clearTimeout(this.saveTimeoutId);
    }
    this.saveTimeoutId = setTimeout(() => {
      this.saveState();
      this.saveTimeoutId = null;
    }, this.SAVE_DELAY);
  },

  /**
   * Saves the current state to localStorage.
   */
  saveState() {
    try {
      const stateString = JSON.stringify(this.state);
      localStorage.setItem(this.STORAGE_KEY, stateString);
      // logger.debug('State saved to localStorage.'); // Use debug if uncommented
    } catch (error) {
      logger.error('Failed to save state to localStorage:', error); // Use logger.error
      // Consider notifying the user or implementing fallback
    }
  },

  /**
   * Loads the state from localStorage.
   * @returns {object} The loaded state object, or an empty object if none exists or fails to parse.
   */
  loadState() {
    try {
      const savedState = localStorage.getItem(this.STORAGE_KEY);
      if (savedState) {
        return JSON.parse(savedState); // Return parsed state
      } else {
        return {}; // Return empty object if nothing is saved
      }
    } catch (error) {
      logger.error('Failed to load or parse state from localStorage:', error); // Use logger.error
      return {}; // Return empty object on error
    }
  },

  /**
   * Resets the current state to the stored default state.
   */
   resetState() {
    logger.log('Resetting state to default...'); // Keep as log
    const oldState = this.state;
    // Replace current state with a clone of the *current* default state
    const defaultState = getDefaultState();
    this.state = this.deepClone(defaultState);

    // Notify subscribers about the changes (treat the entire state as changed)
    // We can simulate this by passing the new state as 'changes'
    this.notifySubscribers(this.state, oldState); // Notify general changes

    // Explicitly notify background controls about the reset state for its slice
    const defaultBackgroundState = this.getNestedValue(this.defaultState, 'settings.background');
    if (defaultBackgroundState) {
        EventBus.publish('state:settings.background:changed', defaultBackgroundState);
        logger.debug('Explicitly published state:settings.background:changed after reset.');
    } else {
        logger.warn('Could not find default background state to publish after reset.');
    }


    // Schedule saving the reset state
    this.scheduleSave();
    logger.log('State reset complete.'); // Keep as log
  },

  // --- Utility Methods ---

  /**
   * Performs a deep clone of an object or array.
   * @param {*} obj - The object or array to clone.
   * @returns {*} A deep clone of the input.
   */
  deepClone(obj) {
    // Basic implementation, consider a more robust library for complex cases
    if (typeof obj === 'undefined') {
      return null; // Return null instead of undefined to avoid JSON.parse error
    }
    try {
      return JSON.parse(JSON.stringify(obj));
    } catch (e) {
      logger.error("Deep clone failed:", e); // Use logger.error
      return obj; // Fallback to shallow copy or original
    }
  },

  /**
   * Performs a deep merge of source object into target object.
   * @param {object} target - The target object.
   * @param {object} source - The source object.
   * @returns {object} The merged object.
   */
  deepMerge(target, source) {
    const output = this.deepClone(target); // Start with a clone of the target
    if (this.isObject(source)) {
      Object.keys(source).forEach(key => {
        const targetValue = output[key];
        const sourceValue = source[key];

        if (this.isObject(sourceValue) && this.isObject(targetValue)) {
          output[key] = this.deepMerge(targetValue, sourceValue);
        } else {
          // Directly assign non-objects or if target key doesn't exist/isn't an object
          output[key] = this.deepClone(sourceValue); // Clone source value
        }
      });
    }
    return output;
  },

  /**
   * Checks if a value is a plain object.
   * @param {*} item - The value to check.
   * @returns {boolean} True if the item is a plain object.
   */
  isObject(item) {
    return (item && typeof item === 'object' && !Array.isArray(item) && item !== null);
  },

  /**
   * Gets all dot-notation paths that are present in the changes object.
   * @param {object} changes - The changes object.
   * @param {string} [basePath=''] - The base path for recursion.
   * @returns {string[]} An array of changed paths.
   */
  getChangedPaths(changes, basePath = '') {
    let paths = [];
    if (!this.isObject(changes)) return paths;

    Object.keys(changes).forEach(key => {
      const currentPath = basePath ? `${basePath}.${key}` : key;
      paths.push(currentPath);
      if (this.isObject(changes[key])) {
        paths = paths.concat(this.getChangedPaths(changes[key], currentPath));
      }
    });
    return paths;
  },

  /**
   * Gets a value from a nested object using dot notation.
   * @param {object} obj - The object to traverse.
   * @param {string} path - The dot-notation path.
   * @returns {*} The value at the specified path, or undefined if not found.
   */
  getNestedValue(obj, path) {
    if (!path) return obj;
    const properties = path.split('.');
    let value = obj;
    try {
      for (let i = 0; i < properties.length; i++) {
        if (value === null || typeof value === 'undefined') {
          return undefined;
        }
        value = value[properties[i]];
      }
      return value;
    } catch (e) {
      return undefined;
    }
  }
};
