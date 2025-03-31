/**
 * Keyboard feature for the Ambient Clock application
 * Handles keyboard shortcuts
 */

import { toggleControls } from '../components/controls.js';

/**
 * Initializes the keyboard feature
 */
export function initKeyboard() {
    // Add keyboard event listener
    document.addEventListener('keydown', handleKeyDown);
    
    console.log("Keyboard shortcuts initialized");
}

/**
 * Handles keydown events
 * @param {KeyboardEvent} event - The keydown event
 */
function handleKeyDown(event) {
    // Ignore if modifier keys are pressed or if typing in an input/select
    if (event.ctrlKey || event.altKey || event.metaKey || event.shiftKey ||
        event.target.tagName === 'INPUT' || event.target.tagName === 'SELECT') {
        return;
    }
    
    switch (event.key) {
        case ' ': // Spacebar
            event.preventDefault(); // Prevent page scroll
            toggleControls();
            break;
            
        case 'c':
        case 'C': // C key
            event.preventDefault(); // Prevent default browser actions
            toggleControls();
            break;
    }
}
