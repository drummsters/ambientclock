/**
 * Drag feature for the Ambient Clock application
 * Handles dragging and resizing of clock faces
 */

import { getState, updateState } from '../state.js';
import { getElement, getElements, addClass, removeClass } from '../utils/dom.js';
import { CUSTOM_POSITION_INDEX } from '../config.js';
import { updateCustomPosition } from './position.js';
import { showControls } from '../components/controls.js';
import { handleWheelEvent } from '../utils/wheel.js';

// DOM elements
let clockContainer;
let clockFaces;

// Drag state
let isDragging = false;
let dragOffsetX = 0;
let dragOffsetY = 0;

/**
 * Initializes the drag feature
 */
export function initDrag() {
    // Get DOM elements
    clockContainer = getElement('clock-container');
    clockFaces = getElements('.clock-face');
    
    if (!clockContainer || !clockFaces.length) {
        console.error("Clock elements not found");
        return;
    }
    
    // Add drag event listeners to the active clock face
    setupDragListeners();
    
    // Add wheel event listeners for resizing
    setupWheelListeners();
    
    console.log("Drag and resize functionality initialized");
}

/**
 * Sets up drag event listeners
 */
function setupDragListeners() {
    // If clockContainer is not initialized, get it now
    if (!clockContainer) {
        clockContainer = getElement('clock-container');
        
        // If still no clock container, exit
        if (!clockContainer) {
            console.error("Clock container not found in setupDragListeners");
            return;
        }
    }
    
    // Add event listeners to the active clock face
    const activeFace = document.querySelector('.clock-face.active');
    if (activeFace) {
        addDragListeners(activeFace);
    }
}

/**
 * Adds drag event listeners to an element
 * @param {HTMLElement} element - The element to make draggable
 */
function addDragListeners(element) {
    // Mouse events
    element.addEventListener('mousedown', startDrag);
    document.addEventListener('mousemove', handleDrag);
    document.addEventListener('mouseup', stopDrag);
    
    // Touch events
    element.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', stopDrag);
    document.addEventListener('touchcancel', stopDrag);
}

/**
 * Handles touch start event
 * @param {TouchEvent} event - The touch event
 */
function handleTouchStart(event) {
    event.preventDefault();
    startDrag(event.touches[0]);
}

/**
 * Handles touch move event
 * @param {TouchEvent} event - The touch event
 */
function handleTouchMove(event) {
    event.preventDefault();
    handleDrag(event.touches[0]);
}

/**
 * Starts dragging the clock
 * @param {MouseEvent|Touch} event - The mouse event or touch point
 */
function startDrag(event) {
    // Get the active clock face
    const activeFace = document.querySelector('.clock-face.active');
    if (!activeFace) return;
    
    // Get current position before switching modes
    const containerRect = clockContainer.getBoundingClientRect();
    const initialLeft = containerRect.left;
    const initialTop = containerRect.top;
    
    // Only switch to custom position mode if not already in it
    if (getState().positionIndex !== CUSTOM_POSITION_INDEX) {
        // Calculate current position as percentage before switching modes
        const customPositionX = (initialLeft / window.innerWidth) * 100;
        const customPositionY = (initialTop / window.innerHeight) * 100;
        
        // Switch to custom position mode
        updateCustomPosition(customPositionX, customPositionY);
    }
    
    // Add dragging class
    addClass(activeFace, 'dragging');
    
    // Calculate the offset of the mouse pointer relative to the clock container
    dragOffsetX = event.clientX - initialLeft;
    dragOffsetY = event.clientY - initialTop;
    
    isDragging = true;
    
    // Prevent text selection during drag
    event.preventDefault();
}

/**
 * Handles dragging the clock
 * @param {MouseEvent|Touch} event - The mouse event or touch point
 */
function handleDrag(event) {
    if (!isDragging || !clockContainer) return;
    
    // Calculate new position
    const left = event.clientX - dragOffsetX;
    const top = event.clientY - dragOffsetY;
    
    // Update the clock position directly for smooth dragging
    // Only update the visual position during dragging, not the state
    clockContainer.style.left = `${left}px`;
    clockContainer.style.top = `${top}px`;
    
    // Ensure the clock container has absolute positioning
    clockContainer.style.position = 'absolute';
}

/**
 * Stops dragging the clock
 */
function stopDrag() {
    if (!isDragging) return;
    
    // Remove dragging class
    const activeFace = document.querySelector('.clock-face.active');
    if (activeFace) {
        removeClass(activeFace, 'dragging');
    }
    
    // Get the final position
    if (clockContainer) {
        const containerRect = clockContainer.getBoundingClientRect();
        const left = containerRect.left;
        const top = containerRect.top;
        
        // Convert to percentage of window size for responsive positioning
        const customPositionX = (left / window.innerWidth) * 100;
        const customPositionY = (top / window.innerHeight) * 100;
        
        // Update state with final position only when drag is complete
        updateCustomPosition(customPositionX, customPositionY);
    }
    
    isDragging = false;
}

/**
 * Sets up wheel event listeners for resizing
 */
function setupWheelListeners() {
    // If clockFaces is not initialized, get them now
    if (!clockFaces || !clockFaces.length) {
        clockFaces = getElements('.clock-face');
        
        // If still no clock faces, exit
        if (!clockFaces || !clockFaces.length) {
            console.error("Clock faces not found in setupWheelListeners");
            return;
        }
    }
    
    clockFaces.forEach(face => {
        face.addEventListener('wheel', handleWheel, { passive: false });
    });
}

/**
 * Handles wheel events for resizing
 * @param {WheelEvent} event - The wheel event
 */
function handleWheel(event) {
    // Use the centralized wheel event handler from wheel.js
    // Pass false for isShiftPressed since we don't track shift key state in drag.js
    handleWheelEvent(event, false);
}

/**
 * Updates the active clock face when it changes
 */
export function updateActiveFace() {
    // If clockContainer is not initialized, get it now
    if (!clockContainer) {
        clockContainer = getElement('clock-container');
        
        // If still no clock container, exit
        if (!clockContainer) {
            console.error("Clock container not found in updateActiveFace");
            return;
        }
    }
    
    // If clockFaces is not initialized, get them now
    if (!clockFaces || !clockFaces.length) {
        clockFaces = getElements('.clock-face');
        
        // If still no clock faces, exit
        if (!clockFaces || !clockFaces.length) {
            console.error("Clock faces not found in updateActiveFace");
            return;
        }
    }
    
    // Remove event listeners from all faces
    clockFaces.forEach(face => {
        face.removeEventListener('mousedown', startDrag);
        face.removeEventListener('touchstart', handleTouchStart);
    });
    
    // Add event listeners to the active face
    setupDragListeners();
}
