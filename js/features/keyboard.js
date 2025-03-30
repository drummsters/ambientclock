/**
 * Keyboard feature for the Ambient Clock application
 * Handles keyboard shortcuts
 */

import { OPACITY_STEP, SCALE_STEP } from '../config.js';
import { updateOverlayOpacity } from '../components/background.js';
import { getState, updateState } from '../state.js';
import { showControls, toggleControls } from '../components/controls.js';
import { increaseClockSize, decreaseClockSize } from './position.js';
import { 
    handleWheelEvent, 
    increaseClockOpacity, 
    decreaseClockOpacity,
    increaseDateOpacity,
    decreaseDateOpacity,
    increaseDateSize,
    decreaseDateSize
} from '../utils/wheel.js';

// Track if shift key is pressed
let isShiftPressed = false;

/**
 * Initializes the keyboard feature
 */
export function initKeyboard() {
    // Add keyboard event listeners
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    // Removed global wheel event listener to only handle wheel events on clock and date elements
    
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

    // Check if date display is active
    const { showDate } = getState();
    const isDateFocused = document.activeElement === document.getElementById('date-container');
    
    switch (event.key) {
        case '+':
        case '=': // Handle both + and =
            event.preventDefault(); // Prevent browser zoom or other default actions
            if (event.shiftKey) {
                if (showDate && isDateFocused) {
                    increaseDateOpacity();
                } else {
                    increaseClockOpacity();
                }
            } else {
                // Increase background overlay opacity
                const { overlayOpacity } = getState();
                const newOpacity = Math.min(1.0, overlayOpacity + OPACITY_STEP);
                updateOverlayOpacity(newOpacity);
            }
            break;
            
        case '-':
            event.preventDefault(); // Prevent browser zoom
            if (event.shiftKey) {
                if (showDate && isDateFocused) {
                    decreaseDateOpacity();
                } else {
                    decreaseClockOpacity();
                }
            } else {
                // Decrease background overlay opacity
                const { overlayOpacity } = getState();
                const newOpacity = Math.max(0.0, overlayOpacity - OPACITY_STEP);
                updateOverlayOpacity(newOpacity);
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
            
        case 'd':
        case 'D': // D key - toggle date display
            event.preventDefault();
            toggleDateDisplay();
            break;
            
        case 'ArrowUp': // Up arrow - increase size
            event.preventDefault();
            if (showDate && isDateFocused) {
                increaseDateSize();
            } else {
                increaseClockSize(SCALE_STEP);
            }
            break;
            
        case 'ArrowDown': // Down arrow - decrease size
            event.preventDefault();
            if (showDate && isDateFocused) {
                decreaseDateSize();
            } else {
                decreaseClockSize(SCALE_STEP);
            }
            break;
    }
}

/**
 * Toggles the date display
 */
function toggleDateDisplay() {
    const { showDate } = getState();
    const newShowDate = !showDate;
    
    // Update state
    updateState({ showDate: newShowDate });
    
    // Update date container visibility
    const dateContainer = document.getElementById('date-container');
    if (dateContainer) {
        dateContainer.style.display = newShowDate ? 'block' : 'none';
    }
    
    console.log(`Date display ${newShowDate ? 'enabled' : 'disabled'}`);
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
