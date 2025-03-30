/**
 * Wheel event utility for the Ambient Clock application
 * Centralizes wheel event handling for consistent behavior
 */

import { getState, updateState } from '../state.js';
import { updateClockOpacity } from '../components/clock-manager.js';
import { updateClockSize, updateDateSize } from '../features/element-position.js';
import { showControls } from '../components/controls.js';
import { adjustDateScale } from '../components/date-manager.js';
import { SCALE_STEP, MIN_SCALE, MAX_SCALE } from '../config.js';

/**
 * Handles wheel events for opacity and size control
 * @param {WheelEvent} event - The wheel event
 * @param {boolean} isShiftPressed - Whether the shift key is pressed
 */
export function handleWheelEvent(event, isShiftPressed) {
    // Ignore if event is on form elements
    if (event.target.tagName === 'INPUT' || 
        event.target.tagName === 'SELECT') {
        return;
    }

    // Always prevent default scrolling behavior
    event.preventDefault();
    
    // Check if the event is on the date container
    const isDateEvent = event.target.id === 'date-container' || 
                        event.target.closest('#date-container') !== null;
    
    // Check if the event is on the clock container
    const isClockEvent = event.target.id === 'clock-container' || 
                         event.target.closest('#clock-container') !== null ||
                         event.target.classList.contains('clock-face') ||
                         event.target.closest('.clock-face') !== null;
    
    if (isDateEvent) {
        // Handle date container wheel events
        if (isShiftPressed) {
            // Shift + Wheel - controls date opacity
            if (event.deltaY < 0) {
                adjustOpacity('date', true); // increase
            } else {
                adjustOpacity('date', false); // decrease
            }
        } else {
            // Regular wheel - controls date size
            if (event.deltaY < 0) {
                adjustScale('date', true); // increase
            } else {
                adjustScale('date', false); // decrease
            }
        }
    } else if (isClockEvent) {
        // Handle clock wheel events only when mouse is over the clock
        if (isShiftPressed) {
            // Shift + Wheel - controls opacity
            if (event.deltaY < 0) {
                adjustOpacity('clock', true); // increase
            } else {
                adjustOpacity('clock', false); // decrease
            }
        } else {
            // Regular wheel - controls size
            if (event.deltaY < 0) {
                adjustScale('clock', true); // increase
            } else {
                adjustScale('clock', false); // decrease
            }
        }
    }
    // If not on date or clock, do nothing (let the default scroll behavior happen)
}

/**
 * Adjusts the opacity of an element
 * @param {string} elementType - The type of element ('clock' or 'date')
 * @param {boolean} increase - Whether to increase or decrease the opacity
 */
function adjustOpacity(elementType, increase) {
    if (elementType === 'clock') {
        const { clockOpacity } = getState();
        const newOpacity = increase 
            ? Math.min(1.0, clockOpacity + 0.1)
            : Math.max(0.1, clockOpacity - 0.1);
        updateClockOpacity(newOpacity);
    } else if (elementType === 'date') {
        const state = getState();
        const dateOpacity = state.dateOpacity || (state.date && state.date.dateOpacity) || 1.0;
        const newOpacity = increase 
            ? Math.min(1.0, dateOpacity + 0.1)
            : Math.max(0.1, dateOpacity - 0.1);
        updateState({ 
            dateOpacity: newOpacity,
            date: {
                dateOpacity: newOpacity
            }
        }, true); // Save immediately to ensure it persists
        
        // Update date container opacity
        const dateContainer = document.getElementById('date-container');
        if (dateContainer) {
            dateContainer.style.opacity = newOpacity.toFixed(2);
        }
        
        console.log(`Date opacity set to: ${newOpacity.toFixed(2)}`);
    }
}

/**
 * Adjusts the scale of an element
 * @param {string} elementType - The type of element ('clock' or 'date')
 * @param {boolean} increase - Whether to increase or decrease the scale
 */
function adjustScale(elementType, increase) {
    if (elementType === 'clock') {
        const { scale } = getState();
        const newScale = increase 
            ? scale + SCALE_STEP
            : scale - SCALE_STEP;
        const clampedScale = increase 
            ? Math.min(MAX_SCALE, newScale)
            : Math.max(MIN_SCALE, newScale);
        updateClockSize(clampedScale);
    } else if (elementType === 'date') {
        // Use the dedicated date scale adjustment function
        adjustDateScale(increase);
    }
}

// Export the original functions for backward compatibility
export function increaseClockOpacity() {
    adjustOpacity('clock', true);
}

export function decreaseClockOpacity() {
    adjustOpacity('clock', false);
}

export function increaseDateOpacity() {
    adjustOpacity('date', true);
}

export function decreaseDateOpacity() {
    adjustOpacity('date', false);
}

export function increaseClockSize() {
    adjustScale('clock', true);
}

export function decreaseClockSize() {
    adjustScale('clock', false);
}

export function increaseDateSize() {
    adjustDateScale(true);
}

export function decreaseDateSize() {
    adjustDateScale(false);
}
