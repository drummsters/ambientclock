/**
 * Clock Manager component for the Ambient Clock application
 * Manages all clock faces and handles switching between them
 */

import { getState, updateState, subscribe } from '../state.js';
import { getElement, getElements, addClass, removeClass } from '../utils/dom.js';
import { updateActiveFace } from '../features/drag.js';
import { updateDateDisplay } from './date-manager.js';

// Import clock face components
import { initCleanClock, updateCleanClock } from './clock/clean.js';
import { initAnalogClock, updateAnalogClock } from './clock/analog.js';
import { initLedClock, updateLedClock } from './clock/led.js';

// DOM elements
let clockContainer;
let clockFaces;

// Clock update interval ID
let clockUpdateIntervalId = null;

// Map of clock face IDs to update functions
const clockUpdateFunctions = {
    'clean-clock': updateCleanClock,
    'analog-clock': updateAnalogClock,
    'led-clock': updateLedClock
};

/**
 * Initializes the clock manager
 */
export function initClockManager() {
    // Get DOM elements
    clockContainer = getElement('clock-container');
    clockFaces = getElements('.clock-face');
    
    if (!clockContainer || !clockFaces.length) {
        console.error("Clock elements not found");
        return;
    }
    
    // Initialize all clock faces
    initCleanClock();
    initAnalogClock();
    initLedClock();
    
    // Subscribe to state changes
    subscribe(handleStateChange);
    
    // Initial setup based on current state
    const state = getState();
    const clockFace = state.clockFace || (state.clock && state.clock.clockFace) || 'clean-clock';
    const clockOpacity = state.clockOpacity || (state.clock && state.clock.clockOpacity) || 1.0;
    
    setClockFace(clockFace);
    updateClockOpacity(clockOpacity);
    
    // Start clock updates
    startClockUpdates();
}

/**
 * Handles state changes
 * @param {Object} state - The current state
 */
function handleStateChange(state) {
    const currentState = getState();
    
    // Check if clock section exists
    if (state.clock) {
        // Update clock face if changed
        if (state.clock.clockFace !== undefined && 
            state.clock.clockFace !== currentState.clockFace) {
            setClockFace(state.clock.clockFace);
        }
        
        // Update opacity if changed
        if (state.clock.clockOpacity !== undefined && 
            state.clock.clockOpacity !== currentState.clockOpacity) {
            updateClockOpacity(state.clock.clockOpacity);
        }
        
        // Update clean clock color if changed
        if (state.clock.cleanClockColor !== undefined && 
            state.clock.cleanClockColor !== currentState.cleanClockColor) {
            const cleanClock = getElement('clean-clock');
            if (cleanClock && currentState.clockFace === 'clean-clock') {
                cleanClock.style.color = state.clock.cleanClockColor || '#FFFFFF';
            }
        }
    } else {
        // Backward compatibility
        // Update clock face if changed
        if (state.clockFace !== undefined && 
            state.clockFace !== currentState.clockFace) {
            setClockFace(state.clockFace);
        }
        
        // Update opacity if changed
        if (state.clockOpacity !== undefined && 
            state.clockOpacity !== currentState.clockOpacity) {
            updateClockOpacity(state.clockOpacity);
        }
        
        // Update clean clock color if changed
        if (state.cleanClockColor !== undefined && 
            state.cleanClockColor !== currentState.cleanClockColor) {
            const cleanClock = getElement('clean-clock');
            if (cleanClock && currentState.clockFace === 'clean-clock') {
                cleanClock.style.color = state.cleanClockColor || '#FFFFFF';
            }
        }
    }
    
    // Check if showSeconds changed in global section
    if (state.global && state.global.showSeconds !== undefined) {
        const currentShowSeconds = currentState.global && currentState.global.showSeconds !== undefined ? 
                                  currentState.global.showSeconds : 
                                  currentState.showSeconds;
        
        if (state.global.showSeconds !== currentShowSeconds) {
            // Show seconds changed
            
            // Update the clock display
            updateAllClocks(true);
            
            // Adjust the clock update interval based on showSeconds
            if (state.global.showSeconds) {
                // If showing seconds, update every second
                startClockUpdates();
            } else {
                // If not showing seconds, update every minute
                stopClockUpdates();
                // Set a new interval that updates once per minute
                clockUpdateIntervalId = setInterval(() => {
                    const now = new Date();
                    // Only update when seconds are 0 (new minute)
                    if (now.getSeconds() === 0) {
                        updateAllClocks();
                    }
                }, 1000); // Still check every second, but only update on minute changes
                // Clock updates set to minute-only mode
            }
        }
    } 
    // Backward compatibility - check if showSeconds changed in root state
    else if (state.showSeconds !== undefined) {
        const currentShowSeconds = currentState.showSeconds !== undefined ? 
                                  currentState.showSeconds : 
                                  (currentState.global && currentState.global.showSeconds);
        
        if (state.showSeconds !== currentShowSeconds) {
            // Show seconds changed
            
            // Update the clock display
            updateAllClocks(true);
            
            // Adjust the clock update interval based on showSeconds
            if (state.showSeconds) {
                // If showing seconds, update every second
                startClockUpdates();
            } else {
                // If not showing seconds, update every minute
                stopClockUpdates();
                // Set a new interval that updates once per minute
                clockUpdateIntervalId = setInterval(() => {
                    const now = new Date();
                    // Only update when seconds are 0 (new minute)
                    if (now.getSeconds() === 0) {
                        updateAllClocks();
                    }
                }, 1000); // Still check every second, but only update on minute changes
                // Clock updates set to minute-only mode
            }
        }
    }
}

/**
 * Sets the active clock face
 * @param {string} faceId - The ID of the clock face to activate
 */
export function setClockFace(faceId) {
    // Get clock faces if not already initialized
    if (!clockFaces || !clockFaces.length) {
        clockFaces = getElements('.clock-face');
        if (!clockFaces || !clockFaces.length) {
            console.error("Clock faces not found in setClockFace");
            return;
        }
    }
    
    // Validate face ID
    const validFaceIds = Array.from(clockFaces).map(face => face.id);
    if (!validFaceIds.includes(faceId)) {
        console.warn(`Invalid clock face ID: ${faceId}. Using default.`);
        faceId = 'clean-clock'; // Default to clean clock
    }
    
    // Update all clock faces
    clockFaces.forEach(face => {
        if (face.id === faceId) {
            addClass(face, 'active');
            
            // Apply current scale to the newly activated face
            const state = getState();
            const scale = state.scale || (state.clock && state.clock.scale) || 1.0;
            face.style.transform = `scale(${scale})`;
        } else {
            removeClass(face, 'active');
        }
    });
    
    // Update state if needed
    const currentState = getState();
    if (faceId !== currentState.clockFace) {
        updateState({
            clock: {
                clockFace: faceId
            }
        });
    }
    
    // Update drag listeners for the new active face
    updateActiveFace();
    
    // Immediately update the clock to show the current time
    const updateFunction = clockUpdateFunctions[faceId];
    if (updateFunction) {
        updateFunction();
    }
    
    // Clock face changed
}

/**
 * Updates the clock opacity
 * @param {number} opacity - The opacity value (0.1 to 1.0)
 */
export function updateClockOpacity(opacity) {
    // Ensure clockContainer is initialized
    if (!clockContainer) {
        clockContainer = getElement('clock-container');
        if (!clockContainer) {
            console.error("Clock container not found in updateClockOpacity");
            return;
        }
    }
    
    // Clamp opacity between 0.1 (minimum visibility) and 1.0
    const clampedOpacity = Math.max(0.1, Math.min(1.0, opacity));
    
    // Update the clock container opacity
    clockContainer.style.opacity = clampedOpacity.toFixed(2);
    
    // Update state if needed
    const currentState = getState();
    const currentOpacity = currentState.clockOpacity || 
                          (currentState.clock && currentState.clock.clockOpacity) || 
                          1.0;
    
    if (clampedOpacity !== currentOpacity) {
        updateState({
            clock: {
                clockOpacity: clampedOpacity
            }
        });
    }
    
    // Clock opacity updated
}


/**
 * Updates all clock faces
 * @param {boolean} [forceUpdate=false] - Whether to force an update regardless of showSeconds state
 */
export function updateAllClocks(forceUpdate = false) {
    try {
        // Get the active clock face ID and other state
        const state = getState();
        const clockFace = state.clockFace || (state.clock && state.clock.clockFace) || 'clean-clock';
        
        // Determine if seconds are shown
        let showSeconds;
        if (state.showSeconds !== undefined) {
            showSeconds = state.showSeconds;
        } else if (state.global && state.global.showSeconds !== undefined) {
            showSeconds = state.global.showSeconds;
        } else {
            showSeconds = true; // Default value if not specified
        }
        
        // If seconds are hidden and this is not a forced update, don't update the clock
        if (!showSeconds && !forceUpdate) {
            return; // Skip the update entirely
        }
        
        // Call the appropriate update function
        const updateFunction = clockUpdateFunctions[clockFace];
        if (updateFunction) {
            updateFunction();
        } else {
            console.warn(`No update function found for clock face: ${clockFace}`);
        }
        
        // Update date display only if it's visible
        const showDate = state.showDate || (state.date && state.date.showDate) || false;
        if (showDate) {
            updateDateDisplay();
        }
    } catch (error) {
        console.error("Error updating clocks:", error);
        
        // Stop interval if clock update fails repeatedly
        if (clockUpdateIntervalId) {
            clearInterval(clockUpdateIntervalId);
            clockUpdateIntervalId = null;
            console.error("Clock updates stopped due to errors");
        }
    }
}

/**
 * Starts the clock update interval
 */
export function startClockUpdates() {
    // Clear any existing interval
    if (clockUpdateIntervalId) {
        clearInterval(clockUpdateIntervalId);
    }
    
    // Initial update
    updateAllClocks();
    
    // Set interval for updates
    clockUpdateIntervalId = setInterval(updateAllClocks, 1000);
    // Clock updates started
}

/**
 * Stops the clock update interval
 */
export function stopClockUpdates() {
    if (clockUpdateIntervalId) {
        clearInterval(clockUpdateIntervalId);
        clockUpdateIntervalId = null;
    // Clock updates stopped
    }
}
