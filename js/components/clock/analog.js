/**
 * Analog Clock component for the Ambient Clock application
 */

import { getState, subscribe } from '../../state.js';
import { getElement, updateStyle } from '../../utils/dom.js';
import { getCurrentTime, calculateHandDegrees } from '../../utils/time.js';

// DOM elements
let hourHand;
let minuteHand;
let secondHand;

/**
 * Initializes the analog clock component
 */
export function initAnalogClock() {
    // Get DOM elements
    hourHand = getElement('analog-hour');
    minuteHand = getElement('analog-minute');
    secondHand = getElement('analog-second');
    
    if (!hourHand || !minuteHand || !secondHand) {
        console.error("Analog clock elements not found");
        return;
    }
    
    // Subscribe to state changes
    subscribe(handleStateChange);
    
    // Initial update
    updateAnalogClock();
}

/**
 * Handles state changes
 * @param {Object} state - The current state
 */
function handleStateChange(state) {
    // Update if showSeconds changes
    if (state.showSeconds !== getState().showSeconds) {
        updateAnalogClock();
    }
}

/**
 * Updates the analog clock display
 */
export function updateAnalogClock() {
    const { hours, minutes, seconds } = getCurrentTime();
    const { showSeconds } = getState();
    
    // Calculate rotation degrees for each hand
    const { hoursDeg, minutesDeg, secondsDeg } = calculateHandDegrees(hours, minutes, seconds);
    
    // Update hour and minute hand rotations
    updateStyle(minuteHand, { transform: `translateX(-50%) rotate(${minutesDeg}deg)` });
    updateStyle(hourHand, { transform: `translateX(-50%) rotate(${hoursDeg}deg)` });
    
    // Update second hand rotation and visibility based on showSeconds setting
    if (secondHand) {
        if (showSeconds) {
            // Show seconds hand and update its rotation
            secondHand.style.display = '';
            updateStyle(secondHand, { transform: `translateX(-50%) rotate(${secondsDeg}deg)` });
        } else {
            // Hide seconds hand
            secondHand.style.display = 'none';
        }
    }
}
