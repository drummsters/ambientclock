/**
 * Controls component for the Ambient Clock application
 * Manages the control panel and user interactions
 */

import { getState, updateState, subscribe, resetSettings } from '../state.js';
import { getElement, updateStyle, showElement, hideElement, addEvent } from '../utils/dom.js';
import { 
    CONTROLS_HIDE_DELAY, 
    DEFAULT_IMAGE_SOURCE, 
    DEFAULT_BACKGROUND_COLOR, 
    DEFAULT_OVERLAY_OPACITY, 
    DEFAULT_CLOCK_OPACITY,
    DEFAULT_ZOOM_ENABLED,
    CUSTOM_POSITION_INDEX
} from '../config.js';
import { VisibilityManager } from '../utils/visibility.js';
import { setClockFace, updateClockOpacity } from './clock-manager.js';
import { updateOverlayOpacity, setBackgroundColor, fetchNewBackground, startBackgroundCycling, updateZoomEffect } from './background.js';
import { setEffect } from '../features/effects.js';
import { updateDonateWidgetVisibility } from './donate.js';
import { resetDatePosition } from './date-manager.js';

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
let dateDisplayCheckbox;
let dateFormatSelect;
let dateColorInput;
let dateOpacitySlider;
let cleanClockColorGroup;
let cleanClockColorInput;

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
    dateDisplayCheckbox = getElement('date-display-checkbox');
    dateFormatSelect = getElement('date-format-select');
    dateColorInput = getElement('date-color');
    dateOpacitySlider = getElement('date-opacity-slider');
    cleanClockColorGroup = getElement('clean-clock-color-group');
    cleanClockColorInput = getElement('clean-clock-color');
    
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
    // Don't force hide if mouse is over the controls
    setTimeout(() => {
        if (controlsVisibility) {
            controlsVisibility.startHideTimer(false);
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
        addEvent(dateOpacitySlider, 'input', function(event) {
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
        });
    }
    
    // Clean clock color input change
    if (cleanClockColorInput) {
        addEvent(cleanClockColorInput, 'input', handleCleanClockColorChange);
    }
    
    // Effect select change
    if (effectSelect) {
        addEvent(effectSelect, 'change', handleEffectChange);
    }
    
    // Clock opacity slider change
    if (clockOpacitySlider) {
        addEvent(clockOpacitySlider, 'input', function(event) {
            updateClockOpacity(parseFloat(event.target.value));
        });
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
    
    // Font select change
    if (fontSelect) {
        addEvent(fontSelect, 'change', function(event) {
            const fontFamily = event.target.value;
            updateState({
                global: {
                    fontFamily: fontFamily
                }
            });
            
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
        });
        
        // Add new font options
        const fonts = [
            "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif", // Default font should be first
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
        
        // Get the default font from state
        const state = getState();
        const defaultFont = state.fontFamily || 
                          (state.global && state.global.fontFamily) || 
                          "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
        
        // Add font options
        fonts.forEach(font => {
            const option = document.createElement('option');
            option.value = font;
            option.textContent = font.split(',')[0].replace(/'/g, '');
            
            // Set selected attribute if this is the default font
            if (font === defaultFont) {
                option.selected = true;
            }
            
            fontSelect.appendChild(option);
        });
        
        console.log("Font select populated with default:", defaultFont);
    }

    // Bold checkbox change
    if (boldCheckbox) {
        addEvent(boldCheckbox, 'change', function(event) {
            const isBold = event.target.checked;
            console.log("Bold checkbox changed to:", isBold);
            
            // Update all clock elements directly without going through state
            document.querySelectorAll('.clock-face').forEach(clock => {
                clock.style.fontWeight = isBold ? 'bold' : 'normal';
            });
            
            // Update state with skipNotify=true to prevent triggering other components
            updateState({
                global: {
                    fontBold: isBold
                }
            }, false, true);
        });
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
        addEvent(showSecondsCheckbox, 'change', function(event) {
            const showSeconds = event.target.checked;
            
            // Save the current date position and opacity before updating state
            const state = getState();
            const datePositionIndex = state.datePositionIndex || (state.date && state.date.datePositionIndex) || 0;
            const dateCustomPositionX = state.dateCustomPositionX || (state.date && state.date.dateCustomPositionX) || 50;
            const dateCustomPositionY = state.dateCustomPositionY || (state.date && state.date.dateCustomPositionY) || 60;
            const dateOpacity = state.dateOpacity || (state.date && state.date.dateOpacity) || 1.0;
            
            // Update state with new value
            updateState({
                global: {
                    showSeconds: showSeconds
                }
            }, true); // Save immediately to prevent any race conditions
            
            // Import clock manager functions
            import('./clock-manager.js').then(({ stopClockUpdates, startClockUpdates, updateAllClocks }) => {
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
                        console.log(`Restored date position after seconds toggle: ${dateCustomPositionX}%, ${dateCustomPositionY}%`);
                    }
                }
            });
        });
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
    
    // Start the auto-hide timer when mouse leaves, but don't force hide
    // This allows the controls to remain visible if the mouse re-enters
    if (controlsVisibility) {
        controlsVisibility.isHovering = false;
        controlsVisibility.startHideTimer(false);
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
    
    // Update clock face select
    if (clockFaceSelect) {
        const clockFace = state.clockFace || 
                        (state.clock && state.clock.clockFace) || 
                        'clean-clock';
        clockFaceSelect.value = clockFace;
    }
    
    // Update effect select
    if (effectSelect) {
        const effect = state.effect || 
                     (state.global && state.global.effect) || 
                     'raised';
        effectSelect.value = effect;
    }
    
    // Update clock opacity slider
    if (clockOpacitySlider) {
        const clockOpacity = state.clockOpacity || 
                           (state.clock && state.clock.clockOpacity) || 
                           DEFAULT_CLOCK_OPACITY;
        clockOpacitySlider.value = clockOpacity;
    }
    
    // Update background opacity slider
    if (backgroundOpacitySlider) {
        const overlayOpacity = state.overlayOpacity || 
                             (state.background && state.background.overlayOpacity) || 
                             DEFAULT_OVERLAY_OPACITY;
        backgroundOpacitySlider.value = overlayOpacity;
    }
    
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
    
    // Update time format select
    if (timeFormatSelect) {
        const timeFormat = state.timeFormat || 
                         (state.global && state.global.timeFormat) || 
                         '24';
        timeFormatSelect.value = timeFormat;
    }
    
    // Update font select
    if (fontSelect) {
        const fontFamily = state.fontFamily || 
                         (state.global && state.global.fontFamily) || 
                         "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
        fontSelect.value = fontFamily;
    }
    
    // Update bold checkbox
    if (boldCheckbox) {
        const fontBold = state.fontBold || 
                       (state.global && state.global.fontBold) || 
                       true; // Default to true to match CSS default
        boldCheckbox.checked = fontBold;
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
    
    // Update date container visibility
    const dateContainer = getElement('date-container');
    if (dateContainer) {
        const showDate = state.showDate || 
                       (state.date && state.date.showDate) || 
                       false;
        dateContainer.style.display = showDate ? 'block' : 'none';
    }
    
    // Update clean clock color input and show/hide based on clock face
    if (cleanClockColorInput) {
        const cleanClockColor = state.cleanClockColor || 
                              (state.clock && state.clock.cleanClockColor) || 
                              '#FFFFFF';
        cleanClockColorInput.value = cleanClockColor;
        
        // Show/hide clean clock color input based on clock face
        const clockFace = state.clockFace || 
                        (state.clock && state.clock.clockFace) || 
                        'clean-clock';
        if (clockFace === 'clean-clock' && cleanClockColorGroup) {
            showElement(cleanClockColorGroup, 'flex');
        } else if (cleanClockColorGroup) {
            hideElement(cleanClockColorGroup);
        }
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
 * Handles clock face select change
 * @param {Event} event - The change event
 */
function handleClockFaceChange(event) {
    const clockFace = event.target.value;
    setClockFace(clockFace);
    
    // Show/hide clean clock color input based on selection
    if (clockFace === 'clean-clock' && cleanClockColorGroup) {
        showElement(cleanClockColorGroup, 'flex');
    } else if (cleanClockColorGroup) {
        hideElement(cleanClockColorGroup);
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
 * Handles clean clock color input change
 * @param {Event} event - The input event
 */
function handleCleanClockColorChange(event) {
    const cleanClockColor = event.target.value;
    
    // Update state
    updateState({ cleanClockColor });
    
    // Update clean clock color
    const cleanClock = getElement('clean-clock');
    if (cleanClock) {
        cleanClock.style.color = cleanClockColor;
    }
    
    console.log(`Clean clock color changed to: ${cleanClockColor}`);
}

/**
 * Handles effect select change
 * @param {Event} event - The change event
 */
function handleEffectChange(event) {
    setEffect(event.target.value);
}

// This function is already defined above, so we're removing the duplicate

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
        console.log("Resetting all settings to defaults");
        
        // Import the clearLocalStorage function from debug.js and position functions
        Promise.all([
            import('../utils/debug.js'),
            import('../features/position.js')
        ]).then(([debugModule, positionModule]) => {
            const { clearLocalStorage } = debugModule;
            const { updateClockPosition, updateClockSize } = positionModule;
            
            // Clear localStorage and reset settings to defaults
            clearLocalStorage();
            
            // Get the default state from state.js
            const defaultState = {
                // Background settings
                background: {
                    category: 'Nature',
                    customCategory: '',
                    backgroundColor: DEFAULT_BACKGROUND_COLOR,
                    overlayOpacity: DEFAULT_OVERLAY_OPACITY,
                    backgroundImageUrl: null,
                    imageSource: DEFAULT_IMAGE_SOURCE,
                    zoomEnabled: DEFAULT_ZOOM_ENABLED
                },
                
                // Global settings
                global: {
                    effect: 'raised',
                    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
                    timeFormat: '12',
                    showSeconds: true,
                    fontBold: true
                },
                
                // Clock settings
                clock: {
                    clockFace: 'clean-clock',
                    clockOpacity: DEFAULT_CLOCK_OPACITY,
                    positionIndex: 0, // Default to middle position
                    scale: 1.0, // Default scale
                    customPositionX: 50,
                    customPositionY: 50,
                    cleanClockColor: '#FFFFFF'
                },
                
                // Date settings
                date: {
                    showDate: false,
                    dateFormat: 'MM/DD/YYYY',
                    dateColor: '#FFFFFF',
                    dateScale: 1.0,
                    dateOpacity: 1.0,
                    datePositionIndex: 0,
                    dateCustomPositionX: 50,
                    dateCustomPositionY: 60
                }
            };
            
            // Manually trigger all control events to ensure visual elements are updated
            
            // Update clock face
            if (clockFaceSelect) {
                const defaultClockFace = defaultState.clock.clockFace;
                clockFaceSelect.value = defaultClockFace;
                setClockFace(defaultClockFace);
                
                // Show/hide clean clock color input based on selection
                if (defaultClockFace === 'clean-clock' && cleanClockColorGroup) {
                    showElement(cleanClockColorGroup, 'flex');
                } else if (cleanClockColorGroup) {
                    hideElement(cleanClockColorGroup);
                }
            }
            
            // Update effect
            if (effectSelect) {
                const defaultEffect = defaultState.global.effect;
                effectSelect.value = defaultEffect;
                setEffect(defaultEffect);
            }
            
            // Update category
            if (categorySelect) {
                const defaultCategory = defaultState.background.category;
                categorySelect.value = defaultCategory;
                
                // Show/hide custom category input based on selection
                if (customCategoryGroup) hideElement(customCategoryGroup);
                if (colorPickerGroup) hideElement(colorPickerGroup);
                
                // Fetch new background image
                startBackgroundCycling(true, true);
            }
            
            // Update background color
            if (backgroundColorInput) {
                backgroundColorInput.value = defaultState.background.backgroundColor;
            }
            
            // Update clock opacity
            if (clockOpacitySlider) {
                clockOpacitySlider.value = defaultState.clock.clockOpacity;
                updateClockOpacity(defaultState.clock.clockOpacity);
            }
            
            // Update background overlay opacity
            if (backgroundOpacitySlider) {
                backgroundOpacitySlider.value = defaultState.background.overlayOpacity;
                updateOverlayOpacity(defaultState.background.overlayOpacity);
            }
            
            // Update zoom effect
            if (zoomEffectCheckbox) {
                zoomEffectCheckbox.checked = defaultState.background.zoomEnabled;
                updateZoomEffect(defaultState.background.zoomEnabled);
            }
            
            // Update font select dropdown
            if (fontSelect) {
                const defaultFont = defaultState.global.fontFamily;
                fontSelect.value = defaultFont;
                
                // Apply the font to all clock elements
                document.querySelectorAll('.clock-face').forEach(clock => {
                    clock.style.fontFamily = defaultFont;
                });
                
                // Update CSS variable for broader component styling
                document.documentElement.style.setProperty('--clean-clock-font', defaultFont);
            }
            
            // Update bold checkbox
            if (boldCheckbox) {
                boldCheckbox.checked = defaultState.global.fontBold;
                
                // Update all clock elements
                document.querySelectorAll('.clock-face').forEach(clock => {
                    clock.style.fontWeight = defaultState.global.fontBold ? 'bold' : 'normal';
                });
            }
            
            // Update time format select
            if (timeFormatSelect) {
                timeFormatSelect.value = defaultState.global.timeFormat;
            }
            
            // Update show seconds checkbox
            if (showSecondsCheckbox) {
                showSecondsCheckbox.checked = defaultState.global.showSeconds;
                
                // Import clock manager functions to update seconds display
                import('./clock-manager.js').then(({ stopClockUpdates, startClockUpdates, updateAllClocks }) => {
                    // First, stop any existing clock updates
                    stopClockUpdates();
                    
                    // Show seconds elements
                    const cleanSeconds = getElement('clean-seconds');
                    if (cleanSeconds) {
                        const colonAfterMinutes = cleanSeconds.previousSibling;
                        cleanSeconds.style.display = '';
                        if (colonAfterMinutes) colonAfterMinutes.textContent = ':';
                    }
                    
                    const analogSecond = getElement('analog-second');
                    if (analogSecond) {
                        analogSecond.style.display = '';
                    }
                    
                    const ledSeconds = getElement('led-seconds');
                    if (ledSeconds) {
                        const secondsColon = document.querySelectorAll('.led-colon')[1];
                        ledSeconds.style.display = '';
                        if (secondsColon) secondsColon.style.display = '';
                    }
                    
                    // Force an immediate update of all clocks
                    updateAllClocks(true);
                    
                    // Restart the clock updates
                    startClockUpdates();
                });
            }
            
            // Update date display checkbox
            if (dateDisplayCheckbox) {
                dateDisplayCheckbox.checked = defaultState.date.showDate;
                
                // Update date container visibility
                const dateContainer = getElement('date-container');
                if (dateContainer) {
                    dateContainer.style.display = defaultState.date.showDate ? 'block' : 'none';
                }
                
                // Disable date format select
                if (dateFormatSelect) {
                    dateFormatSelect.disabled = !defaultState.date.showDate;
                }
            }
            
            // Update date format select
            if (dateFormatSelect) {
                dateFormatSelect.value = defaultState.date.dateFormat;
            }
            
            // Update date color input
            if (dateColorInput) {
                dateColorInput.value = defaultState.date.dateColor;
                
                // Update date container color
                const dateContainer = getElement('date-container');
                if (dateContainer) {
                    dateContainer.style.color = defaultState.date.dateColor;
                }
            }
            
            // Update date opacity slider
            if (dateOpacitySlider) {
                dateOpacitySlider.value = defaultState.date.dateOpacity;
                
                // Update date container opacity
                const dateContainer = getElement('date-container');
                if (dateContainer) {
                    dateContainer.style.opacity = defaultState.date.dateOpacity;
                }
            }
            
            // Update clean clock color input
            if (cleanClockColorInput) {
                cleanClockColorInput.value = defaultState.clock.cleanClockColor;
                
                // Update clean clock color
                const cleanClock = getElement('clean-clock');
                if (cleanClock) {
                    cleanClock.style.color = defaultState.clock.cleanClockColor;
                }
            }
            
            // Reset clock position and size
            updateClockPosition(defaultState.clock.positionIndex);
            updateClockSize(defaultState.clock.scale);
            
            // Update the UI with default values
            updateControlsFromState();
            
            console.log("Settings reset to defaults successfully");
        }).catch(error => {
            console.error("Error resetting settings:", error);
        });
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
