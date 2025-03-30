/**
 * Position feature for the Ambient Clock application
 * Manages clock positioning and sizing
 */

import { getState, updateState, subscribe } from '../state.js';
import { getElement, updateStyle } from '../utils/dom.js';
import { POSITIONS, CUSTOM_POSITION_INDEX, MAX_SCALE, MIN_SCALE } from '../config.js';

// DOM elements
let clockContainer;

/**
 * Initializes the position feature
 */
export function initPosition() {
    // Get DOM elements
    clockContainer = getElement('clock-container');
    
    if (!clockContainer) {
        console.error("Clock container element not found");
        return;
    }
    
    // Subscribe to state changes
    subscribe(handleStateChange);
    
    // Initial setup based on current state
    const { positionIndex, scale } = getState();
    updateClockPosition(positionIndex);
    updateClockSize(scale);
    
    // Handle window resize for custom position
    window.addEventListener('resize', handleWindowResize);
}

/**
 * Handles state changes
 * @param {Object} state - The current state
 */
function handleStateChange(state) {
    // Only update if values have changed
    const currentState = getState();
    
    // Check if clock section exists
    if (state.clock) {
        if (state.clock.positionIndex !== undefined && 
            state.clock.positionIndex !== currentState.positionIndex) {
            updateClockPosition(state.clock.positionIndex);
        }
        
        if (state.clock.scale !== undefined && 
            state.clock.scale !== currentState.scale) {
            updateClockSize(state.clock.scale);
        }
    } else {
        // Backward compatibility
        if (state.positionIndex !== undefined && 
            state.positionIndex !== currentState.positionIndex) {
            updateClockPosition(state.positionIndex);
        }
        
        if (state.scale !== undefined && 
            state.scale !== currentState.scale) {
            updateClockSize(state.scale);
        }
    }
}

/**
 * Handles window resize events
 */
function handleWindowResize() {
    const { positionIndex } = getState();
    if (positionIndex === CUSTOM_POSITION_INDEX) {
        applyCustomPosition();
    }
}

/**
 * Updates the clock position
 * @param {number} positionIndex - The index of the position to use
 */
export function updateClockPosition(positionIndex) {
    if (!clockContainer) return;
    
    // Handle custom position separately
    if (positionIndex === CUSTOM_POSITION_INDEX) {
        // Set to custom position
        updateState({
            clock: {
                positionIndex: CUSTOM_POSITION_INDEX
            }
        });
        
        // Apply custom position styles
        clockContainer.style.position = 'absolute';
        applyCustomPosition();
        
        console.log('Clock position changed to: custom');
        return;
    }
    
    // For preset positions
    // Ensure position index is valid for the POSITIONS array
    const validIndex = (positionIndex + POSITIONS.length) % POSITIONS.length;
    const position = POSITIONS[validIndex];
    
    // Reset any absolute positioning
    clockContainer.style.position = 'relative';
    clockContainer.style.top = '';
    clockContainer.style.left = '';
    
    // Apply position styles
    updateStyle(clockContainer, position.style);
    
    // Update state if needed
    if (validIndex !== getState().positionIndex) {
        updateState({
            clock: {
                positionIndex: validIndex
            }
        });
    }
    
    console.log(`Clock position changed to: ${position.name}`);
}

/**
 * Apply custom position to the clock container
 */
function applyCustomPosition() {
    if (!clockContainer) return;
    
    const state = getState();
    let customPositionX, customPositionY;
    
    // Check if clock section exists
    if (state.clock && state.clock.customPositionX !== undefined && state.clock.customPositionY !== undefined) {
        customPositionX = state.clock.customPositionX;
        customPositionY = state.clock.customPositionY;
    } else {
        // Backward compatibility
        customPositionX = state.customPositionX;
        customPositionY = state.customPositionY;
    }
    
    // Convert percentage to pixels
    const left = (window.innerWidth * customPositionX / 100);
    const top = (window.innerHeight * customPositionY / 100);
    
    updateStyle(clockContainer, {
        position: 'absolute',
        left: `${left}px`,
        top: `${top}px`,
        justifyContent: '',
        alignItems: ''
    });
}

/**
 * Updates the custom position
 * @param {number} x - The x position as a percentage of window width
 * @param {number} y - The y position as a percentage of window height
 */
export function updateCustomPosition(x, y) {
    // Allow negative values for both x and y to position outside viewport
    // but keep within reasonable bounds (-50 to 150)
    const clampedX = Math.max(-50, Math.min(150, x));
    const clampedY = Math.max(-50, Math.min(150, y));
    
    // Update state using the new structure
    updateState({
        clock: {
            positionIndex: CUSTOM_POSITION_INDEX,
            customPositionX: clampedX,
            customPositionY: clampedY
        }
    });
    
    // Apply the new position
    applyCustomPosition();
}

/**
 * Updates the clock size
 * @param {number} scale - The scale factor to apply
 */
export function updateClockSize(scale) {
    if (!clockContainer) return;
    
    // Clamp scale between MIN_SCALE and MAX_SCALE
    const clampedScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale));
    
    // Apply scale to active clock face
    const activeFace = document.querySelector('.clock-face.active');
    if (activeFace) {
        updateStyle(activeFace, {
            transform: `scale(${clampedScale})`
        });
    }
    
    // Update state if needed
    if (clampedScale !== getState().scale) {
        updateState({
            clock: {
                scale: clampedScale
            }
        });
    }
    
    console.log(`Clock size changed to: ${Math.round(clampedScale * 100)}%`);
}

/**
 * Cycles to the next position
 */
export function cycleToNextPosition() {
    const { positionIndex } = getState();
    updateClockPosition(positionIndex + 1);
}

/**
 * Cycles to the previous position
 */
export function cycleToPreviousPosition() {
    const { positionIndex } = getState();
    updateClockPosition(positionIndex - 1);
}

/**
 * Increases the clock size
 * @param {number} [step=0.1] - The amount to increase by
 */
export function increaseClockSize(step = 0.1) {
    const { scale } = getState();
    updateClockSize(scale + step);
}

/**
 * Decreases the clock size
 * @param {number} [step=0.1] - The amount to decrease by
 */
export function decreaseClockSize(step = 0.1) {
    const { scale } = getState();
    updateClockSize(scale - step);
}
