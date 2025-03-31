/**
 * Global Controls Module
 * Handles global settings controls in the Ambient Clock application
 */

import { getState, updateState, resetSettings } from '../../state.js';
import { getElement, addEvent } from '../../utils/dom.js';
import { setEffect } from '../../features/effects.js';
import { updateDonateWidgetVisibility } from '../donate.js';
import { restoreDatePosition } from './date-controls.js';

// DOM elements
let effectSelect;
let timeFormatSelect;
let showSecondsCheckbox;
let resetButton;

/**
 * Initialize global controls
 */
export function initGlobalControls() {
    // Get DOM elements
    effectSelect = getElement('effect-select');
    timeFormatSelect = getElement('time-format-select');
    showSecondsCheckbox = getElement('show-seconds-checkbox');
    resetButton = getElement('reset-button');
    
    // Set up event listeners
    setupEventListeners();
}

/**
 * Set up event listeners for global controls
 */
function setupEventListeners() {
    // Effect select change
    if (effectSelect) {
        addEvent(effectSelect, 'change', handleEffectChange);
    }
    
    // Time format select change
    if (timeFormatSelect) {
        addEvent(timeFormatSelect, 'change', function(event) {
            updateState({
                global: {
                    timeFormat: event.target.value
                }
            });
        });
    }
    
    // Show seconds checkbox change
    if (showSecondsCheckbox) {
        addEvent(showSecondsCheckbox, 'change', handleShowSecondsChange);
    }
    
    // Reset button click
    if (resetButton) {
        addEvent(resetButton, 'click', handleResetClick);
    }
}

/**
 * Update global controls based on current state
 */
export function updateGlobalControlsFromState() {
    const state = getState();
    
    // Update effect select
    if (effectSelect) {
        const effect = state.effect || 
                     (state.global && state.global.effect) || 
                     'raised';
        effectSelect.value = effect;
    }
    
    // Update time format select
    if (timeFormatSelect) {
        const timeFormat = state.timeFormat || 
                         (state.global && state.global.timeFormat) || 
                         '24';
        timeFormatSelect.value = timeFormat;
    }
    
    // Update show seconds checkbox
    if (showSecondsCheckbox) {
        // Check if showSeconds is explicitly defined in state
        let showSeconds;
        if (state.showSeconds !== undefined) {
            showSeconds = state.showSeconds;
        } else if (state.global && state.global.showSeconds !== undefined) {
            showSeconds = state.global.showSeconds;
        } else {
            showSeconds = true; // Default value if not specified
        }
        showSecondsCheckbox.checked = showSeconds;
    }
}

/**
 * Handles effect select change
 * @param {Event} event - The change event
 */
function handleEffectChange(event) {
    const effect = event.target.value;
    
    // Update state
    updateState({
        global: {
            effect: effect
        }
    });
    
    // Apply effect
    setEffect(effect);
    
    console.log(`Effect changed to: ${effect}`);
}

/**
 * Handles show seconds checkbox change
 * @param {Event} event - The change event
 */
function handleShowSecondsChange(event) {
    const showSeconds = event.target.checked;
    
    // Update state with new value
    updateState({
        global: {
            showSeconds: showSeconds
        }
    }, true); // Save immediately to prevent any race conditions
    
    // Import clock manager functions
    import('../clock-manager.js').then(({ stopClockUpdates, startClockUpdates, updateAllClocks }) => {
        // First, stop any existing clock updates
        stopClockUpdates();
        
        // Directly update the clock display elements
        
        // Clean clock seconds
        const cleanSeconds = getElement('clean-seconds');
        const cleanClock = getElement('clean-clock');
        if (cleanSeconds) {
            const colonAfterMinutes = cleanSeconds.previousSibling;
            if (showSeconds) {
                cleanSeconds.style.display = '';
                if (colonAfterMinutes) colonAfterMinutes.textContent = ':';
            } else {
                cleanSeconds.style.display = 'none';
                if (colonAfterMinutes) colonAfterMinutes.textContent = '';
            }
        }
        
        // Analog clock seconds
        const analogSecond = getElement('analog-second');
        if (analogSecond) {
            analogSecond.style.display = showSeconds ? '' : 'none';
        }
        
        // LED clock seconds
        const ledSeconds = getElement('led-seconds');
        if (ledSeconds) {
            const secondsColon = document.querySelectorAll('.led-colon')[1];
            if (showSeconds) {
                ledSeconds.style.display = '';
                if (secondsColon) secondsColon.style.display = '';
            } else {
                ledSeconds.style.display = 'none';
                if (secondsColon) secondsColon.style.display = 'none';
            }
        }
        
        // Force an immediate update of all clocks with forceUpdate=true
        updateAllClocks(true);
        
        // If showing seconds, restart the clock updates
        if (showSeconds) {
            startClockUpdates();
        } else {
            // For hidden seconds, set up a minute-only update interval
            // This is handled in the clock-manager.js handleStateChange function
        }
        
        // Restore date position and opacity after clock update
        // This prevents the date from relocating when toggling seconds
        restoreDatePosition();
    });
}

/**
 * Handles reset button click
 * @param {Event} event - The click event
 */
function handleResetClick(event) {
    event.preventDefault();
    
    // Confirm reset with user
    if (confirm('Reset all settings to default?')) {
        // Reset settings
        resetSettings();
        
        // Hide donate widget
        updateDonateWidgetVisibility(false);
        
        console.log('Settings reset to default');
    }
}
