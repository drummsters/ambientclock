/**
 * Main Controls Module
 * Coordinates all control modules in the Ambient Clock application
 */

import { subscribe } from '../../state.js';
import { initClockControls, updateClockControlsFromState, populateFontSelect } from './clock-controls.js';
import { initDateControls, updateDateControlsFromState } from './date-controls.js';
import { initBackgroundControls, updateBackgroundControlsFromState } from './background-controls.js';
import { initGlobalControls, updateGlobalControlsFromState } from './global-controls.js';
import { initVisibilityControls, showControls } from './visibility-controls.js';

// Flag to track controls state
let controlsInitialized = false;

/**
 * Initializes all controls
 */
export function initControls() {
    if (controlsInitialized) {
        console.log('Controls already initialized');
        return;
    }
    
    // Initialize all control modules
    initVisibilityControls();
    initClockControls();
    initDateControls();
    initBackgroundControls();
    initGlobalControls();
    
    // Populate font select with available fonts
    populateFontSelect();
    
    // Subscribe to state changes
    subscribe(handleStateChange);
    
    // Initial setup based on current state
    updateControlsFromState();
    
    // Show controls initially
    showControls();
    
    // Set flag to indicate controls are initialized
    controlsInitialized = true;
    
    console.log('Controls initialized');
}

/**
 * Handles state changes
 * @param {Object} state - The current state
 */
function handleStateChange(state) {
    console.log("handleStateChange - Current category in state:", state.category);
    console.log("handleStateChange - Current category in background:", state.background.category);
    
    // Store the current category dropdown value before updating
    const categorySelect = document.getElementById('category-select');
    const currentCategoryValue = categorySelect ? categorySelect.value : null;
    console.log("handleStateChange - Current category dropdown value before update:", currentCategoryValue);
    
    // Update all controls based on the new state
    updateControlsFromState();
    
    // Check if the category dropdown value changed
    const newCategoryValue = categorySelect ? categorySelect.value : null;
    console.log("handleStateChange - Category dropdown value after update:", newCategoryValue);
    
    if (currentCategoryValue !== newCategoryValue) {
        console.log("handleStateChange - Category dropdown value changed from", currentCategoryValue, "to", newCategoryValue);
    } else {
        console.log("handleStateChange - Category dropdown value did not change");
    }
}

/**
 * Updates all controls based on current state
 */
function updateControlsFromState() {
    // Update all control modules
    updateClockControlsFromState();
    updateDateControlsFromState();
    updateBackgroundControlsFromState();
    updateGlobalControlsFromState();
}

// Export all functions from individual modules for backward compatibility
export * from './clock-controls.js';
export * from './date-controls.js';
export * from './background-controls.js';
export * from './global-controls.js';
export * from './visibility-controls.js';
