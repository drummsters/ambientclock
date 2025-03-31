/**
 * Date Manager component for the Ambient Clock application
 * Manages the date display and its interactions
 */

import { getState, updateState, subscribe } from '../state.js';
import { getElement } from '../utils/dom.js';
import { getCurrentDate, formatDate } from '../utils/time.js';
import { updateDateSize, updateCustomDatePosition } from '../features/element-position.js';
import { SCALE_STEP, MIN_SCALE, MAX_SCALE, CUSTOM_POSITION_INDEX } from '../config.js';

// DOM elements
let dateContainer;
let dateFace;

/**
 * Initializes the date manager
 */
export function initDateManager() {
    // Get DOM elements
    dateContainer = getElement('date-container');
    dateFace = getElement('date-face');
    
    if (!dateContainer || !dateFace) {
        console.error("Date elements not found");
        return;
    }
    
    // Initialize date container
    initDateContainer();
    
    // Subscribe to state changes
    subscribe(handleStateChange);
    
    // Initial setup based on current state
    const state = getState();
    const showDate = state.showDate || (state.date && state.date.showDate) || false;
    const dateColor = state.dateColor || (state.date && state.date.dateColor) || '#FFFFFF';
    
    // Initialize date display
    dateContainer.style.display = showDate ? 'block' : 'none';
    dateFace.style.color = dateColor;
    
    // Initial update
    updateDateDisplay();
    
    console.log("Date manager initialized");
}

/**
 * Initializes the date container
 */
function initDateContainer() {
    if (!dateContainer || !dateFace) {
        console.error("Date elements not found");
        return;
    }
    
    const state = getState();
    
    // Set initial styles for date face
    const fontFamily = state.fontFamily || (state.global && state.global.fontFamily) || "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
    const dateColor = state.dateColor || (state.date && state.date.dateColor) || '#FFFFFF';
    
    dateFace.style.fontFamily = fontFamily;
    dateFace.style.color = dateColor;
    
    // Set position styles
    dateContainer.style.position = 'absolute';
    
    // Get position from state or use default
    const datePositionIndex = state.datePositionIndex || (state.date && state.date.datePositionIndex) || 0;
    const dateCustomPositionX = state.dateCustomPositionX || (state.date && state.date.dateCustomPositionX);
    const dateCustomPositionY = state.dateCustomPositionY || (state.date && state.date.dateCustomPositionY);
    
    // Set position based on state
    if (datePositionIndex === CUSTOM_POSITION_INDEX && 
        dateCustomPositionX !== undefined && dateCustomPositionY !== undefined) {
        // Apply position using percentages directly for responsive positioning
        dateContainer.style.left = `${dateCustomPositionX}%`;
        dateContainer.style.top = `${dateCustomPositionY}%`;
        
        console.log(`Applied custom date position: ${dateCustomPositionX}%, ${dateCustomPositionY}%`);
    } else {
        // Default position in the center of the screen
        // Apply default position using percentages
        dateContainer.style.left = `50%`;
        dateContainer.style.top = `60%`;
        
        // Update state with default position
        updateState({
            datePositionIndex: 0,
            dateCustomPositionX: 50,
            dateCustomPositionY: 60,
            date: {
                datePositionIndex: 0,
                dateCustomPositionX: 50,
                dateCustomPositionY: 60
            }
        }, true);
    }
    
    // Apply the same effect as the clock
    const effect = state.effect || (state.global && state.global.effect);
    if (effect) {
        // Add effect class without removing other classes
        dateContainer.classList.add(`effect-${effect}`);
    }
    
    // Set initial opacity - Ensure we're getting the correct value from state
    // First check the nested structure, then the flat structure
    const dateOpacity = state.date?.dateOpacity !== undefined ? 
                        state.date.dateOpacity : 
                        (state.dateOpacity !== undefined ? state.dateOpacity : 1.0);
    
    // Apply opacity directly to the date face (not the container)
    dateFace.style.opacity = dateOpacity;
    console.log(`Applied date opacity in initDateContainer: ${dateOpacity}`);
    
    // Ensure the opacity is saved in both state structures
    if (state.date?.dateOpacity === undefined && state.dateOpacity !== undefined) {
        // If only in flat structure, add to nested
        updateState({
            date: {
                dateOpacity: state.dateOpacity
            }
        }, true);
    } else if (state.date?.dateOpacity !== undefined && state.dateOpacity === undefined) {
        // If only in nested structure, add to flat
        updateState({
            dateOpacity: state.date.dateOpacity
        }, true);
    } else if (state.date?.dateOpacity === undefined && state.dateOpacity === undefined) {
        // If not in either structure, set default
        updateState({
            dateOpacity: 1.0,
            date: {
                dateOpacity: 1.0
            }
        }, true);
    }
    
    // Set initial scale and handle transform
    // Ensure the date has a default scale of 1.0 if not already set
    const dateScale = state.dateScale || (state.date && state.date.dateScale);
    if (dateScale === undefined) {
        updateState({
            dateScale: 1.0,
            date: {
                dateScale: 1.0
            }
        }, true); // Save immediately, don't skip notifying subscribers
    } else {
        // Ensure scale is in both state structures
        updateState({
            dateScale: dateScale,
            date: {
                dateScale: dateScale
            }
        }, true);
    }
    
    // Apply transform to the date face
    applyDateTransform();
    
    // Add wheel event listener for resizing
    setupWheelListener();
}

/**
 * Sets up wheel event listener for resizing the date
 */
function setupWheelListener() {
    if (!dateContainer) return;
    
    // Add wheel event listener with passive: false to allow preventDefault
    dateContainer.addEventListener('wheel', handleWheel, { passive: false });
    
    console.log("Date wheel event listener added");
}

/**
 * Handles wheel events for the date container
 * @param {WheelEvent} event - The wheel event
 */
function handleWheel(event) {
    // Import the wheel handler dynamically to avoid circular dependencies
    import('../utils/wheel.js').then(({ handleWheelEvent }) => {
        // Get shift key state from the event
        const isShiftPressed = event.shiftKey;
        
        // Use the centralized wheel event handler
        handleWheelEvent(event, isShiftPressed);
    });
}

/**
 * Applies the appropriate transform to the date face based on position and scale
 */
export function applyDateTransform() {
    if (!dateContainer || !dateFace) return;
    
    const state = getState();
    const dateScale = state.dateScale || (state.date && state.date.dateScale) || 1.0;
    
    // Apply scale transform only to the date face
    dateFace.style.transform = `scale(${dateScale})`;
    
    // Ensure the transform origin is set to center
    dateFace.style.transformOrigin = 'center center';
}

/**
 * Adjusts the date scale
 * @param {boolean} increase - Whether to increase or decrease the scale
 */
export function adjustDateScale(increase) {
    if (!dateContainer) return;
    
    const state = getState();
    const currentScale = state.dateScale || (state.date && state.date.dateScale) || 1.0;
    
    if (increase) {
        updateDateSize(currentScale + SCALE_STEP);
    } else {
        updateDateSize(currentScale - SCALE_STEP);
    }
    
    // Apply transform to ensure proper positioning
    applyDateTransform();
}

/**
 * Handles state changes
 * @param {Object} state - The current state
 */
function handleStateChange(state) {
    // Check if showDate is explicitly defined in state
    let newShowDate;
    if (state.showDate !== undefined) {
        newShowDate = state.showDate;
    } else if (state.date && state.date.showDate !== undefined) {
        newShowDate = state.date.showDate;
    } else {
        newShowDate = null; // No change
    }
    
    // Get current showDate value
    const currentState = getState();
    let currentShowDate;
    if (currentState.showDate !== undefined) {
        currentShowDate = currentState.showDate;
    } else if (currentState.date && currentState.date.showDate !== undefined) {
        currentShowDate = currentState.date.showDate;
    } else {
        currentShowDate = false; // Default value
    }
    
    // Update date display if visibility changed
    if (newShowDate !== null && newShowDate !== currentShowDate) {
        if (dateContainer) {
            dateContainer.style.display = newShowDate ? 'block' : 'none';
        }
    }
    
    // Update date format if changed
    if (state.dateFormat !== getState().dateFormat && state.showDate) {
        updateDateDisplay();
    }
    
    // Update date color if changed
    if (state.dateColor !== getState().dateColor && dateFace) {
        dateFace.style.color = state.dateColor || '#FFFFFF';
    }
    
    // Update date scale if changed
    if (state.dateScale !== getState().dateScale && dateContainer) {
        applyDateTransform();
    }
    
    // Update date opacity if changed
    if ((state.dateOpacity !== undefined && state.dateOpacity !== getState().dateOpacity) || 
        (state.date && state.date.dateOpacity !== undefined && 
         state.date.dateOpacity !== (getState().date && getState().date.dateOpacity))) {
        const newOpacity = state.dateOpacity || (state.date && state.date.dateOpacity);
        if (newOpacity !== undefined && dateFace) {
            // Apply opacity to the date face (not the container)
            dateFace.style.opacity = newOpacity;
            console.log(`Updated date opacity to: ${newOpacity}`);
            
            // Ensure opacity is in both state structures
            updateState({
                dateOpacity: newOpacity,
                date: {
                    dateOpacity: newOpacity
                }
            }, true);
        }
    }
    
    // Update date position if changed
    if ((state.dateCustomPositionX !== getState().dateCustomPositionX || 
         state.dateCustomPositionY !== getState().dateCustomPositionY) && 
        dateContainer) {
        // Apply position using percentages directly for responsive positioning
        dateContainer.style.left = `${state.dateCustomPositionX}%`;
        dateContainer.style.top = `${state.dateCustomPositionY}%`;
        console.log(`Updated date position to: ${state.dateCustomPositionX}%, ${state.dateCustomPositionY}%`);
        
        // Ensure position is in both state structures
        updateState({
            dateCustomPositionX: state.dateCustomPositionX,
            dateCustomPositionY: state.dateCustomPositionY,
            date: {
                dateCustomPositionX: state.dateCustomPositionX,
                dateCustomPositionY: state.dateCustomPositionY
            }
        }, true);
        
        applyDateTransform();
    }
}

/**
 * Updates the date display
 */
export function updateDateDisplay() {
    if (!dateContainer || !dateFace) {
        dateContainer = getElement('date-container');
        dateFace = getElement('date-face');
        if (!dateContainer || !dateFace) {
            console.error("Date elements not found in updateDateDisplay");
            return;
        }
    }
    
    const state = getState();
    
    // Check if showDate is explicitly defined in state
    let showDate;
    if (state.showDate !== undefined) {
        showDate = state.showDate;
    } else if (state.date && state.date.showDate !== undefined) {
        showDate = state.date.showDate;
    } else {
        showDate = false; // Default value if not specified
    }
    
    const dateFormat = state.dateFormat || (state.date && state.date.dateFormat) || 'MM/DD/YYYY';
    
    // Update visibility
    dateContainer.style.display = showDate ? 'block' : 'none';
    
    if (showDate) {
        const date = getCurrentDate();
        const formattedDate = formatDate(date, dateFormat);
        dateFace.textContent = formattedDate;
        
        // Ensure the date has the correct styles
        const dateColor = state.dateColor || (state.date && state.date.dateColor) || '#FFFFFF';
        
        // Get opacity from state - prioritize nested structure, then flat structure
        const dateOpacity = state.date?.dateOpacity !== undefined ? 
                           state.date.dateOpacity : 
                           (state.dateOpacity !== undefined ? state.dateOpacity : 1.0);
        
        const datePositionIndex = state.datePositionIndex || (state.date && state.date.datePositionIndex) || 0;
        const dateCustomPositionX = state.dateCustomPositionX || (state.date && state.date.dateCustomPositionX);
        const dateCustomPositionY = state.dateCustomPositionY || (state.date && state.date.dateCustomPositionY);
        
        // Apply color
        dateFace.style.color = dateColor;
        
        // Apply opacity directly to the date face (not the container)
        dateFace.style.opacity = dateOpacity;
        console.log(`Applied date opacity in updateDateDisplay: ${dateOpacity}`);
        
        // Apply transform
        applyDateTransform();
        
        // Apply position
        if (datePositionIndex === CUSTOM_POSITION_INDEX && 
            dateCustomPositionX !== undefined && dateCustomPositionY !== undefined) {
            // Apply position using percentages directly for responsive positioning
            dateContainer.style.left = `${dateCustomPositionX}%`;
            dateContainer.style.top = `${dateCustomPositionY}%`;
            console.log(`Applied date position in updateDateDisplay: ${dateCustomPositionX}%, ${dateCustomPositionY}%`);
        } else if (datePositionIndex !== CUSTOM_POSITION_INDEX) {
            // Check if date position is valid (within viewport)
            if (dateCustomPositionX > 100 || dateCustomPositionY > 100 || 
                dateCustomPositionX < 0 || dateCustomPositionY < 0) {
                // Reset to default position
                resetDatePosition();
            } else {
                // Apply position using percentages directly for responsive positioning
                dateContainer.style.left = `${dateCustomPositionX}%`;
                dateContainer.style.top = `${dateCustomPositionY}%`;
            }
        }
    }
}

/**
 * Resets the date position to default (centered below the clock)
 */
export function resetDatePosition() {
    if (!dateContainer) return;
    
    // Default position (centered horizontally, below the clock)
    const defaultX = 50;
    const defaultY = 60;
    
    // Update state to indicate we're not in custom position mode
    updateState({
        datePositionIndex: 0, // Default position index
        dateCustomPositionX: defaultX,
        dateCustomPositionY: defaultY,
        date: {
            datePositionIndex: 0,
            dateCustomPositionX: defaultX,
            dateCustomPositionY: defaultY
        }
    }, true); // Save immediately, don't skip notifying subscribers
    
    // Apply the default position using percentages directly for responsive positioning
    dateContainer.style.left = `${defaultX}%`;
    dateContainer.style.top = `${defaultY}%`;
    
    // Apply transform to ensure proper positioning
    applyDateTransform();
}

/**
 * Starts dragging the date container
 * @param {MouseEvent|Touch} event - The mouse event or touch point
 */
export function startDateDrag(event) {
    if (!dateContainer) return;
    
    // Get current position
    const containerRect = dateContainer.getBoundingClientRect();
    const initialLeft = containerRect.left;
    const initialTop = containerRect.top;
    
    // Calculate the offset of the mouse pointer relative to the date container
    const dateDragOffsetX = event.clientX - initialLeft;
    const dateDragOffsetY = event.clientY - initialTop;
    
    // Convert to percentage of window size for responsive positioning
    const percentX = (initialLeft / window.innerWidth) * 100;
    const percentY = (initialTop / window.innerHeight) * 100;
    
    // Ensure the date container has absolute positioning without changing its position
    dateContainer.style.position = 'absolute';
    dateContainer.style.left = `${percentX}%`;
    dateContainer.style.top = `${percentY}%`;
    
    // Update state to indicate we're in custom position mode
    updateState({
        datePositionIndex: CUSTOM_POSITION_INDEX,
        dateCustomPositionX: percentX,
        dateCustomPositionY: percentY,
        date: {
            datePositionIndex: CUSTOM_POSITION_INDEX,
            dateCustomPositionX: percentX,
            dateCustomPositionY: percentY
        }
    }, true); // Save immediately, don't skip notifying subscribers
    
    // Return drag offsets for use in handleDateDrag
    return { dateDragOffsetX, dateDragOffsetY };
}

/**
 * Handles dragging the date container
 * @param {MouseEvent|Touch} event - The mouse event or touch point
 * @param {Object} offsets - The drag offsets { dateDragOffsetX, dateDragOffsetY }
 */
export function handleDateDrag(event, offsets) {
    if (!dateContainer) return;
    
    const { dateDragOffsetX, dateDragOffsetY } = offsets;
    
    // Calculate new position
    const left = event.clientX - dateDragOffsetX;
    const top = event.clientY - dateDragOffsetY;
    
    // Ensure the date container stays within the viewport
    const dateWidth = dateContainer.offsetWidth;
    const dateHeight = dateContainer.offsetHeight;
    
    // Constrain to viewport boundaries
    const constrainedLeft = Math.max(0, Math.min(window.innerWidth - dateWidth, left));
    const constrainedTop = Math.max(0, Math.min(window.innerHeight - dateHeight, top));
    
    // Convert to percentage of window size for responsive positioning
    const percentX = (constrainedLeft / window.innerWidth) * 100;
    const percentY = (constrainedTop / window.innerHeight) * 100;
    
    // Update the date container position directly for smooth dragging
    dateContainer.style.position = 'absolute';
    dateContainer.style.left = `${percentX}%`;
    dateContainer.style.top = `${percentY}%`;
}

/**
 * Stops dragging the date container
 */
export function stopDateDrag() {
    if (!dateContainer) return;
    
    // Get the final position
    const containerRect = dateContainer.getBoundingClientRect();
    const left = containerRect.left;
    const top = containerRect.top;
    
    // Convert to percentage of window size for responsive positioning
    const dateCustomPositionX = (left / window.innerWidth) * 100;
    const dateCustomPositionY = (top / window.innerHeight) * 100;
    
    // Update state with the new position
    updateState({
        datePositionIndex: CUSTOM_POSITION_INDEX,
        dateCustomPositionX: dateCustomPositionX,
        dateCustomPositionY: dateCustomPositionY,
        date: {
            datePositionIndex: CUSTOM_POSITION_INDEX,
            dateCustomPositionX: dateCustomPositionX,
            dateCustomPositionY: dateCustomPositionY
        }
    }, true); // Save immediately, don't skip notifying subscribers
    
    // Apply transform based on new position
    applyDateTransform();
}
