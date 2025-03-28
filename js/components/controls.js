/**
 * Controls component for the Ambient Clock application
 * Manages the control panel and user interactions
 */

import { getState, updateState, subscribe, resetSettings } from '../state.js';
import { getElement, updateStyle, showElement, hideElement, addEvent } from '../utils/dom.js';
import { CONTROLS_HIDE_DELAY } from '../config.js';
import { VisibilityManager } from '../utils/visibility.js';
import { setClockFace, updateClockOpacity } from './clock-manager.js';
import { updateOverlayOpacity, setBackgroundColor, fetchNewBackground, startBackgroundCycling, updateZoomEffect } from './background.js';
import { setEffect } from '../features/effects.js';
import { updateDonateWidgetVisibility } from './donate.js';

// DOM elements
let controls;
let controlsTrigger;
let imageSourceSelect;
let categorySelect;
let customCategoryGroup;
let customCategoryInput;
let applyCustomCategoryButton;
let colorPickerGroup;
let backgroundColorInput;
let clockFaceSelect;
let effectSelect;
let clockOpacitySlider;
let backgroundOpacitySlider;
let timeFormatSelect;
let showSecondsCheckbox;
let nextBackgroundButton;
let resetButton;
let fontSelect;
let boldCheckbox;
let zoomEffectCheckbox;

// Visibility manager for controls
let controlsVisibility;

// Flag to track controls state
let controlsInitialized = false;

/**
 * Initializes the controls component
 */
export function initControls() {
    // Get DOM elements
    controls = getElement('controls');
    controlsTrigger = getElement('controls-trigger');
    
    // Initialize visibility manager
    controlsVisibility = new VisibilityManager(controls, CONTROLS_HIDE_DELAY);
    imageSourceSelect = getElement('image-source-select');
    categorySelect = getElement('category-select');
    customCategoryGroup = getElement('custom-category-group');
    customCategoryInput = getElement('custom-category');
    applyCustomCategoryButton = getElement('apply-custom-category');
    colorPickerGroup = getElement('color-picker-group');
    backgroundColorInput = getElement('background-color');
    clockFaceSelect = getElement('clockface-select');
    effectSelect = getElement('effect-select');
    clockOpacitySlider = getElement('clock-opacity-slider');
    backgroundOpacitySlider = getElement('background-opacity-slider');
    timeFormatSelect = getElement('time-format-select');
    showSecondsCheckbox = getElement('show-seconds-checkbox');
    nextBackgroundButton = getElement('next-background-button');
    resetButton = getElement('reset-button');
    fontSelect = getElement('font-select');
    boldCheckbox = getElement('font-bold');
    zoomEffectCheckbox = getElement('zoom-effect-checkbox');
    
    if (!controls) {
        console.error("Controls element not found");
        return;
    }
    
    // Set up event listeners
    setupEventListeners();
    
    // Subscribe to state changes
    subscribe(handleStateChange);
    
    // Initial setup based on current state
    updateControlsFromState();
    
    // Show controls initially, then start auto-hide timer
    showControls();
    
    // Start the auto-hide timer after a short delay to allow the page to load
    // Use forceHideAfterDelay=true to ensure controls hide even if mouse is over them
    setTimeout(() => {
        if (controlsVisibility) {
            controlsVisibility.startHideTimer(true);
        }
    }, 2000); // 2 seconds delay
}

/**
 * Sets up event listeners for controls
 */
function setupEventListeners() {
    // Image source select change
    if (imageSourceSelect) {
        addEvent(imageSourceSelect, 'change', handleImageSourceChange);
    }
    
    // Category select change
    if (categorySelect) {
        addEvent(categorySelect, 'change', handleCategoryChange);
    }
    
    // Background color input change
    if (backgroundColorInput) {
        addEvent(backgroundColorInput, 'input', handleBackgroundColorChange);
    }
    
    // Custom category input
    if (customCategoryInput) {
        addEvent(customCategoryInput, 'keydown', handleCustomCategoryKeydown);
    }
    
    // Apply custom category button
    if (applyCustomCategoryButton) {
        addEvent(applyCustomCategoryButton, 'click', handleApplyCustomCategory);
    }
    
    // Clock face select change
    if (clockFaceSelect) {
        addEvent(clockFaceSelect, 'change', handleClockFaceChange);
    }
    
    // Effect select change
    if (effectSelect) {
        addEvent(effectSelect, 'change', handleEffectChange);
    }
    
    // Clock opacity slider change
    if (clockOpacitySlider) {
        addEvent(clockOpacitySlider, 'input', handleClockOpacityChange);
    }

    // Background opacity slider change
    if (backgroundOpacitySlider) {
        addEvent(backgroundOpacitySlider, 'input', handleBackgroundOpacityChange);
    }
    
    // Zoom effect checkbox change
    if (zoomEffectCheckbox) {
        addEvent(zoomEffectCheckbox, 'change', handleZoomEffectChange);
    }
    
    // Font select change
    if (fontSelect) {
        addEvent(fontSelect, 'change', handleFontChange);
        
        // Add new font options
        const fonts = [
            "'Arial', Helvetica, sans-serif",
            "'Times New Roman', Times, serif",
            "'Courier New', Courier, monospace",
            "'Roboto', sans-serif",
            "'Open Sans', sans-serif",
            "'Lato', sans-serif",
            "'Montserrat', sans-serif",
            "'Oswald', sans-serif",
            "'Poppins', sans-serif",
            "'Raleway', sans-serif",
            "'Slabo 27px', serif",
            "'Roboto Mono', Courier New, monospace",
            "'Source Code Pro', Courier, monospace",
            "'Fira Code', Courier, monospace",
            "'Orbitron', sans-serif",
            "Digital, monospace",
            "Segment7, monospace",
            "'Bebas Neue', sans-serif",
            "Anton, sans-serif",
            "Impact, sans-serif",
            "Verdana, Geneva, sans-serif",
            "'Trebuchet MS', sans-serif",
            "Georgia, serif",
            "'Palatino Linotype', Book Antiqua, Palatino, serif"
        ];
        
        // Clear existing options
        fontSelect.innerHTML = '';
        
        fonts.forEach(font => {
            const option = document.createElement('option');
            option.value = font;
            option.textContent = font.split(',')[0].replace(/'/g, '');
            fontSelect.appendChild(option);
        });
    }

    // Bold checkbox change
    if (boldCheckbox) {
        addEvent(boldCheckbox, 'change', handleFontBoldChange);
    }

    // Time format select change
    if (timeFormatSelect) {
        addEvent(timeFormatSelect, 'change', handleTimeFormatChange);
    }
    
    // Show seconds checkbox change
    if (showSecondsCheckbox) {
        addEvent(showSecondsCheckbox, 'change', handleShowSecondsChange);
    }
    
    // Next background button click
    if (nextBackgroundButton) {
        addEvent(nextBackgroundButton, 'click', handleNextBackgroundClick);
    }

    // Reset button click
    if (resetButton) {
        addEvent(resetButton, 'click', handleResetClick);
    }
    
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
 */
function handleControlsMouseLeave() {
    // Close any open select dropdowns immediately when mouse leaves
    if (imageSourceSelect) imageSourceSelect.blur();
    if (categorySelect) categorySelect.blur();
    if (clockFaceSelect) clockFaceSelect.blur();
    if (effectSelect) effectSelect.blur();
    if (timeFormatSelect) timeFormatSelect.blur();
    if (fontSelect) fontSelect.blur();
    
    // Start the auto-hide timer when mouse leaves, forcing hide after delay
    if (controlsVisibility) {
        controlsVisibility.isHovering = false;
        controlsVisibility.startHideTimer(true);
    }
}

/**
 * Handles image source select change
 * @param {Event} event - The change event
 */
function handleImageSourceChange(event) {
    const imageSource = event.target.value;
    
    // Update state
    updateState({ imageSource });
    
    console.log(`Image source changed to: ${imageSource}`);
}

/**
 * Handles state changes
 * @param {Object} state - The current state
 */
function handleStateChange(state) {
    updateControlsFromState();
}

/**
 * Updates control elements based on current state
 */
function updateControlsFromState() {
    const state = getState();
    
    // Update image source select
    if (imageSourceSelect && state.imageSource) {
        imageSourceSelect.value = state.imageSource;
    }
    
    // Update category select
    if (categorySelect) {
        categorySelect.value = state.category;
    }
    
    // Update custom category input
    if (customCategoryInput) {
        customCategoryInput.value = state.customCategory;
    }
    
    // Show/hide custom category input based on selection
    if (state.category === 'Custom' && customCategoryGroup) {
        showElement(customCategoryGroup, 'flex');
        hideElement(colorPickerGroup);
    } else if (state.category === 'None' && colorPickerGroup) {
        hideElement(customCategoryGroup);
        showElement(colorPickerGroup, 'flex');
    } else {
        hideElement(customCategoryGroup);
        hideElement(colorPickerGroup);
    }
    
    // Update background color input
    if (backgroundColorInput) {
        backgroundColorInput.value = state.backgroundColor;
    }
    
    // Update clock face select
    if (clockFaceSelect) {
        clockFaceSelect.value = state.clockFace;
    }
    
    // Update effect select
    if (effectSelect) {
        effectSelect.value = state.effect;
    }
    
    // Update clock opacity slider
    if (clockOpacitySlider) {
        clockOpacitySlider.value = state.clockOpacity;
    }
    
    // Update background opacity slider
    if (backgroundOpacitySlider) {
        backgroundOpacitySlider.value = state.overlayOpacity;
    }
    
    // Update time format select
    if (timeFormatSelect) {
        timeFormatSelect.value = state.timeFormat;
    }
    
    // Update font select
    if (fontSelect) {
        fontSelect.value = state.fontFamily || "'Arial', Helvetica, sans-serif";
    }
    
    // Update bold checkbox
    if (boldCheckbox) {
        boldCheckbox.checked = state.fontBold || false;
    }
    
    // Update show seconds checkbox
    if (showSecondsCheckbox) {
        showSecondsCheckbox.checked = state.showSeconds;
    }
    
    // Update zoom effect checkbox
    if (zoomEffectCheckbox) {
        zoomEffectCheckbox.checked = state.zoomEnabled !== undefined ? state.zoomEnabled : true;
    }
}

/**
 * Handles category select change
 * @param {Event} event - The change event
 */
function handleCategoryChange(event) {
    const category = event.target.value;
    
    // Update state
    updateState({ category });
    
    // Show/hide custom category input based on selection
    if (category === 'Custom' && customCategoryGroup) {
        showElement(customCategoryGroup, 'flex');
        hideElement(colorPickerGroup);
        if (customCategoryInput) {
            customCategoryInput.focus();
        }
    } else if (category === 'None' && colorPickerGroup) {
        hideElement(customCategoryGroup);
        showElement(colorPickerGroup, 'flex');
        
        // Apply the current background color when switching to None
        const { backgroundColor } = getState();
        setBackgroundColor(backgroundColor, false);
    } else {
        hideElement(customCategoryGroup);
        hideElement(colorPickerGroup);
        startBackgroundCycling(true, true); // Fetch new image immediately and force new image
    }
}

/**
 * Handles background color input change
 * @param {Event} event - The input event
 */
function handleBackgroundColorChange(event) {
    const color = event.target.value;
    
    // Update state
    updateState({ backgroundColor: color });
    
    // Update background if category is None
    if (getState().category === 'None') {
        // Use false for the second parameter to avoid infinite recursion
        setBackgroundColor(color, false);
    } else {
        // Even if we're not showing a solid background color,
        // we still want to update the overlay color
        const { overlayOpacity } = getState();
        updateOverlayOpacity(overlayOpacity, false);
    }
    
    // Log the color change for debugging
    console.log(`Background color changed to: ${color}`);
}

/**
 * Handles custom category input keydown
 * @param {KeyboardEvent} event - The keydown event
 */
function handleCustomCategoryKeydown(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        applyCustomCategory();
    }
}

/**
 * Handles apply custom category button click
 * @param {Event} event - The click event
 */
function handleApplyCustomCategory(event) {
    event.preventDefault();
    applyCustomCategory();
}

/**
 * Applies the custom category
 */
function applyCustomCategory() {
    if (!customCategoryInput) return;
    
    const customCategory = customCategoryInput.value.trim();
    if (customCategory) {
        // Update state
        updateState({ customCategory });
        
        // Fetch new background and force new image
        startBackgroundCycling(true, true);
    }
}

/**
 * Handles clock face select change
 * @param {Event} event - The change event
 */
function handleClockFaceChange(event) {
    setClockFace(event.target.value);
}

/**
 * Handles effect select change
 * @param {Event} event - The change event
 */
function handleEffectChange(event) {
    setEffect(event.target.value);
}

/**
 * Handles clock opacity slider change
 * @param {Event} event - The input event
 */
/**
 * Handles clock opacity slider change
 * @param {Event} event - The input event
 */
function handleClockOpacityChange(event) {
    updateClockOpacity(parseFloat(event.target.value));
}

/**
 * Handles background opacity slider change
 * @param {Event} event - The input event
 */
function handleBackgroundOpacityChange(event) {
    updateOverlayOpacity(parseFloat(event.target.value));
}

/**
 * Handles time format select change
 * @param {Event} event - The change event
 */
function handleTimeFormatChange(event) {
    updateState({ timeFormat: event.target.value });
}

/**
 * Handles font change
 * @param {Event} event - The change event
 */
function handleFontChange(event) {
    const fontFamily = event.target.value;
    updateState({ fontFamily });
    
    // Update CSS variable for broader component styling
    document.documentElement.style.setProperty('--clean-clock-font', fontFamily);
    
    // Get the bold checkbox state
    const isBold = boldCheckbox?.checked || false;
    
    // Directly update all clock elements
    document.querySelectorAll('.clock-face').forEach(clock => {
        clock.style.fontFamily = fontFamily;
        clock.style.fontWeight = isBold ? 'bold' : 'normal';
        
        // Trigger reflow using offsetHeight
        void clock.offsetHeight;
    });
}

/**
 * Handles font bold checkbox change
 * @param {Event} event - The change event
 */
function handleFontBoldChange(event) {
    const isBold = event.target.checked;
    updateState({ fontBold: isBold });
    
    // Update all clock elements
    document.querySelectorAll('.clock-face').forEach(clock => {
        clock.style.fontWeight = isBold ? 'bold' : 'normal';
    });
}

/**
 * Handles show seconds checkbox change
 * @param {Event} event - The change event
 */
function handleShowSecondsChange(event) {
    updateState({ showSeconds: event.target.checked });
}

/**
 * Handles zoom effect checkbox change
 * @param {Event} event - The change event
 */
function handleZoomEffectChange(event) {
    const enabled = event.target.checked;
    updateZoomEffect(enabled);
}

/**
 * Handles next background button click
 */
function handleNextBackgroundClick() {
    // Force fetching a new image even if there's a cached one
    startBackgroundCycling(true, true);
}

/**
 * Handles reset button click
 */
function handleResetClick() {
    if (confirm('Are you sure you want to reset all settings to defaults?')) {
        resetSettings();
        // Force a refresh to apply all default settings
        window.location.reload();
    }
}

/**
 * Shows the controls and resets the auto-hide timer
 */
export function showControls() {
    if (!controlsVisibility) return;
    
    controlsVisibility.show();
    
    // Update donate widget visibility
    updateDonateWidgetVisibility(true);
}

/**
 * Hides the controls
 */
export function hideControls() {
    if (!controlsVisibility) return;
    
    // Close any open select dropdowns
    if (imageSourceSelect) imageSourceSelect.blur();
    if (categorySelect) categorySelect.blur();
    if (clockFaceSelect) clockFaceSelect.blur();
    if (effectSelect) effectSelect.blur();
    if (timeFormatSelect) timeFormatSelect.blur();
    if (fontSelect) fontSelect.blur();
    
    controlsVisibility.hide();
    
    // Update donate widget visibility
    updateDonateWidgetVisibility(false);
}

/**
 * Toggles the controls visibility
 */
export function toggleControls() {
    if (!controlsVisibility) return;
    
    controlsVisibility.toggle();
    
    // Update donate widget visibility based on new state
    updateDonateWidgetVisibility(controlsVisibility.isElementVisible());
}

/**
 * Checks if controls are currently visible
 * @returns {boolean} True if controls are visible
 */
export function areControlsVisible() {
    return controlsVisibility ? controlsVisibility.isElementVisible() : false;
}
