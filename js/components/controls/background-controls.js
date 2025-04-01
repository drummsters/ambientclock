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
// V1 Peapix additions
let peapixCountryGroup;
let peapixCountrySelect;
const peapixCountries = { // Define country codes and names
    au: 'Australia', br: 'Brazil', ca: 'Canada', cn: 'China', de: 'Germany',
    fr: 'France', in: 'India', it: 'Italy', jp: 'Japan', es: 'Spain',
    gb: 'United Kingdom', us: 'United States'
};


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

    // --- V1 Peapix Additions ---
    // Add Peapix option dynamically
    if (imageSourceSelect) {
        const peapixOption = document.createElement('option');
        peapixOption.value = 'peapix';
        peapixOption.textContent = 'Peapix (Bing)';
        imageSourceSelect.appendChild(peapixOption);
    }

    // Create and append Peapix country dropdown
    peapixCountryGroup = document.createElement('div');
    peapixCountryGroup.id = 'peapix-country-group';
    peapixCountryGroup.className = 'control-group'; // Use existing class
    peapixCountryGroup.style.display = 'none'; // Hide initially

    const countryLabel = document.createElement('label');
    countryLabel.htmlFor = 'peapix-country-select';
    countryLabel.textContent = 'Country:';
    peapixCountryGroup.appendChild(countryLabel);

    peapixCountrySelect = document.createElement('select');
    peapixCountrySelect.id = 'peapix-country-select';
    Object.entries(peapixCountries).forEach(([code, name]) => {
        const option = document.createElement('option');
        option.value = code;
        option.textContent = name;
        peapixCountrySelect.appendChild(option);
    });
    peapixCountryGroup.appendChild(peapixCountrySelect);

    // Insert the country group after the image source group
    const imageSourceGroup = imageSourceSelect?.closest('.control-group');
    if (imageSourceGroup && imageSourceGroup.parentNode) {
        imageSourceGroup.parentNode.insertBefore(peapixCountryGroup, imageSourceGroup.nextSibling);
    } else {
        // Fallback: append to controls container if group not found
        getElement('background-controls')?.appendChild(peapixCountryGroup);
    }
    // --- End V1 Peapix Additions ---


    // Set initial category in the dropdown (only on first load)
    if (categorySelect) {
        const state = getState();
        const initialCategory = state.category || 
                              (state.background && state.background.category) || 
                              'Nature';
        console.log("Setting initial category dropdown value to:", initialCategory);
        categorySelect.value = initialCategory;
    }
    
    // Add a direct event listener to the category dropdown
    if (categorySelect) {
        console.log("Adding direct event listener to category dropdown");
        
        // Ensure the dropdown is not disabled
        categorySelect.disabled = false;
        categorySelect.readOnly = false;
        
        // Add a direct event listener
        categorySelect.onchange = function(event) {
            console.log("Direct onchange event triggered with value:", this.value);
            handleCategoryChange(event);
        };
        
        // Add focus and blur event listeners to track when the dropdown is being interacted with
        categorySelect.addEventListener('focus', function() {
            console.log("Category dropdown focused");
            this.setAttribute('data-is-focused', 'true');
        });
        
        categorySelect.addEventListener('blur', function() {
            console.log("Category dropdown blurred");
            this.removeAttribute('data-is-focused');
            
            // Get the current state category
            const state = getState();
            const stateCategory = state.category || 
                               (state.background && state.background.category) || 
                               'Nature';
            
            // If the dropdown value doesn't match the state after blur, update the state
            if (this.value !== stateCategory) {
                console.log("Category dropdown value changed after blur:", this.value);
                updateState({ category: this.value });
            }
        });
    }
    
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

    // Peapix Country select change
    if (peapixCountrySelect) {
        addEvent(peapixCountrySelect, 'change', handlePeapixCountryChange);
    }

    // Category select change
    if (categorySelect) {
        console.log("Setting up change event listener for category dropdown");
        
        // First, remove any existing event listeners to avoid duplicates
        categorySelect.removeEventListener('change', handleCategoryChange);
        
        // Add the event listener
        addEvent(categorySelect, 'change', handleCategoryChange);
        
        // Verify the event listener was added by checking if the dropdown is disabled
        console.log("Category dropdown disabled:", categorySelect.disabled);
        console.log("Category dropdown readOnly:", categorySelect.readOnly);
    } else {
        console.error("Category dropdown element not found during event setup");
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
    const imageSource = state.imageSource ||
                      (state.background && state.background.imageSource) ||
                      DEFAULT_IMAGE_SOURCE;
    if (imageSourceSelect) {
        imageSourceSelect.value = imageSource;
    }

    // Update Peapix Country Select
    if (peapixCountrySelect) {
        const countryCode = state.peapixCountry ||
                          (state.background && state.background.peapixCountry) ||
                          'us';
        peapixCountrySelect.value = countryCode;
    }

    // Show/Hide Peapix country group
    if (peapixCountryGroup) {
        if (imageSource === 'peapix') {
            showElement(peapixCountryGroup, 'flex');
        } else {
            hideElement(peapixCountryGroup);
        }
    }

    // Show/Hide Category controls (hide if Peapix)
    const showCategoryControls = imageSource !== 'peapix';
    if (categorySelect) {
        categorySelect.closest('.control-group').style.display = showCategoryControls ? 'flex' : 'none';
    }
    if (customCategoryGroup) {
        // Custom group visibility depends on category being 'Custom' AND category controls being visible
        const category = state.category || (state.background && state.background.category) || 'Nature';
        customCategoryGroup.style.display = (showCategoryControls && category === 'Custom') ? 'flex' : 'none';
    }


    // We're intentionally NOT updating the category dropdown when the background image changes
    // This allows the user to keep their selected category even when the background changes
    if (categorySelect) {
        console.log("updateBackgroundControlsFromState - NOT updating category dropdown to match state");
        console.log("updateBackgroundControlsFromState - Current dropdown value:", categorySelect.value);
        console.log("updateBackgroundControlsFromState - State category value:", state.category);
    }
    
    // Update custom category input (only if category controls are visible)
    if (customCategoryInput && showCategoryControls) {
        const customCategory = state.customCategory ||
                             (state.background && state.background.customCategory) ||
                             '';
        customCategoryInput.value = customCategory;
    }

    // Show/hide color picker (only if category is 'None' AND category controls are visible)
    const category = state.category || (state.background && state.background.category) || 'Nature';
    if (colorPickerGroup) {
        if (showCategoryControls && category === 'None') {
            showElement(colorPickerGroup, 'flex');
        } else {
            hideElement(colorPickerGroup);
        }
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

    // Immediately update UI visibility
    const showPeapix = imageSource === 'peapix';
    const showCategory = imageSource !== 'peapix';

    if (peapixCountryGroup) {
        peapixCountryGroup.style.display = showPeapix ? 'flex' : 'none';
    }
    if (categorySelect) {
        categorySelect.closest('.control-group').style.display = showCategory ? 'flex' : 'none';
    }
    if (customCategoryGroup) {
        // Hide custom group if category controls are hidden
        customCategoryGroup.style.display = showCategory ? customCategoryGroup.style.display : 'none';
    }
     if (colorPickerGroup) {
        // Hide color picker if category controls are hidden
        colorPickerGroup.style.display = showCategory ? colorPickerGroup.style.display : 'none';
    }


    // If switching TO Peapix, trigger a background fetch
    if (showPeapix) {
        console.log("Switched to Peapix, fetching new background...");
        fetchNewBackground(true); // Force fetch
    }
    // If switching AWAY from Peapix, trigger based on category (handled by handleCategoryChange if category is not 'Custom' or 'None')
    else {
        const currentCategory = getState().category || (getState().background && getState().background.category);
        if (currentCategory !== 'Custom' && currentCategory !== 'None') {
             console.log(`Switched away from Peapix to ${imageSource}, fetching new background for category ${currentCategory}...`);
             fetchNewBackground(true); // Force fetch
        }
    }


    console.log(`Image source changed to: ${imageSource}`);
}

/**
 * Handles Peapix country select change
 * @param {Event} event - The change event
 */
function handlePeapixCountryChange(event) {
    const countryCode = event.target.value;
    updateState({ peapixCountry: countryCode });
    console.log(`Peapix country changed to: ${countryCode}`);
    // Fetch new background for the selected country
    fetchNewBackground(true); // Force fetch
}


/**
 * Handles category select change
 * @param {Event} event - The change event
 */
export function handleCategoryChange(event) {
    console.log("handleCategoryChange called with value:", event.target.value);
    
    // Check if we're updating from a favorite - if so, don't trigger background changes
    if (categorySelect.hasAttribute('data-updating-from-favorite')) {
        console.log("Skipping category change handler - updating from favorite");
        return;
    }
    
    // Get the current value before changing
    const currentValue = categorySelect.value;
    console.log("Current dropdown value before change:", currentValue);
    
    const category = event.target.value;
    console.log("New category value:", category);
    
    // Store the original value as a data attribute
    if (!categorySelect.hasAttribute('data-original-value')) {
        categorySelect.setAttribute('data-original-value', currentValue);
    }
    
    // Update state
    updateState({ category });
    
    // Log after state update
    console.log("State updated with category:", category);
    console.log("Dropdown value after state update:", categorySelect.value);
    
    // Force the dropdown to keep the new value
    setTimeout(() => {
        if (categorySelect.value !== category) {
            console.log("Forcing category dropdown value to:", category);
            categorySelect.value = category;
        }
    }, 0);
    
    // Show/hide custom category input based on selection
    if (category === 'Custom' && customCategoryGroup) {
        showElement(customCategoryGroup, 'flex');
        hideElement(colorPickerGroup);
        if (customCategoryInput) {
            customCategoryInput.focus();
        }
        
        // Don't fetch a new image yet for Custom category - wait for the user to enter a custom category
        console.log("Custom category selected, waiting for user input");
    } else if (category === 'None' && colorPickerGroup) {
        hideElement(customCategoryGroup);
        showElement(colorPickerGroup, 'flex');
        
        // Apply the current background color when switching to None
        const { backgroundColor } = getState();
        setBackgroundColor(backgroundColor, false);
    } else {
        hideElement(customCategoryGroup);
        hideElement(colorPickerGroup);
        
        // Fetch a new image immediately with the new category
        console.log("Fetching new background with category:", category);
        
        // Set a flag to indicate we're in the middle of a category change
        // This will help prevent multiple background updates
        window._changingCategory = true;
        
        // Import the background module to access startBackgroundCycling
        import('../background.js').then(({ startBackgroundCycling }) => {
            // Start background cycling with the new category
            // This will handle fetching a new image
            startBackgroundCycling(true, true); // Fetch new image immediately and force new image
            
            // Clear the flag after a short delay
            setTimeout(() => {
                window._changingCategory = false;
            }, 500);
        }).catch(err => {
            console.error("Error importing background.js:", err);
            window._changingCategory = false;
        });
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
