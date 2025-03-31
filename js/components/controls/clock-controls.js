/**
 * Clock Controls Module
 * Handles all clock-related controls in the Ambient Clock application
 */

import { getState, updateState } from '../../state.js';
import { getElement, showElement, hideElement, addEvent } from '../../utils/dom.js';
import { setClockFace, updateClockOpacity } from '../clock-manager.js';
import { DEFAULT_CLOCK_OPACITY } from '../../config.js';

// DOM elements
let clockFaceSelect;
let clockOpacitySlider;
let clockScaleSlider;
let cleanClockColorGroup;
let cleanClockColorInput;
let fontSelect;
let boldCheckbox;

/**
 * Initialize clock controls
 */
export function initClockControls() {
    // Get DOM elements
    clockFaceSelect = getElement('clockface-select');
    clockOpacitySlider = getElement('clock-opacity-slider');
    clockScaleSlider = getElement('clock-scale-slider');
    cleanClockColorGroup = getElement('clean-clock-color-group');
    cleanClockColorInput = getElement('clean-clock-color');
    fontSelect = getElement('font-select');
    boldCheckbox = getElement('font-bold');
    
    // Set up event listeners
    setupEventListeners();
}

/**
 * Set up event listeners for clock controls
 */
function setupEventListeners() {
    // Clock face select change
    if (clockFaceSelect) {
        addEvent(clockFaceSelect, 'change', handleClockFaceChange);
    }
    
    // Clock opacity slider change
    if (clockOpacitySlider) {
        addEvent(clockOpacitySlider, 'input', function(event) {
            updateClockOpacity(parseFloat(event.target.value));
        });
    }
    
    // Clock scale slider change
    if (clockScaleSlider) {
        addEvent(clockScaleSlider, 'input', function(event) {
            const scale = parseFloat(event.target.value);
            console.log("Clock scale slider value:", scale);
            
            // Import the updateClockSize function from element-position.js
            import('../../features/element-position.js').then(({ updateClockSize }) => {
                updateClockSize(scale);
            });
        });
    }
    
    // Clean clock color input change
    if (cleanClockColorInput) {
        addEvent(cleanClockColorInput, 'input', handleCleanClockColorChange);
    }
    
    // Font select change
    if (fontSelect) {
        addEvent(fontSelect, 'change', handleFontChange);
    }
    
    // Bold checkbox change
    if (boldCheckbox) {
        addEvent(boldCheckbox, 'change', handleBoldChange);
    }
}

/**
 * Update clock controls based on current state
 */
export function updateClockControlsFromState() {
    const state = getState();
    
    // Update clock face select
    if (clockFaceSelect) {
        const clockFace = state.clockFace || 
                        (state.clock && state.clock.clockFace) || 
                        'clean-clock';
        clockFaceSelect.value = clockFace;
    }
    
    // Update clock opacity slider
    if (clockOpacitySlider) {
        const clockOpacity = state.clockOpacity || 
                           (state.clock && state.clock.clockOpacity) || 
                           DEFAULT_CLOCK_OPACITY;
        clockOpacitySlider.value = clockOpacity;
    }
    
    // Update clock scale slider
    if (clockScaleSlider) {
        const clockScale = state.scale || 
                         (state.clock && state.clock.scale) || 
                         1.4;
        clockScaleSlider.value = clockScale;
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
 * Handles font select change
 * @param {Event} event - The change event
 */
function handleFontChange(event) {
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
}

/**
 * Handles bold checkbox change
 * @param {Event} event - The change event
 */
function handleBoldChange(event) {
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
}

/**
 * Populate font select with available fonts
 */
export function populateFontSelect() {
    if (!fontSelect) return;
    
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
