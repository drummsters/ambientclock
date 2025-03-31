/**
 * Background Controls Module
 * Handles all background-related controls in the Ambient Clock application
 */

import { getState, updateState } from '../../state.js';
import { getElement, showElement, hideElement, addEvent } from '../../utils/dom.js';
import { 
    DEFAULT_IMAGE_SOURCE, 
    DEFAULT_BACKGROUND_COLOR, 
    DEFAULT_OVERLAY_OPACITY,
    DEFAULT_ZOOM_ENABLED
} from '../../config.js';
import { 
    updateOverlayOpacity, 
    setBackgroundColor, 
    fetchNewBackground, 
    startBackgroundCycling, 
    updateZoomEffect 
} from '../background.js';

// DOM elements
let imageSourceSelect;
let categorySelect;
let customCategoryGroup;
let customCategoryInput;
let applyCustomCategoryButton;
let colorPickerGroup;
let backgroundColorInput;
let backgroundOpacitySlider;
let zoomEffectCheckbox;
let nextBackgroundButton;

/**
 * Initialize background controls
 */
export function initBackgroundControls() {
    // Get DOM elements
    imageSourceSelect = getElement('image-source-select');
    categorySelect = getElement('category-select');
    customCategoryGroup = getElement('custom-category-group');
    customCategoryInput = getElement('custom-category');
    applyCustomCategoryButton = getElement('apply-custom-category');
    colorPickerGroup = getElement('color-picker-group');
    backgroundColorInput = getElement('background-color');
    backgroundOpacitySlider = getElement('background-opacity-slider');
    zoomEffectCheckbox = getElement('zoom-effect-checkbox');
    nextBackgroundButton = getElement('next-background-button');
    
    // Set up event listeners
    setupEventListeners();
}

/**
 * Set up event listeners for background controls
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
    
    // Background opacity slider change
    if (backgroundOpacitySlider) {
        addEvent(backgroundOpacitySlider, 'input', function(event) {
            const value = parseFloat(event.target.value);
            console.log("Background opacity slider value:", value);
            updateOverlayOpacity(value);
        });
    }
    
    // Zoom effect checkbox change
    if (zoomEffectCheckbox) {
        addEvent(zoomEffectCheckbox, 'change', function(event) {
            updateZoomEffect(event.target.checked);
        });
    }
    
    // Next background button click
    if (nextBackgroundButton) {
        addEvent(nextBackgroundButton, 'click', handleNextBackgroundClick);
    }
}

/**
 * Update background controls based on current state
 */
export function updateBackgroundControlsFromState() {
    const state = getState();
    
    // Update image source select
    if (imageSourceSelect) {
        const imageSource = state.imageSource || 
                          (state.background && state.background.imageSource) || 
                          DEFAULT_IMAGE_SOURCE;
        imageSourceSelect.value = imageSource;
    }
    
    // Update category select
    if (categorySelect) {
        const category = state.category || 
                       (state.background && state.background.category) || 
                       'Nature';
        categorySelect.value = category;
    }
    
    // Update custom category input
    if (customCategoryInput) {
        const customCategory = state.customCategory || 
                             (state.background && state.background.customCategory) || 
                             '';
        customCategoryInput.value = customCategory;
    }
    
    // Show/hide custom category input based on selection
    const category = state.category || 
                   (state.background && state.background.category) || 
                   'Nature';
    if (category === 'Custom' && customCategoryGroup) {
        showElement(customCategoryGroup, 'flex');
        hideElement(colorPickerGroup);
    } else if (category === 'None' && colorPickerGroup) {
        hideElement(customCategoryGroup);
        showElement(colorPickerGroup, 'flex');
    } else {
        hideElement(customCategoryGroup);
        hideElement(colorPickerGroup);
    }
    
    // Update background color input
    if (backgroundColorInput) {
        const backgroundColor = state.backgroundColor || 
                              (state.background && state.background.backgroundColor) || 
                              DEFAULT_BACKGROUND_COLOR;
        backgroundColorInput.value = backgroundColor;
    }
    
    // Update background opacity slider
    if (backgroundOpacitySlider) {
        const overlayOpacity = state.overlayOpacity || 
                             (state.background && state.background.overlayOpacity) || 
                             DEFAULT_OVERLAY_OPACITY;
        backgroundOpacitySlider.value = overlayOpacity;
    }
    
    // Update zoom effect checkbox
    if (zoomEffectCheckbox) {
        // Check if zoomEnabled is explicitly defined in state
        let zoomEnabled;
        if (state.zoomEnabled !== undefined) {
            zoomEnabled = state.zoomEnabled;
        } else if (state.background && state.background.zoomEnabled !== undefined) {
            zoomEnabled = state.background.zoomEnabled;
        } else {
            zoomEnabled = DEFAULT_ZOOM_ENABLED; // Default value from config
        }
        zoomEffectCheckbox.checked = zoomEnabled;
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
        const state = getState();
        const overlayOpacity = state.overlayOpacity || 
                             (state.background && state.background.overlayOpacity);
        
        // Only update the overlay opacity if it's explicitly defined in the state
        if (overlayOpacity !== undefined) {
            console.log("Updating overlay opacity from handleBackgroundColorChange to:", overlayOpacity);
            updateOverlayOpacity(overlayOpacity, false);
        }
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
 * Handles next background button click
 * @param {Event} event - The click event
 */
function handleNextBackgroundClick(event) {
    event.preventDefault();
    
    // Fetch new background and force new image
    fetchNewBackground(true);
    
    console.log("Fetching next background image");
}
