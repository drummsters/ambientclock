/**
 * Clean Clock component for the Ambient Clock application
 * A clock face that can show or hide seconds
 */

import { getState, subscribe } from '../../state.js';
import { getElement, updateText } from '../../utils/dom.js';
import { getCurrentTime, formatHours, padZero } from '../../utils/time.js';

// DOM elements
let hoursElement;
let minutesElement;
let secondsElement;

/**
 * Initializes the clean clock component
 */
export function initCleanClock() {
    // Get DOM elements
    hoursElement = getElement('clean-hours');
    minutesElement = getElement('clean-minutes');
    secondsElement = getElement('clean-seconds');
    
    if (!hoursElement || !minutesElement || !secondsElement) {
        console.error("Clean clock elements not found");
        return;
    }
    
    // Subscribe to state changes
    subscribe(handleStateChange);
    
    // Initial update
    updateCleanClock();
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
            updateCleanClock();
        }
    } else {
        // Backward compatibility
        // Update if time format or showSeconds changes
        if ((state.timeFormat !== undefined && 
             state.timeFormat !== currentState.timeFormat) || 
            (state.showSeconds !== undefined && 
             state.showSeconds !== currentState.showSeconds)) {
            updateCleanClock();
        }
    }
}

/**
 * Updates the clean clock display
 */
export function updateCleanClock() {
    // Ensure DOM elements are initialized
    if (!hoursElement || !minutesElement || !secondsElement) {
        // Re-initialize elements if they're not already initialized
        hoursElement = getElement('clean-hours');
        minutesElement = getElement('clean-minutes');
        secondsElement = getElement('clean-seconds');
        
        if (!hoursElement || !minutesElement || !secondsElement) {
            console.error("Clean clock elements not found in updateCleanClock");
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
    
    // Get the colon after minutes (it's the text node between minutes and seconds)
    const cleanClock = document.getElementById('clean-clock');
    const colonAfterMinutes = secondsElement ? secondsElement.previousSibling : null;
    
    // Always ensure seconds are hidden when showSeconds is false
    if (!showSeconds) {
        if (secondsElement) secondsElement.style.display = 'none';
        if (colonAfterMinutes) colonAfterMinutes.textContent = '';
        
        // Update minutes display with AM/PM if in 12-hour format
        if (timeFormat === '12') {
            updateText(minutesElement, `${padZero(minutes)} ${ampm}`);
        } else {
            updateText(minutesElement, padZero(minutes));
        }
    } 
    // Only update seconds if showSeconds is true
    else if (showSeconds && secondsElement) {
        // Show seconds element and the colon before it
        secondsElement.style.display = '';
        if (colonAfterMinutes) colonAfterMinutes.textContent = ':';
        
        // Update minutes display
        updateText(minutesElement, padZero(minutes));
        
        // Update seconds display
        if (timeFormat === '12') {
            updateText(secondsElement, `${padZero(seconds)} ${ampm}`);
        } else {
            updateText(secondsElement, padZero(seconds));
        }
    }
    
    // No need to log the seconds display state anymore
}
