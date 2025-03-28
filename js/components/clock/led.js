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
    // Update if time format or showSeconds changes
    if (state.timeFormat !== getState().timeFormat || state.showSeconds !== getState().showSeconds) {
        updateLedClock();
    }
}

/**
 * Updates the LED clock display
 */
export function updateLedClock() {
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
    
    // Update AM/PM display
    if (timeFormat === '12') {
        updateText(ampmElement, ampm);
        ampmElement.style.display = '';
    } else {
        updateText(ampmElement, '');
        ampmElement.style.display = 'none';
    }
}
