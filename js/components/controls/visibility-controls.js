/**
 * Visibility Controls Module
 * Handles the visibility of the controls panel in the Ambient Clock application
 */

import { getElement, addEvent } from '../../utils/dom.js';
import { CONTROLS_HIDE_DELAY } from '../../config.js';
import { VisibilityManager } from '../../utils/visibility.js';

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
    
    // Initialize visibility manager
    controlsVisibility = new VisibilityManager(controls, CONTROLS_HIDE_DELAY);
    
    // Set up event listeners
    setupEventListeners();
    
    // Show controls initially, then start auto-hide timer
    showControls();
    
    // Start the auto-hide timer after a short delay to allow the page to load
    // Don't force hide if mouse is over the controls
    setTimeout(() => {
        if (controlsVisibility) {
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
    
    // Controls panel mouse enter/leave
    if (controls) {
        addEvent(controls, 'mouseenter', handleControlsMouseEnter);
        addEvent(controls, 'mouseleave', handleControlsMouseLeave);
    }
}

/**
 * Shows the controls panel
 */
export function showControls() {
    if (controlsVisibility) {
        controlsVisibility.show();
    }
}

/**
 * Hides the controls panel
 * @param {boolean} force - Whether to force hide the controls
 */
export function hideControls(force = false) {
    if (controlsVisibility) {
        controlsVisibility.hide(force);
    }
}

/**
 * Toggles the visibility of the controls panel
 */
export function toggleControls() {
    if (!controlsVisibility) return;
    
    if (controlsVisibility.isVisible) {
        hideControls(true); // Force hide
    } else {
        showControls();
    }
}

/**
 * Checks if the controls are currently visible
 * @returns {boolean} Whether the controls are visible
 */
export function areControlsVisible() {
    if (controlsVisibility) {
        return controlsVisibility.isVisible;
    }
    return false;
}

/**
 * Handles mouse enter event on controls
 */
function handleControlsMouseEnter() {
    // Ensure controls stay visible while mouse is over them
    if (controlsVisibility) {
        controlsVisibility.handleMouseEnter();
    }
}

/**
 * Handles mouse leave event on controls
 * @param {Event} event - The mouse leave event
 */
function handleControlsMouseLeave(event) {
    // Get all select elements in the controls
    const selectElements = controls.querySelectorAll('select');
    
    // Close any open select dropdowns immediately when mouse leaves
    selectElements.forEach(select => select.blur());
    
    // Start the auto-hide timer when mouse leaves, but don't force hide
    // This allows the controls to remain visible if the mouse re-enters
    if (controlsVisibility) {
        controlsVisibility.isHovering = false;
        controlsVisibility.startHideTimer(false);
    }
}

/**
 * Resets the auto-hide timer
 * @param {boolean} force - Whether to force reset the timer
 */
export function resetAutoHideTimer(force = false) {
    if (controlsVisibility) {
        controlsVisibility.startHideTimer(force);
    }
}
