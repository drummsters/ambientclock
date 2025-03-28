/**
 * Keyboard feature for the Ambient Clock application
 * Handles keyboard shortcuts
 */

import { OPACITY_STEP, SCALE_STEP } from '../config.js';
import { updateOverlayOpacity } from '../components/background.js';
import { getState } from '../state.js';
import { showControls, toggleControls } from '../components/controls.js';
import { increaseClockSize, decreaseClockSize } from './position.js';
import { handleWheelEvent, increaseClockOpacity, decreaseClockOpacity } from '../utils/wheel.js';

// Track if shift key is pressed
let isShiftPressed = false;

/**
 * Initializes the keyboard feature
 */
export function initKeyboard() {
    // Add keyboard event listeners
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    document.addEventListener('wheel', handleWheel, { passive: false });
    
    console.log("Keyboard shortcuts initialized");
}

/**
 * Handles keydown events
 * @param {KeyboardEvent} event - The keydown event
 */
function handleKeyDown(event) {
    // Track shift key state
    if (event.key === 'Shift') {
        isShiftPressed = true;
    }
    
    // Ignore if other modifier keys are pressed or if typing in an input/select
    if (event.ctrlKey || event.altKey || event.metaKey ||
        event.target.tagName === 'INPUT' || event.target.tagName === 'SELECT') {
        return;
    }

    switch (event.key) {
        case '+':
        case '=': // Handle both + and =
            event.preventDefault(); // Prevent browser zoom or other default actions
            if (event.shiftKey) {
                increaseClockOpacity();
            } else {
                handlePlusKey();
            }
            break;
            
        case '-':
            event.preventDefault(); // Prevent browser zoom
            if (event.shiftKey) {
                decreaseClockOpacity();
            } else {
                handleMinusKey();
            }
            break;
            
        case ' ': // Spacebar
            event.preventDefault(); // Prevent page scroll
            toggleControls();
            break;
            
        case 'c':
        case 'C': // C key
            event.preventDefault(); // Prevent default browser actions
            toggleControls();
            break;
            
        case 'ArrowUp': // Up arrow - increase size
            event.preventDefault();
            increaseClockSize(SCALE_STEP);
            // Controls should only be shown with spacebar or C key
            break;
            
        case 'ArrowDown': // Down arrow - decrease size
            event.preventDefault();
            decreaseClockSize(SCALE_STEP);
            // Controls should only be shown with spacebar or C key
            break;
    }
}

// These functions are now imported from wheel.js

/**
 * Handles keyup events
 * @param {KeyboardEvent} event - The keyup event
 */
function handleKeyUp(event) {
    if (event.key === 'Shift') {
        isShiftPressed = false;
    }
}

/**
 * Handles wheel events for opacity and size control
 * @param {WheelEvent} event - The wheel event
 */
function handleWheel(event) {
    // Use the centralized wheel event handler from wheel.js
    handleWheelEvent(event, isShiftPressed);
}
