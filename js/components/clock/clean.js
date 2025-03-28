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
    // Update if time format or showSeconds changes
    if (state.timeFormat !== getState().timeFormat || state.showSeconds !== getState().showSeconds) {
        updateCleanClock();
    }
}

/**
 * Updates the clean clock display
 */
export function updateCleanClock() {
    const { hours, minutes, seconds, ampm } = getCurrentTime();
    const { timeFormat, showSeconds } = getState();
    
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
    
    // Update minutes and seconds display based on showSeconds
    if (showSeconds && secondsElement) {
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
    } else {
        // Hide seconds element and the colon before it
        if (secondsElement) secondsElement.style.display = 'none';
        if (colonAfterMinutes) colonAfterMinutes.textContent = '';
        
        // Update minutes display with AM/PM if in 12-hour format
        if (timeFormat === '12') {
            updateText(minutesElement, `${padZero(minutes)} ${ampm}`);
        } else {
            updateText(minutesElement, padZero(minutes));
        }
    }
}
