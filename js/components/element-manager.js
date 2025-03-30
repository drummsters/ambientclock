/**
 * Element Manager for the Ambient Clock application
 * Manages all UI elements (clocks, date display, etc.)
 */

import { getState, subscribe } from '../state.js';
import { CleanClock } from './clock/clean-clock.js';
import { AnalogClock } from './clock/analog-clock.js';
import { LEDClock } from './clock/led-clock.js';
import { DateDisplay } from './date-display.js';

// Element instances
let cleanClock;
let analogClock;
let ledClock;
let dateDisplay;

// Active clock
let activeClock;

// Update interval ID
let updateIntervalId = null;

/**
 * Initializes all elements
 */
export function initElements() {
    // Create element instances
    cleanClock = new CleanClock();
    analogClock = new AnalogClock();
    ledClock = new LEDClock();
    dateDisplay = new DateDisplay();
    
    // Initialize elements
    cleanClock.init();
    analogClock.init();
    ledClock.init();
    dateDisplay.init();
    
    // Subscribe to state changes
    subscribe(handleStateChange);
    
    // Set active clock based on current state
    const state = getState();
    const clockFace = state.clockFace || (state.clock && state.clock.clockFace) || 'clean-clock';
    setActiveClock(clockFace);
    
    // Start updates
    startUpdates();
    
    console.log("Element manager initialized");
}

/**
 * Handles state changes
 * @param {Object} state - The current state
 */
function handleStateChange(state) {
    const currentState = getState();
    
    // Check if clock face changed (check both new and old state structure)
    if ((state.clock && state.clock.clockFace !== undefined && 
         state.clock.clockFace !== currentState.clockFace) || 
        (state.clockFace !== undefined && 
         state.clockFace !== currentState.clockFace)) {
        
        const newClockFace = state.clock?.clockFace || state.clockFace;
        if (newClockFace) {
            setActiveClock(newClockFace);
        }
    }
    
    // Check if date visibility changed (check both new and old state structure)
    const newShowDate = state.date?.showDate !== undefined ? state.date.showDate : 
                       (state.showDate !== undefined ? state.showDate : null);
    
    if (newShowDate !== null && newShowDate !== currentState.showDate) {
        dateDisplay.setVisibility(newShowDate);
    }
    
    // Check if date format changed (check both new and old state structure)
    const newDateFormat = state.date?.dateFormat || state.dateFormat;
    
    if (newDateFormat && newDateFormat !== currentState.dateFormat) {
        dateDisplay.setFormat(newDateFormat);
    }
}

/**
 * Sets the active clock
 * @param {string} clockFace - The ID of the clock face to activate
 */
export function setActiveClock(clockFace) {
    // Hide all clocks
    document.querySelectorAll('.clock-face').forEach(face => {
        face.classList.remove('active');
    });
    
    // Show the selected clock
    const clockElement = document.getElementById(clockFace);
    if (clockElement) {
        clockElement.classList.add('active');
    }
    
    // Set the active clock instance
    switch (clockFace) {
        case 'clean-clock':
            activeClock = cleanClock;
            break;
        case 'analog-clock':
            activeClock = analogClock;
            break;
        case 'led-clock':
            activeClock = ledClock;
            break;
        default:
            activeClock = cleanClock;
            break;
    }
    
    // Immediately update the active clock to show the current time
    if (activeClock) {
        activeClock.update();
    }
    
    console.log(`Active clock set to: ${clockFace}`);
}

/**
 * Updates all elements
 */
function updateElements() {
    // Update active clock
    if (activeClock) {
        activeClock.update();
    }
    
    // Update date display
    const state = getState();
    const showDate = state.showDate || (state.date && state.date.showDate) || false;
    
    if (dateDisplay && showDate) {
        dateDisplay.update();
    }
}

/**
 * Starts the update interval
 */
export function startUpdates() {
    // Clear any existing interval
    if (updateIntervalId) {
        clearInterval(updateIntervalId);
    }
    
    // Initial update
    updateElements();
    
    // Set interval for updates
    updateIntervalId = setInterval(updateElements, 1000);
    console.log("Element updates started");
}

/**
 * Stops the update interval
 */
export function stopUpdates() {
    if (updateIntervalId) {
        clearInterval(updateIntervalId);
        updateIntervalId = null;
        console.log("Element updates stopped");
    }
}

/**
 * Gets the active clock
 * @returns {Element} The active clock instance
 */
export function getActiveClock() {
    return activeClock;
}

/**
 * Gets the date display
 * @returns {DateDisplay} The date display instance
 */
export function getDateDisplay() {
    return dateDisplay;
}
