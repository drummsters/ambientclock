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
    // Background settings
    background: {
        category: 'Nature',
        customCategory: '',
        backgroundColor: DEFAULT_BACKGROUND_COLOR,
        overlayOpacity: DEFAULT_OVERLAY_OPACITY,
        backgroundImageUrl: null, // Store the current background image URL for caching
        imageSource: DEFAULT_IMAGE_SOURCE, // 'unsplash' or 'pexels'
    },
    
    // Global settings
    global: {
        effect: 'raised',
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        timeFormat: '12',
        showSeconds: true,
    },
    
    // Clock settings
    clock: {
        clockFace: 'clean-clock',
        clockOpacity: DEFAULT_CLOCK_OPACITY,
        positionIndex: 0,
        scale: 1.4,
        customPositionX: 50,
        customPositionY: 50,
        cleanClockColor: '#FFFFFF' // Color for clean clock
    },
    
    // Date display settings
    date: {
        showDate: false,
        dateFormat: 'MM/DD/YYYY',
        dateColor: '#FFFFFF',
        dateScale: 1.0,
        dateOpacity: 1.0,
        datePositionIndex: 0,
        dateCustomPositionX: 50, // Center horizontally (50% of screen width)
        dateCustomPositionY: 60, // Position date below clock by default (60% of screen height)
    }
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
 * @param {boolean} [saveImmediately=true] - Whether to save to localStorage immediately
 * @param {boolean} [skipNotify=false] - Whether to skip notifying subscribers
 */
export function updateState(updates, saveImmediately = true, skipNotify = false) {
    // Create a deep copy of the current state
    const newState = JSON.parse(JSON.stringify(state));
    
    // Process updates
    Object.entries(updates).forEach(([key, value]) => {
        // Check if this is a top-level section (background, global, clock, date)
        if (key in newState && typeof value === 'object') {
            // Update section properties
            newState[key] = { ...newState[key], ...value };
            
            // Special handling for showSeconds in global section
            if (key === 'global' && 'showSeconds' in value) {
                // Also update the root state for backward compatibility
                newState.showSeconds = value.showSeconds;
            }
            
            // Special handling for other properties that need to be in both places
            if (key === 'date') {
                // Copy date properties to root for backward compatibility
                if ('showDate' in value) newState.showDate = value.showDate;
                if ('dateFormat' in value) newState.dateFormat = value.dateFormat;
                if ('dateColor' in value) newState.dateColor = value.dateColor;
                if ('dateScale' in value) newState.dateScale = value.dateScale;
                if ('dateOpacity' in value) newState.dateOpacity = value.dateOpacity;
                if ('datePositionIndex' in value) newState.datePositionIndex = value.datePositionIndex;
                if ('dateCustomPositionX' in value) newState.dateCustomPositionX = value.dateCustomPositionX;
                if ('dateCustomPositionY' in value) newState.dateCustomPositionY = value.dateCustomPositionY;
            } else if (key === 'clock') {
                // Copy clock properties to root for backward compatibility
                if ('clockFace' in value) newState.clockFace = value.clockFace;
                if ('clockOpacity' in value) newState.clockOpacity = value.clockOpacity;
                if ('positionIndex' in value) newState.positionIndex = value.positionIndex;
                if ('scale' in value) newState.scale = value.scale;
                if ('customPositionX' in value) newState.customPositionX = value.customPositionX;
                if ('customPositionY' in value) newState.customPositionY = value.customPositionY;
                if ('cleanClockColor' in value) newState.cleanClockColor = value.cleanClockColor;
            } else if (key === 'background') {
                // Copy background properties to root for backward compatibility
                if ('category' in value) newState.category = value.category;
                if ('customCategory' in value) newState.customCategory = value.customCategory;
                if ('backgroundColor' in value) newState.backgroundColor = value.backgroundColor;
                if ('overlayOpacity' in value) newState.overlayOpacity = value.overlayOpacity;
                if ('backgroundImageUrl' in value) newState.backgroundImageUrl = value.backgroundImageUrl;
                if ('imageSource' in value) newState.imageSource = value.imageSource;
                if ('zoomEnabled' in value) newState.zoomEnabled = value.zoomEnabled;
            } else if (key === 'global') {
                // Copy global properties to root for backward compatibility
                if ('effect' in value) newState.effect = value.effect;
                if ('fontFamily' in value) newState.fontFamily = value.fontFamily;
                if ('timeFormat' in value) newState.timeFormat = value.timeFormat;
                if ('fontBold' in value) newState.fontBold = value.fontBold;
            }
        } else {
            // For backward compatibility, try to determine which section this property belongs to
            if (key.startsWith('date')) {
                newState.date[key] = value;
                newState[key] = value; // Also update root state
            } else if (key.startsWith('clock') || key === 'scale' || key === 'positionIndex' || 
                      key === 'customPositionX' || key === 'customPositionY' || key === 'cleanClockColor') {
                newState.clock[key] = value;
                newState[key] = value; // Also update root state
            } else if (key === 'timeFormat' || key === 'fontFamily' || key === 'effect' || key === 'fontBold') {
                newState.global[key] = value;
                newState[key] = value; // Also update root state
            } else if (key === 'showSeconds') {
                // Special handling for showSeconds
                newState.global.showSeconds = value;
                newState.showSeconds = value; // Also update root state
            } else if (key === 'category' || key === 'customCategory' || key === 'backgroundColor' || 
                      key === 'overlayOpacity' || key === 'backgroundImageUrl' || key === 'imageSource' || 
                      key === 'zoomEnabled') {
                newState.background[key] = value;
                newState[key] = value; // Also update root state
            } else if (key === '_prevCategory') {
                // Special case for internal tracking, don't copy to nested structure
                newState[key] = value;
            } else {
                // For any other properties, update both places to be safe
                // Try to determine which section it belongs to
                if (key in newState.date) {
                    newState.date[key] = value;
                } else if (key in newState.clock) {
                    newState.clock[key] = value;
                } else if (key in newState.global) {
                    newState.global[key] = value;
                } else if (key in newState.background) {
                    newState.background[key] = value;
                }
                // Always update root state
                newState[key] = value;
            }
        }
    });
    
    // Update state
    state = newState;
    
    // Notify subscribers (unless skipNotify is true)
    if (!skipNotify) {
        notifySubscribers();
    }
    
    // Save to localStorage with debounce
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
    // Return a flattened copy of the state for backward compatibility
    const flatState = {};
    
    // Add all properties from each section
    Object.entries(state).forEach(([section, sectionState]) => {
        Object.entries(sectionState).forEach(([key, value]) => {
            flatState[key] = value;
        });
    });
    
    return flatState;
}

/**
 * Gets a specific section of the state
 * @param {string} section - The section to get ('background', 'global', 'clock', 'date')
 * @returns {Object} The requested section of the state
 */
export function getStateSection(section) {
    if (section in state) {
        return { ...state[section] };
    }
    return {};
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
            let parsedSettings = JSON.parse(savedSettings);
            
            // Check if the saved settings use the new structure
            if (!parsedSettings.background && !parsedSettings.global && !parsedSettings.clock && !parsedSettings.date) {
                // Convert old flat structure to new nested structure
                parsedSettings = convertFlatToNested(parsedSettings);
            }
            
            // Check if date position is valid (within viewport)
            if (parsedSettings.date && 
                parsedSettings.date.dateCustomPositionX !== undefined && 
                parsedSettings.date.dateCustomPositionY !== undefined) {
                
                if (parsedSettings.date.dateCustomPositionX > 100 || parsedSettings.date.dateCustomPositionY > 100 || 
                    parsedSettings.date.dateCustomPositionX < 0 || parsedSettings.date.dateCustomPositionY < 0) {
                    // Reset to default position
                    parsedSettings.date.dateCustomPositionX = 50;
                    parsedSettings.date.dateCustomPositionY = 60;
                    parsedSettings.date.dateScale = 1.0;
                    console.log("Invalid date position detected, reset to default");
                }
                
                // Ensure date position is also in the root state for backward compatibility
                parsedSettings.dateCustomPositionX = parsedSettings.date.dateCustomPositionX;
                parsedSettings.dateCustomPositionY = parsedSettings.date.dateCustomPositionY;
                parsedSettings.datePositionIndex = parsedSettings.date.datePositionIndex || 0;
            }
            
            // Ensure date opacity is consistent between date and root state
            if (parsedSettings.date && parsedSettings.date.dateOpacity !== undefined) {
                parsedSettings.dateOpacity = parsedSettings.date.dateOpacity;
            } else if (parsedSettings.dateOpacity !== undefined) {
                if (!parsedSettings.date) {
                    parsedSettings.date = {};
                }
                parsedSettings.date.dateOpacity = parsedSettings.dateOpacity;
            }
            
            // Ensure showSeconds is consistent between global and root state
            if (parsedSettings.global && parsedSettings.global.showSeconds !== undefined) {
                parsedSettings.showSeconds = parsedSettings.global.showSeconds;
            } else if (parsedSettings.showSeconds !== undefined) {
                if (!parsedSettings.global) {
                    parsedSettings.global = {};
                }
                parsedSettings.global.showSeconds = parsedSettings.showSeconds;
            }
            
            // Update state with saved settings but don't save back to localStorage
            state = parsedSettings;
            
            console.log("Settings loaded from localStorage");
        }
    } catch (error) {
        console.error("Failed to load settings from localStorage:", error);
    }
}

/**
 * Converts a flat state object to the new nested structure
 * @param {Object} flatState - The flat state object
 * @returns {Object} The nested state object
 */
function convertFlatToNested(flatState) {
    const nestedState = JSON.parse(JSON.stringify(defaultState));
    
    // Process each property in the flat state
    Object.entries(flatState).forEach(([key, value]) => {
        // Determine which section this property belongs to
        if (key.startsWith('date')) {
            nestedState.date[key] = value;
        } else if (key.startsWith('clock') || key === 'scale' || key === 'positionIndex' || 
                  key === 'customPositionX' || key === 'customPositionY' || key === 'cleanClockColor') {
            nestedState.clock[key] = value;
        } else if (key === 'timeFormat' || key === 'showSeconds' || key === 'fontFamily' || key === 'effect') {
            nestedState.global[key] = value;
        } else {
            // Assume it's a background property
            nestedState.background[key] = value;
        }
    });
    
    return nestedState;
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
    state = JSON.parse(JSON.stringify(defaultState));
    notifySubscribers();
    saveSettings();
}
