/**
 * Wheel event utility for the Ambient Clock application
 * Centralizes wheel event handling for consistent behavior
 */

import { getState } from '../state.js';
import { updateClockOpacity } from '../components/clock-manager.js';
import { updateClockSize } from '../features/position.js';
import { showControls } from '../components/controls.js';
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
    
    if (isShiftPressed) {
        // Shift + Wheel - EXCLUSIVELY controls opacity
        if (event.deltaY < 0) {
            increaseClockOpacity();
        } else {
            decreaseClockOpacity();
        }
    } else {
        // Regular wheel - ONLY controls size
        if (event.deltaY < 0) {
            increaseClockSize();
        } else {
            decreaseClockSize();
        }
    }
}

/**
 * Increases clock opacity
 */
export function increaseClockOpacity() {
    const { clockOpacity } = getState();
    updateClockOpacity(Math.min(1.0, clockOpacity + 0.1));
    // Controls should only be shown with spacebar or C key, not when scrolling
}

/**
 * Decreases clock opacity
 */
export function decreaseClockOpacity() {
    const { clockOpacity } = getState();
    updateClockOpacity(Math.max(0.1, clockOpacity - 0.1));
    // Controls should only be shown with spacebar or C key, not when scrolling
}

/**
 * Increases the clock size
 */
export function increaseClockSize() {
    const { scale } = getState();
    const newScale = scale + SCALE_STEP;
    const clampedScale = Math.min(MAX_SCALE, newScale);
    updateClockSize(clampedScale);
    // Controls should only be shown with spacebar or C key, not when scrolling
}

/**
 * Decreases the clock size
 */
export function decreaseClockSize() {
    const { scale } = getState();
    const newScale = scale - SCALE_STEP;
    const clampedScale = Math.max(MIN_SCALE, newScale);
    updateClockSize(clampedScale);
    // Controls should only be shown with spacebar or C key, not when scrolling
}
