/**
 * LED Clock component for the Ambient Clock application
 * A clock face with LED-style display
 */

import { getState, subscribe } from '../../state.js';
import { getElement, updateText } from '../../utils/dom.js';
import { getCurrentTime, formatHours, padZero } from '../../utils/time.js';

// DOM elements
let hoursElement;
let minutesElement;
let secondsElement;
let ampmElement;

/**
 * Initializes the LED clock component
 */
export function initLedClock() {
    // Get DOM elements
    hoursElement = getElement('led-hours');
    minutesElement = getElement('led-minutes');
    secondsElement = getElement('led-seconds');
    ampmElement = getElement('led-ampm');
    
    if (!hoursElement || !minutesElement || !secondsElement || !ampmElement) {
        console.error("LED clock elements not found");
        return;
    }
    
    // Subscribe to state changes
    subscribe(handleStateChange);
    
    // Initial update
    updateLedClock();
}

/**
 * Handles state changes
 * @param {Object} state - The current state
 */
function handleStateChange(state) {
    const currentState = getState();
    
    // Check if global section exists
    if (state.global) {
        // Update if time format or showSeconds changes
        if ((state.global.timeFormat !== undefined && 
             state.global.timeFormat !== currentState.timeFormat) || 
            (state.global.showSeconds !== undefined && 
             state.global.showSeconds !== currentState.showSeconds)) {
            updateLedClock();
        }
    } else {
        // Backward compatibility
        // Update if time format or showSeconds changes
        if ((state.timeFormat !== undefined && 
             state.timeFormat !== currentState.timeFormat) || 
            (state.showSeconds !== undefined && 
             state.showSeconds !== currentState.showSeconds)) {
            updateLedClock();
        }
    }
}

/**
 * Updates the LED clock display
 */
export function updateLedClock() {
    // Ensure DOM elements are initialized
    if (!hoursElement || !minutesElement || !secondsElement || !ampmElement) {
        // Re-initialize elements if they're not already initialized
        hoursElement = getElement('led-hours');
        minutesElement = getElement('led-minutes');
        secondsElement = getElement('led-seconds');
        ampmElement = getElement('led-ampm');
        
        if (!hoursElement || !minutesElement || !secondsElement || !ampmElement) {
            console.error("LED clock elements not found in updateLedClock");
            return;
        }
    }
    
    const { hours, minutes, seconds, ampm } = getCurrentTime();
    const state = getState();
    const timeFormat = state.timeFormat || (state.global && state.global.timeFormat) || '24';
    
    // Check if showSeconds is explicitly defined in state
    let showSeconds;
    if (state.showSeconds !== undefined) {
        showSeconds = state.showSeconds;
    } else if (state.global && state.global.showSeconds !== undefined) {
        showSeconds = state.global.showSeconds;
    } else {
        showSeconds = true; // Default value if not specified
    }
    
    // Format hours based on time format
    const displayHours = formatHours(hours, timeFormat);
    
    // Update hours display
    if (timeFormat === '12') {
        updateText(hoursElement, displayHours); // No padding in 12-hour format
    } else {
        updateText(hoursElement, padZero(displayHours));
    }
    
    // Update minutes display
    updateText(minutesElement, padZero(minutes));
    
    // Update seconds display and colon
    if (secondsElement) {
        // Get the colon before seconds (it's the second .led-colon element)
        const secondsColon = document.querySelectorAll('.led-colon')[1];
        
        if (showSeconds) {
            // Show seconds and the colon before it
            if (secondsElement) secondsElement.style.display = '';
            if (secondsColon) secondsColon.style.display = '';
            
            // Update seconds text
            updateText(secondsElement, padZero(seconds));
        } else {
            // Hide seconds and the colon before it
            if (secondsElement) secondsElement.style.display = 'none';
            if (secondsColon) secondsColon.style.display = 'none';
        }
    }
    
    // No need to log the seconds display state anymore
    
    // Update AM/PM display
    if (timeFormat === '12') {
        updateText(ampmElement, ampm);
        ampmElement.style.display = '';
    } else {
        updateText(ampmElement, '');
        ampmElement.style.display = 'none';
    }
}
