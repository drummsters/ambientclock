/**
 * Date Controls Module
 * Handles all date-related controls in the Ambient Clock application
 */

import { getState, updateState } from '../../state.js';
import { getElement, addEvent } from '../../utils/dom.js';
import { CUSTOM_POSITION_INDEX } from '../../config.js';
import { resetDatePosition } from '../date-manager.js';

// DOM elements
let dateDisplayCheckbox;
let dateFormatSelect;
let dateColorInput;
let dateOpacitySlider;
let dateScaleSlider;

/**
 * Initialize date controls
 */
export function initDateControls() {
    // Get DOM elements
    dateDisplayCheckbox = getElement('date-display-checkbox');
    dateFormatSelect = getElement('date-format-select');
    dateColorInput = getElement('date-color');
    dateOpacitySlider = getElement('date-opacity-slider');
    dateScaleSlider = getElement('date-scale-slider');
    
    // Set up event listeners
    setupEventListeners();
}

/**
 * Set up event listeners for date controls
 */
function setupEventListeners() {
    // Date display checkbox change
    if (dateDisplayCheckbox) {
        addEvent(dateDisplayCheckbox, 'change', handleDateDisplayChange);
    }
    
    // Date format select change
    if (dateFormatSelect) {
        addEvent(dateFormatSelect, 'change', handleDateFormatChange);
    }
    
    // Date color input change
    if (dateColorInput) {
        addEvent(dateColorInput, 'input', handleDateColorChange);
    }
    
    // Date opacity slider change
    if (dateOpacitySlider) {
        addEvent(dateOpacitySlider, 'input', handleDateOpacityChange);
    }
    
    // Date scale slider change
    if (dateScaleSlider) {
        addEvent(dateScaleSlider, 'input', handleDateScaleChange);
    }
}

/**
 * Update date controls based on current state
 */
export function updateDateControlsFromState() {
    const state = getState();
    
    // Update date display checkbox
    if (dateDisplayCheckbox) {
        const showDate = state.showDate || 
                       (state.date && state.date.showDate) || 
                       false;
        dateDisplayCheckbox.checked = showDate;
    }
    
    // Update date format select
    if (dateFormatSelect) {
        const dateFormat = state.dateFormat || 
                         (state.date && state.date.dateFormat) || 
                         'MM/DD/YYYY';
        const showDate = state.showDate || 
                       (state.date && state.date.showDate) || 
                       false;
        dateFormatSelect.value = dateFormat;
        dateFormatSelect.disabled = !showDate;
    }
    
    // Update date color input
    if (dateColorInput) {
        const dateColor = state.dateColor || 
                        (state.date && state.date.dateColor) || 
                        '#FFFFFF';
        dateColorInput.value = dateColor;
    }
    
    // Update date opacity slider
    if (dateOpacitySlider) {
        const dateOpacity = state.dateOpacity || 
                          (state.date && state.date.dateOpacity) || 
                          1.0;
        dateOpacitySlider.value = dateOpacity;
    }
    
    // Update date scale slider
    if (dateScaleSlider) {
        const dateScale = state.dateScale || 
                        (state.date && state.date.dateScale) || 
                        1.0;
        dateScaleSlider.value = dateScale;
    }
    
    // Update date container visibility
    const dateContainer = getElement('date-container');
    if (dateContainer) {
        const showDate = state.showDate || 
                       (state.date && state.date.showDate) || 
                       false;
        dateContainer.style.display = showDate ? 'block' : 'none';
    }
}

/**
 * Handles date display checkbox change
 * @param {Event} event - The change event
 */
function handleDateDisplayChange(event) {
    const showDate = event.target.checked;
    
    // Update state using the new structure
    updateState({
        date: {
            showDate: showDate
        }
    });
    
    // Enable/disable date format select
    if (dateFormatSelect) {
        dateFormatSelect.disabled = !showDate;
    }
    
    // Show/hide date container
    const dateContainer = getElement('date-container');
    if (dateContainer) {
        dateContainer.style.display = showDate ? 'block' : 'none';
        
        // If showing the date and it's off-screen, reset its position
        if (showDate) {
            const state = getState();
            const dateCustomPositionX = state.dateCustomPositionX || state.date?.dateCustomPositionX;
            const dateCustomPositionY = state.dateCustomPositionY || state.date?.dateCustomPositionY;
            
            if (dateCustomPositionX > 100 || dateCustomPositionY > 100 || 
                dateCustomPositionX < 0 || dateCustomPositionY < 0) {
                resetDatePosition();
            }
        }
    }
    
    console.log(`Date display ${showDate ? 'enabled' : 'disabled'}`);
}

/**
 * Handles date format select change
 * @param {Event} event - The change event
 */
function handleDateFormatChange(event) {
    const dateFormat = event.target.value;
    
    // Update state using the new structure
    updateState({
        date: {
            dateFormat: dateFormat
        }
    });
    
    console.log(`Date format changed to: ${dateFormat}`);
}

/**
 * Handles date color input change
 * @param {Event} event - The input event
 */
function handleDateColorChange(event) {
    const dateColor = event.target.value;
    
    // Update state using the new structure
    updateState({
        date: {
            dateColor: dateColor
        }
    });
    
    // Update date container color
    const dateContainer = getElement('date-container');
    if (dateContainer) {
        dateContainer.style.color = dateColor;
    }
    
    console.log(`Date color changed to: ${dateColor}`);
}

/**
 * Handles date opacity slider change
 * @param {Event} event - The input event
 */
function handleDateOpacityChange(event) {
    const value = parseFloat(event.target.value);
    console.log("Date opacity slider value:", value);
    
    // Update state with the new opacity value
    updateState({
        dateOpacity: value,
        date: {
            dateOpacity: value
        }
    }, true); // Save immediately to ensure it persists
    
    // Update date face opacity directly (not the container)
    const dateFace = getElement('date-face');
    if (dateFace) {
        dateFace.style.opacity = value;
        console.log(`Applied date opacity from slider: ${value}`);
    }
}

/**
 * Handles date scale slider change
 * @param {Event} event - The input event
 */
function handleDateScaleChange(event) {
    const scale = parseFloat(event.target.value);
    console.log("Date scale slider value:", scale);
    
    // Import the updateDateSize function from element-position.js
    import('../../features/element-position.js').then(({ updateDateSize }) => {
        updateDateSize(scale);
    });
}

/**
 * Restore date position and opacity after state changes
 * Used when toggling seconds or other operations that might affect date position
 */
export function restoreDatePosition() {
    const state = getState();
    const datePositionIndex = state.datePositionIndex || (state.date && state.date.datePositionIndex) || 0;
    const dateCustomPositionX = state.dateCustomPositionX || (state.date && state.date.dateCustomPositionX) || 50;
    const dateCustomPositionY = state.dateCustomPositionY || (state.date && state.date.dateCustomPositionY) || 60;
    const dateOpacity = state.dateOpacity || (state.date && state.date.dateOpacity) || 1.0;
    
    const dateContainer = getElement('date-container');
    if (dateContainer) {
        // Apply saved opacity
        dateContainer.style.opacity = dateOpacity;
        
        // Apply saved position
        if (datePositionIndex === CUSTOM_POSITION_INDEX && 
            dateCustomPositionX !== undefined && dateCustomPositionY !== undefined) {
            // Convert percentage to pixels for absolute positioning
            const left = (window.innerWidth * dateCustomPositionX / 100);
            const top = (window.innerHeight * dateCustomPositionY / 100);
            
            // Apply position
            dateContainer.style.left = `${left}px`;
            dateContainer.style.top = `${top}px`;
            console.log(`Restored date position: ${dateCustomPositionX}%, ${dateCustomPositionY}%`);
        }
    }
}
