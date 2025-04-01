import { EventBus } from './event-bus.js';

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
    console.log('Stored default state:', this.defaultState);

    const loadedState = this.loadState(); // Load state from storage
    const initialClone = this.deepClone(initialState); // Start with a fresh clone of defaults

    if (Object.keys(loadedState).length > 0) {
      console.log('Loaded state from localStorage. Merging into defaults.');
      // Merge loaded state into the initial state structure, prioritizing initial state
      this.state = this.deepMerge(initialClone, loadedState);
    } else {
      console.log('No saved state found, using initial state.');
      this.state = initialClone; // Use the default state directly
    }

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
      // console.log('State update skipped, no changes detected.');
      return;
    }

    const oldState = this.state; // Keep reference to old state for comparison
    this.state = newState;

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
    console.warn(`StateManager.subscribe is deprecated for path "${path}". Use EventBus.subscribe('state:${path}:changed', callback) instead.`);
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
      // console.log('State saved to localStorage.');
    } catch (error) {
      console.error('Failed to save state to localStorage:', error);
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
      console.error('Failed to load or parse state from localStorage:', error);
      return {}; // Return empty object on error
    }
  },

  /**
   * Resets the current state to the stored default state.
   */
  resetState() {
    console.log('Resetting state to default...');
    const oldState = this.state;
    // Replace current state with a clone of the default state
    this.state = this.deepClone(this.defaultState);

    // Notify subscribers about the changes (treat the entire state as changed)
    // We can simulate this by passing the new state as 'changes'
    this.notifySubscribers(this.state, oldState);

    // Schedule saving the reset state
    this.scheduleSave();
    console.log('State reset complete.');
  },

  // --- Utility Methods ---

  /**
   * Performs a deep clone of an object or array.
   * @param {*} obj - The object or array to clone.
   * @returns {*} A deep clone of the input.
   */
  deepClone(obj) {
    // Basic implementation, consider a more robust library for complex cases
    try {
      return JSON.parse(JSON.stringify(obj));
    } catch (e) {
      console.error("Deep clone failed:", e);
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
