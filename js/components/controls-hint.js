/**
 * Controls Hint component for the Ambient Clock application
 * Manages the hint message that appears when the user moves the mouse
 */

import { areControlsVisible, showControls } from './controls.js';

// DOM elements
let controlsHint;
let hintVisible = false;
let mouseTimer = null;
let lastMouseMoveTime = 0;

// Constants
const MOUSE_IDLE_DELAY = 5000; // 5 seconds before hiding the hint after mouse stops moving
const HINT_SHOW_DELAY = 200;   // 0.2 seconds before showing the hint after mouse moves

/**
 * Initializes the controls hint component
 */
export function initControlsHint() {
    // Get DOM elements
    controlsHint = document.getElementById('controls-hint');
    
    if (!controlsHint) {
        console.error("Controls hint element not found");
        return;
    }
    
    // Set up event listeners
    setupEventListeners();
    
    // Show hint after a short delay when the page loads
    setTimeout(() => {
        // Only show if controls are not visible
        if (!areControlsVisible()) {
            showHint();
            
            // Set timer to hide hint after a delay
            setTimeout(hideHint, MOUSE_IDLE_DELAY);
        }
    }, 3000); // 3 seconds after page load
    
    console.log("Controls hint initialized");
}

/**
 * Sets up event listeners for the controls hint
 */
function setupEventListeners() {
    // Listen for mouse movement
    document.addEventListener('mousemove', handleMouseMove);
    
    // Listen for mouse leave
    document.addEventListener('mouseleave', hideHint);
    
    // Add click event to the hint to show controls
    if (controlsHint) {
        controlsHint.addEventListener('click', handleHintClick);
    }
}

/**
 * Handles click on the controls hint
 * @param {Event} event - The click event
 */
function handleHintClick(event) {
    // Show the controls panel
    showControls();
    
    // Hide the hint
    hideHint();
    
    // Prevent default behavior
    event.preventDefault();
}

/**
 * Handles mouse movement
 */
function handleMouseMove() {
    // Don't show hint if controls are visible
    if (areControlsVisible()) {
        hideHint();
        return;
    }
    
    // Update last mouse move time
    lastMouseMoveTime = Date.now();
    
    // If hint is not visible, show it after a short delay
    if (!hintVisible) {
        // Clear any existing timer
        if (mouseTimer) {
            clearTimeout(mouseTimer);
        }
        
        // Set timer to show hint
        mouseTimer = setTimeout(() => {
            showHint();
            
            // Set timer to hide hint after mouse stops moving
            mouseTimer = setTimeout(hideHint, MOUSE_IDLE_DELAY);
        }, HINT_SHOW_DELAY);
    } else {
        // If hint is already visible, reset the hide timer
        if (mouseTimer) {
            clearTimeout(mouseTimer);
        }
        
        // Set timer to hide hint after mouse stops moving
        mouseTimer = setTimeout(hideHint, MOUSE_IDLE_DELAY);
    }
}

/**
 * Shows the controls hint
 */
function showHint() {
    if (!controlsHint || hintVisible || areControlsVisible()) return;
    
    controlsHint.classList.add('visible');
    hintVisible = true;
}

/**
 * Hides the controls hint
 */
function hideHint() {
    if (!controlsHint || !hintVisible) return;
    
    controlsHint.classList.remove('visible');
    hintVisible = false;
    
    // Clear any existing timer
    if (mouseTimer) {
        clearTimeout(mouseTimer);
        mouseTimer = null;
    }
}
