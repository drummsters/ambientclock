/**
 * Visibility Controls Module
 * Handles the visibility of the controls panel in the Ambient Clock application
 */

import { getElement, addEvent } from '../../utils/dom.js';
import { CONTROLS_HIDE_DELAY } from '../../config.js';
import { VisibilityManager } from '../../utils/visibility.js';
import { updateHintVisibilityBasedOnControls } from '../controls-hint.js'; // Import the hint update function

// DOM elements
let controls;
let controlsTrigger;

// Visibility manager for controls
let controlsVisibility;

/**
 * Initialize visibility controls
 */
export function initVisibilityControls() {
    // Get DOM elements
    controls = getElement('controls');
    controlsTrigger = getElement('controls-trigger');
    
    if (!controls) {
        console.error("Controls element not found");
        return;
    }
    
    // Initialize visibility manager with callbacks to update hint visibility
    controlsVisibility = new VisibilityManager(
        controls, 
        CONTROLS_HIDE_DELAY,
        () => { // onShow callback
            updateHintVisibilityBasedOnControls(true); // Controls are now visible
        },
        () => { // onHide callback
            updateHintVisibilityBasedOnControls(false); // Controls are now hidden
        }
    );
    
    // Set up event listeners
    setupEventListeners();
    
    // Show controls initially, then start auto-hide timer
    showControls(); // This will trigger the onShow callback -> updateHintVisibilityBasedOnControls(true)
    
    // Start the auto-hide timer after a short delay to allow the page to load
    // Don't force hide if mouse is over the controls
    setTimeout(() => {
        if (controlsVisibility) {
            // Only start timer if not hovering (standard VisibilityManager behavior)
            controlsVisibility.startHideTimer(false); 
        }
    }, 2000); // 2 seconds delay
}

/**
 * Set up event listeners for visibility controls
 */
function setupEventListeners() {
    // Controls trigger hover
    if (controlsTrigger) {
        addEvent(controlsTrigger, 'mouseenter', showControls);
    }
    
    // Controls panel mouse enter/leave (handled internally by VisibilityManager now)
    // We keep the specific logic for closing dropdowns on mouse leave
    if (controls) {
        // Let VisibilityManager handle hover state via its internal listeners
        // addEvent(controls, 'mouseenter', handleControlsMouseEnter); // Now handled by VM
        // addEvent(controls, 'mouseleave', handleControlsMouseLeave); // Now handled by VM

        // Add specific logic needed on mouse leave besides VM's timer reset
         addEvent(controls, 'mouseleave', (event) => {
            // Close any open select dropdowns immediately when mouse leaves
            const selectElements = controls.querySelectorAll('select');
            selectElements.forEach(select => select.blur());

            // VM's internal mouseleave listener will handle starting the hide timer
        });
    }
}

/**
 * Shows the controls panel
 */
export function showControls() {
    if (controlsVisibility) {
        controlsVisibility.show(); // This triggers the onShow callback
    }
}

/**
 * Hides the controls panel
 * @param {boolean} force - Whether to force hide the controls
 */
export function hideControls(force = false) {
    if (controlsVisibility) {
        controlsVisibility.hide(force); // This triggers the onHide callback
    }
}

/**
 * Toggles the visibility of the controls panel
 */
export function toggleControls() {
    if (!controlsVisibility) return;
    
    // toggle() method in VisibilityManager handles calling onShow/onHide
    controlsVisibility.toggle(); 
}

/**
 * Checks if the controls are currently visible
 * @returns {boolean} Whether the controls are visible
 */
export function areControlsVisible() {
    if (controlsVisibility) {
        return controlsVisibility.isElementVisible(); // Use VM's method
    }
    return false;
}

/**
 * Handles mouse enter event on controls (Now handled by VisibilityManager)
 */
// function handleControlsMouseEnter() { ... } // Removed as VM handles hover state

/**
 * Handles mouse leave event on controls (Now partially handled by VisibilityManager)
 */
// function handleControlsMouseLeave(event) { ... } // Removed as VM handles hover state and timer reset

/**
 * Resets the auto-hide timer
 * @param {boolean} force - Whether to force reset the timer
 */
export function resetAutoHideTimer(force = false) {
    if (controlsVisibility) {
        // Use forceHideAfterDelay parameter matching the original intent
        controlsVisibility.startHideTimer(force); 
    }
}
