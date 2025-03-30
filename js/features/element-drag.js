/**
 * Element Drag feature for the Ambient Clock application
 * Provides shared drag functionality for UI elements (clock faces and date display)
 */

import { getState, updateState } from '../state.js';
import { getElement, addClass, removeClass } from '../utils/dom.js';
import { CUSTOM_POSITION_INDEX } from '../config.js';
import { updateCustomPosition, updateCustomDatePosition } from './element-position.js';

/**
 * Starts dragging an element
 * @param {string} elementType - The type of element ('clock' or 'date')
 * @param {HTMLElement} container - The element container
 * @param {HTMLElement} element - The element being dragged
 * @param {MouseEvent|Touch} event - The mouse event or touch point
 * @returns {Object} The drag state { isDragging, offsetX, offsetY }
 */
export function startElementDrag(elementType, container, element, event) {
    if (!container || !element) return { isDragging: false };
    
    // Get current position
    const containerRect = container.getBoundingClientRect();
    const initialLeft = containerRect.left;
    const initialTop = containerRect.top;
    
    // Calculate the offset of the mouse pointer relative to the container
    let offsetX = event.clientX - initialLeft;
    let offsetY = event.clientY - initialTop;
    
    const isClockElement = elementType === 'clock';
    
    // Ensure the container has absolute positioning
    container.style.position = 'absolute';
    
    if (isClockElement) {
        // For clock, switch to custom position mode
        // Calculate current position as percentage
        const customPositionX = (initialLeft / window.innerWidth) * 100;
        const customPositionY = (initialTop / window.innerHeight) * 100;
        updateCustomPosition(customPositionX, customPositionY);
    } else {
        // For date, we need to handle the position differently
        // We'll keep the current pixel position during the drag operation
        // and only update the percentage position when the drag ends
        
        // Set the position directly in pixels for smooth dragging
        container.style.left = `${initialLeft}px`;
        container.style.top = `${initialTop}px`;
        
        // Update state to indicate we're in custom position mode
        updateState({
            datePositionIndex: CUSTOM_POSITION_INDEX
        }, false, true); // Don't save immediately, skip notifying subscribers
    }
    
    // Add dragging class
    addClass(element, 'dragging');
    
    // Prevent text selection during drag
    event.preventDefault();
    
    return { isDragging: true, offsetX, offsetY };
}

/**
 * Handles dragging an element
 * @param {string} elementType - The type of element ('clock' or 'date')
 * @param {HTMLElement} container - The element container
 * @param {MouseEvent|Touch} event - The mouse event or touch point
 * @param {Object} dragState - The drag state { offsetX, offsetY }
 */
export function handleElementDrag(elementType, container, event, dragState) {
    if (!container) return;
    
    const { offsetX, offsetY } = dragState;
    
    // Calculate new position
    const left = event.clientX - offsetX;
    const top = event.clientY - offsetY;
    
    const isClockElement = elementType === 'clock';
    
    // Ensure the container has absolute positioning
    container.style.position = 'absolute';
    
    // For date element, update position in state if needed
    if (!isClockElement && getState().datePositionIndex !== CUSTOM_POSITION_INDEX) {
        // Calculate current position as percentage
        const positionX = (left / window.innerWidth) * 100;
        const positionY = (top / window.innerHeight) * 100;
        
        // Use the dedicated function for date position updates
        updateCustomDatePosition(positionX, positionY);
    }
    
    // For both clock and date, update position directly in pixels for smooth dragging
    // Update position directly in pixels for smooth dragging
    container.style.left = `${left}px`;
    container.style.top = `${top}px`;
}

/**
 * Stops dragging an element
 * @param {string} elementType - The type of element ('clock' or 'date')
 * @param {HTMLElement} container - The element container
 * @param {HTMLElement} element - The element being dragged
 * @param {Function} applyTransform - Optional function to apply transform after position update
 */
export function stopElementDrag(elementType, container, element, applyTransform = null) {
    if (!container || !element) return;
    
    // Remove dragging class
    removeClass(element, 'dragging');
    
    const isClockElement = elementType === 'clock';
    
    if (isClockElement) {
        // Get the final position
        const containerRect = container.getBoundingClientRect();
        const left = containerRect.left;
        const top = containerRect.top;
        
        // Convert to percentage of window size for responsive positioning
        const positionX = (left / window.innerWidth) * 100;
        const positionY = (top / window.innerHeight) * 100;
        
        // Update state with final position
        updateCustomPosition(positionX, positionY);
    } else {
        // For date element, we need to be careful not to change the position
        // Just update the state to match the current pixel position
        
        // Get the current style position (which should be in pixels)
        const currentLeft = parseFloat(container.style.left);
        const currentTop = parseFloat(container.style.top);
        
        // Convert to percentage of window size for responsive positioning
        const positionX = (currentLeft / window.innerWidth) * 100;
        const positionY = (currentTop / window.innerHeight) * 100;
        
        // Update state with final position
        updateState({
            datePositionIndex: CUSTOM_POSITION_INDEX,
            dateCustomPositionX: positionX,
            dateCustomPositionY: positionY
        }, false, true); // Don't save immediately, skip notifying subscribers
        
        // Apply transform if provided (for date container)
        if (applyTransform && typeof applyTransform === 'function') {
            applyTransform();
        }
    }
}

/**
 * Handles touch start event
 * @param {TouchEvent} event - The touch event
 * @param {Function} startDragFn - The function to call with the touch point
 */
export function handleElementTouchStart(event, startDragFn) {
    event.preventDefault();
    startDragFn(event.touches[0]);
}

/**
 * Handles touch move event
 * @param {TouchEvent} event - The touch event
 * @param {Function} handleDragFn - The function to call with the touch point
 */
export function handleElementTouchMove(event, handleDragFn) {
    event.preventDefault();
    handleDragFn(event.touches[0]);
}
