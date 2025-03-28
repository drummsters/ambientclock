/**
 * State management for the Ambient Clock application
 * Centralizes application state and provides methods to update it
 */

import { 
    DEFAULT_OVERLAY_OPACITY, 
    DEFAULT_CLOCK_OPACITY, 
    DEFAULT_BACKGROUND_COLOR,
    DEFAULT_IMAGE_SOURCE,
    STORAGE_KEY
} from './config.js';

// Default state values
const defaultState = {
    category: 'Nature',
    customCategory: '',
    backgroundColor: DEFAULT_BACKGROUND_COLOR,
    clockFace: 'clean-clock',
    overlayOpacity: DEFAULT_OVERLAY_OPACITY,
    clockOpacity: DEFAULT_CLOCK_OPACITY,
    effect: 'raised',
    positionIndex: 0,
    scale: 1.4,
    customPositionX: 50,
    customPositionY: 50,
    timeFormat: '24',
    showSeconds: true,
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    backgroundImageUrl: null, // Store the current background image URL for caching
    imageSource: DEFAULT_IMAGE_SOURCE // 'unsplash' or 'pexels'
};

// The current state object
let state = { ...defaultState };

// Subscribers to state changes
const subscribers = [];

// Debounce timer for saving to localStorage
let saveSettingsTimeoutId = null;
const SAVE_SETTINGS_DELAY = 5000; // 5 seconds

/**
 * Updates the state and notifies subscribers
 * @param {Object} updates - Object containing state updates
 * @param {boolean} [saveImmediately=false] - Whether to save to localStorage immediately
 * @param {boolean} [skipNotify=false] - Whether to skip notifying subscribers
 */
export function updateState(updates, saveImmediately = false, skipNotify = false) {
    // Update state
    state = { ...state, ...updates };
    
    // Notify subscribers (unless skipNotify is true)
    if (!skipNotify) {
        notifySubscribers();
    }
    
    // Save to localStorage with debounce (unless skipSave is true)
    if (saveImmediately) {
        // Save immediately if requested
        saveSettings();
    } else {
        // Clear any existing timeout
        if (saveSettingsTimeoutId) {
            clearTimeout(saveSettingsTimeoutId);
        }
        
        // Set a new timeout to save settings after delay
        saveSettingsTimeoutId = setTimeout(() => {
            saveSettings();
            saveSettingsTimeoutId = null;
        }, SAVE_SETTINGS_DELAY);
    }
}

/**
 * Gets the current state
 * @returns {Object} The current state object
 */
export function getState() {
    return { ...state }; // Return a copy to prevent direct mutation
}

/**
 * Subscribes to state changes
 * @param {Function} callback - Function to call when state changes
 * @returns {Function} Unsubscribe function
 */
export function subscribe(callback) {
    subscribers.push(callback);
    
    // Return unsubscribe function
    return () => {
        const index = subscribers.indexOf(callback);
        if (index !== -1) {
            subscribers.splice(index, 1);
        }
    };
}

/**
 * Notifies all subscribers of state changes
 */
function notifySubscribers() {
    subscribers.forEach(callback => callback(state));
}

/**
 * Saves current settings to localStorage
 */
function saveSettings() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        console.log("Settings saved to localStorage");
    } catch (error) {
        console.error("Failed to save settings to localStorage:", error);
    }
}

/**
 * Loads settings from localStorage
 */
export function loadSettings() {
    try {
        const savedSettings = localStorage.getItem(STORAGE_KEY);
        if (savedSettings) {
            const settings = JSON.parse(savedSettings);
            
            // Update state with saved settings but don't save back to localStorage
            // Use the second parameter to skip saving to avoid an unnecessary write
            updateState(settings, false);
            
            console.log("Settings loaded from localStorage");
        }
    } catch (error) {
        console.error("Failed to load settings from localStorage:", error);
    }
}


// Initialize state
export function initState() {
    loadSettings();
}

/**
 * Resets all settings to defaults and clears localStorage
 */
export function resetSettings() {
    try {
        localStorage.removeItem(STORAGE_KEY);
        console.log("Settings reset and localStorage cleared");
    } catch (error) {
        console.error("Failed to clear localStorage:", error);
    }
    
    // Reset state to defaults and notify subscribers
    updateState({ 
        ...defaultState,
        positionIndex: 0, // Center position
        scale: 1.0, // 100% zoom
        backgroundColor: '#000000', // Black background
        showSeconds: true, // Seconds visible
        clockOpacity: 1.0, // 100% opacity
        overlayOpacity: DEFAULT_OVERLAY_OPACITY, // Reset to default overlay opacity
        imageSource: DEFAULT_IMAGE_SOURCE // Reset to default image source
    }, true);
}
