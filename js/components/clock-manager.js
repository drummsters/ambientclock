/**
 * Clock Manager component for the Ambient Clock application
 * Manages all clock faces and handles switching between them
 */

import { getState, updateState, subscribe } from '../state.js';
import { getElement, getElements, addClass, removeClass } from '../utils/dom.js';
import { updateActiveFace } from '../features/drag.js';

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
    const { clockFace, clockOpacity } = getState();
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
    // Update clock face if changed
    if (state.clockFace !== getState().clockFace) {
        setClockFace(state.clockFace);
    }
    
    // Update opacity if changed
    if (state.clockOpacity !== getState().clockOpacity) {
        updateClockOpacity(state.clockOpacity);
    }
    
    // Update all clocks if showSeconds changed
    if (state.showSeconds !== getState().showSeconds) {
        updateAllClocks();
    }
}

/**
 * Sets the active clock face
 * @param {string} faceId - The ID of the clock face to activate
 */
export function setClockFace(faceId) {
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
            const { scale } = getState();
            face.style.transform = `scale(${scale})`;
        } else {
            removeClass(face, 'active');
        }
    });
    
    // Update state if needed
    if (faceId !== getState().clockFace) {
        updateState({ clockFace: faceId });
    }
    
    // Update drag listeners for the new active face
    updateActiveFace();
    
    console.log(`Clock face changed to: ${faceId}`);
}

/**
 * Updates the clock opacity
 * @param {number} opacity - The opacity value (0.1 to 1.0)
 */
export function updateClockOpacity(opacity) {
    // Clamp opacity between 0.1 (minimum visibility) and 1.0
    const clampedOpacity = Math.max(0.1, Math.min(1.0, opacity));
    
    if (clockContainer) {
        clockContainer.style.opacity = clampedOpacity.toFixed(2);
    }
    
    // Update state if needed
    if (clampedOpacity !== getState().clockOpacity) {
        updateState({ clockOpacity: clampedOpacity });
    }
    
    console.log(`Clock opacity set to: ${clampedOpacity.toFixed(2)}`);
}

/**
 * Updates all clock faces
 */
export function updateAllClocks() {
    try {
        // Get the active clock face ID
        const { clockFace } = getState();
        
        // Call the appropriate update function
        const updateFunction = clockUpdateFunctions[clockFace];
        if (updateFunction) {
            updateFunction();
        } else {
            console.warn(`No update function found for clock face: ${clockFace}`);
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
    console.log("Clock updates started");
}

/**
 * Stops the clock update interval
 */
export function stopClockUpdates() {
    if (clockUpdateIntervalId) {
        clearInterval(clockUpdateIntervalId);
        clockUpdateIntervalId = null;
        console.log("Clock updates stopped");
    }
}
