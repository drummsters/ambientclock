/**
 * Element Position feature for the Ambient Clock application
 * Manages positioning and sizing of UI elements (clock and date)
 */

import { getState, updateState } from '../state.js';
import { getElement, updateStyle } from '../utils/dom.js';
import { POSITIONS, CUSTOM_POSITION_INDEX, MAX_SCALE, MIN_SCALE } from '../config.js';

// Window resize event handler
window.addEventListener('resize', handleWindowResize);

/**
 * Handles window resize events
 * Updates custom positions for both clock and date
 */
export function handleWindowResize() {
    const { positionIndex, datePositionIndex } = getState();
    
    // Update clock position if in custom position mode
    if (positionIndex === CUSTOM_POSITION_INDEX) {
        const clockContainer = getElement('clock-container');
        if (clockContainer) {
            applyCustomPosition('clock', clockContainer);
        }
    }
    
    // Update date position if in custom position mode
    if (datePositionIndex === CUSTOM_POSITION_INDEX) {
        const dateContainer = getElement('date-container');
        if (dateContainer) {
            applyCustomPosition('date', dateContainer);
        }
    }
}

/**
 * Updates the element position
 * @param {string} elementType - The type of element ('clock' or 'date')
 * @param {HTMLElement} container - The element container
 * @param {number} positionIndex - The index of the position to use
 */
export function updateElementPosition(elementType, container, positionIndex) {
    if (!container) return;
    
    const isClockElement = elementType === 'clock';
    const stateKey = isClockElement ? 'positionIndex' : 'datePositionIndex';
    
    // Handle custom position separately
    if (positionIndex === CUSTOM_POSITION_INDEX) {
        // Set to custom position
        const stateUpdate = {};
        stateUpdate[stateKey] = CUSTOM_POSITION_INDEX;
        updateState(stateUpdate, false, true); // Don't save immediately, skip notifying subscribers
        
        // Apply custom position styles
        container.style.position = 'absolute';
        applyCustomPosition(elementType, container);
        
        console.log(`${elementType} position changed to: custom`);
        return;
    }
    
    // For preset positions
    // Ensure position index is valid for the POSITIONS array
    const validIndex = (positionIndex + POSITIONS.length) % POSITIONS.length;
    const position = POSITIONS[validIndex];
    
    // Reset any absolute positioning
    container.style.position = 'relative';
    container.style.top = '';
    container.style.left = '';
    
    // Apply position styles
    updateStyle(container, position.style);
    
    // Update state if needed
    if (validIndex !== getState()[stateKey]) {
        const stateUpdate = {};
        stateUpdate[stateKey] = validIndex;
        updateState(stateUpdate, false, true); // Don't save immediately, skip notifying subscribers
    }
    
    console.log(`${elementType} position changed to: ${position.name}`);
}

/**
 * Apply custom position to an element container
 * @param {string} elementType - The type of element ('clock' or 'date')
 * @param {HTMLElement} container - The element container
 */
export function applyCustomPosition(elementType, container) {
    if (!container) return;
    
    const isClockElement = elementType === 'clock';
    
    // Get position from state based on element type
    const posX = isClockElement ? 'customPositionX' : 'dateCustomPositionX';
    const posY = isClockElement ? 'customPositionY' : 'dateCustomPositionY';
    
    const state = getState();
    
    // Get position values from state, checking both flat and nested structures
    let customPositionX, customPositionY;
    
    if (isClockElement) {
        customPositionX = state.customPositionX !== undefined ? state.customPositionX : 
                         (state.clock && state.clock.customPositionX !== undefined ? state.clock.customPositionX : 50);
        customPositionY = state.customPositionY !== undefined ? state.customPositionY : 
                         (state.clock && state.clock.customPositionY !== undefined ? state.clock.customPositionY : 50);
    } else {
        customPositionX = state.dateCustomPositionX !== undefined ? state.dateCustomPositionX : 
                         (state.date && state.date.dateCustomPositionX !== undefined ? state.date.dateCustomPositionX : 50);
        customPositionY = state.dateCustomPositionY !== undefined ? state.dateCustomPositionY : 
                         (state.date && state.date.dateCustomPositionY !== undefined ? state.date.dateCustomPositionY : 60);
    }
    
    // Convert percentage to pixels
    const left = (window.innerWidth * customPositionX / 100);
    const top = (window.innerHeight * customPositionY / 100);
    
    // Apply position directly without any centering adjustments
    updateStyle(container, {
        position: 'absolute',
        left: `${left}px`,
        top: `${top}px`,
        justifyContent: '',
        alignItems: ''
    });
    
    console.log(`Applied ${elementType} position: ${customPositionX}%, ${customPositionY}%`);
}

/**
 * Updates the custom position for an element
 * @param {string} elementType - The type of element ('clock' or 'date')
 * @param {number} x - The x position as a percentage of window width
 * @param {number} y - The y position as a percentage of window height
 */
export function updateCustomElementPosition(elementType, x, y) {
    const isClockElement = elementType === 'clock';
    
    // Allow negative values for both x and y to position outside viewport
    // but keep within reasonable bounds (-50 to 150)
    const clampedX = Math.max(-50, Math.min(150, x));
    const clampedY = Math.max(-50, Math.min(150, y));
    
    // Update state based on element type
    if (isClockElement) {
        updateState({
            positionIndex: CUSTOM_POSITION_INDEX,
            customPositionX: clampedX,
            customPositionY: clampedY,
            clock: {
                positionIndex: CUSTOM_POSITION_INDEX,
                customPositionX: clampedX,
                customPositionY: clampedY
            }
        }, true); // Save immediately, don't skip notifying subscribers
    } else {
        // For date, use the updateCustomDatePosition function to ensure consistency
        updateCustomDatePosition(clampedX, clampedY);
        return; // updateCustomDatePosition already applies the position
    }
    
    // Apply the new position (only for clock)
    const container = getElement('clock-container');
    if (container) {
        applyCustomPosition('clock', container);
    }
}

/**
 * Updates the element size
 * @param {string} elementType - The type of element ('clock' or 'date')
 * @param {HTMLElement} container - The element container or null
 * @param {HTMLElement} element - The element to scale or null
 * @param {number} scale - The scale factor to apply
 */
export function updateElementSize(elementType, container, element, scale) {
    // Clamp scale between MIN_SCALE and MAX_SCALE
    const clampedScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale));
    
    const isClockElement = elementType === 'clock';
    const stateKey = isClockElement ? 'scale' : 'dateScale';
    
    // Apply scale to the element
    if (element) {
        // Apply scale directly to the element for both clock and date
        updateStyle(element, {
            transform: `scale(${clampedScale})`
        });
    }
    
    // Update state if needed
    if (clampedScale !== getState()[stateKey]) {
        if (isClockElement) {
            updateState({
                scale: clampedScale,
                clock: {
                    scale: clampedScale
                }
            }, true); // Save immediately, don't skip notifying subscribers
        } else {
            updateState({
                dateScale: clampedScale,
                date: {
                    dateScale: clampedScale
                }
            }, true); // Save immediately, don't skip notifying subscribers
        }
    }
    
    console.log(`${elementType} size changed to: ${Math.round(clampedScale * 100)}%`);
}

/**
 * Increases the element size
 * @param {string} elementType - The type of element ('clock' or 'date')
 * @param {HTMLElement} container - The element container or null
 * @param {HTMLElement} element - The element to scale or null
 * @param {number} [step=0.1] - The amount to increase by
 */
export function increaseElementSize(elementType, container, element, step = 0.1) {
    const isClockElement = elementType === 'clock';
    const stateKey = isClockElement ? 'scale' : 'dateScale';
    const { [stateKey]: currentScale } = getState();
    updateElementSize(elementType, container, element, currentScale + step);
}

/**
 * Decreases the element size
 * @param {string} elementType - The type of element ('clock' or 'date')
 * @param {HTMLElement} container - The element container or null
 * @param {HTMLElement} element - The element to scale or null
 * @param {number} [step=0.1] - The amount to decrease by
 */
export function decreaseElementSize(elementType, container, element, step = 0.1) {
    const isClockElement = elementType === 'clock';
    const stateKey = isClockElement ? 'scale' : 'dateScale';
    const { [stateKey]: currentScale } = getState();
    updateElementSize(elementType, container, element, currentScale - step);
}

// Backward compatibility functions for clock
export function updateClockPosition(positionIndex) {
    const clockContainer = getElement('clock-container');
    updateElementPosition('clock', clockContainer, positionIndex);
}

export function updateCustomPosition(x, y) {
    updateCustomElementPosition('clock', x, y);
}

export function updateClockSize(scale) {
    const clockContainer = getElement('clock-container');
    const activeFace = document.querySelector('.clock-face.active');
    updateElementSize('clock', clockContainer, activeFace, scale);
}

export function increaseClockSize(step = 0.1) {
    const clockContainer = getElement('clock-container');
    const activeFace = document.querySelector('.clock-face.active');
    increaseElementSize('clock', clockContainer, activeFace, step);
}

export function decreaseClockSize(step = 0.1) {
    const clockContainer = getElement('clock-container');
    const activeFace = document.querySelector('.clock-face.active');
    decreaseElementSize('clock', clockContainer, activeFace, step);
}

// Functions for date
export function updateDatePosition(positionIndex) {
    const dateContainer = getElement('date-container');
    updateElementPosition('date', dateContainer, positionIndex);
}

export function updateCustomDatePosition(x, y) {
    // Use flat state update for date position to ensure consistency
    // Allow negative values for both x and y to position outside viewport
    // but keep within reasonable bounds (-50 to 150)
    const clampedX = Math.max(-50, Math.min(150, x));
    const clampedY = Math.max(-50, Math.min(150, y));
    
    // Update state with both flat and nested structure for date
    updateState({
        datePositionIndex: CUSTOM_POSITION_INDEX,
        dateCustomPositionX: clampedX,
        dateCustomPositionY: clampedY,
        date: {
            datePositionIndex: CUSTOM_POSITION_INDEX,
            dateCustomPositionX: clampedX,
            dateCustomPositionY: clampedY
        }
    }, true); // Save immediately, don't skip notifying subscribers
    
    // Apply the new position
    const container = getElement('date-container');
    if (container) {
        applyCustomPosition('date', container);
    }
}

export function updateDateSize(scale) {
    const dateContainer = getElement('date-container');
    const dateFace = getElement('date-face');
    
    // Update the scale directly without adjusting position
    updateElementSize('date', dateContainer, dateFace, scale);
}

export function increaseDateSize(step = 0.1) {
    const dateContainer = getElement('date-container');
    const dateFace = getElement('date-face');
    increaseElementSize('date', dateContainer, dateFace, step);
}

export function decreaseDateSize(step = 0.1) {
    const dateContainer = getElement('date-container');
    const dateFace = getElement('date-face');
    decreaseElementSize('date', dateContainer, dateFace, step);
}
