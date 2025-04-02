/**
 * Controls Hint component for the Ambient Clock application
 * Manages the hint message. Its visibility is controlled externally based on
 * the main controls panel's state.
 */

import { getElement, addEvent, addClass, removeClass } from '../utils/dom.js';
import { showControls } from './controls.js'; // Keep showControls for the click handler

// DOM elements
let controlsHint;

/**
 * Initializes the controls hint component
 */
export function initControlsHint() {
    // Get DOM elements
    controlsHint = getElement('controls-hint');
    
    if (!controlsHint) {
        console.error("Controls hint element not found");
        return;
    }
    
    // Set up event listeners for the hint itself (click)
    setupHintEventListeners();
    
    // Ensure hint is hidden initially
    hideHintDirectly(); 
    
    console.log("Controls hint initialized");
}

/**
 * Sets up event listeners specifically for the hint element
 */
function setupHintEventListeners() {
    if (!controlsHint) return;
    
    // Add click event to the hint to show controls
    addEvent(controlsHint, 'click', handleHintClick);
}

/**
 * Handles click on the controls hint
 * @param {Event} event - The click event
 */
function handleHintClick(event) {
    // Show the controls panel
    showControls(); 
    
    // Hide the hint immediately when clicked
    hideHintDirectly();
    
    // Prevent default behavior
    event.preventDefault();
}

/**
 * Directly shows the hint by adding the 'visible' class.
 */
function showHintDirectly() {
    if (!controlsHint) return;
    addClass(controlsHint, 'visible');
}

/**
 * Directly hides the hint by removing the 'visible' class.
 */
function hideHintDirectly() {
    if (!controlsHint) return;
    removeClass(controlsHint, 'visible');
}

/**
 * Updates the hint's visibility based on the controls' visibility state.
 * This function is called externally (e.g., from visibility-controls.js).
 * @param {boolean} controlsAreNowVisible - The new visibility state of the controls.
 */
export function updateHintVisibilityBasedOnControls(controlsAreNowVisible) {
    if (controlsAreNowVisible) {
        // If controls just became visible, hide the hint
        hideHintDirectly(); 
    } else {
        // If controls just became hidden, show the hint
        showHintDirectly();
        // NOTE: No auto-hide timer logic resides here anymore.
    }
}
