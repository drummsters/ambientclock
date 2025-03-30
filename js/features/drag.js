/**
 * Drag feature for the Ambient Clock application
 * Handles dragging and resizing of UI elements (clock faces and date display)
 */

import { getElement, getElements } from '../utils/dom.js';
import { handleWheelEvent } from '../utils/wheel.js';
import { startElementDrag, handleElementDrag, stopElementDrag, handleElementTouchStart, handleElementTouchMove } from './element-drag.js';
import { getActiveClock, getDateDisplay } from '../components/element-manager.js';

// DOM elements
let clockContainer;
let clockFaces;
let dateContainer;

// Drag state
let isDragging = false;
let dragOffsetX = 0;
let dragOffsetY = 0;
let isDraggingDate = false;
let dateDragOffsetX = 0;
let dateDragOffsetY = 0;

/**
 * Initializes the drag feature
 */
export function initDrag() {
    // Get DOM elements
    clockContainer = getElement('clock-container');
    clockFaces = getElements('.clock-face');
    dateContainer = getElement('date-container');
    
    if (!clockContainer || !clockFaces.length) {
        console.error("Clock elements not found");
        return;
    }
    
    // Add drag event listeners to the active clock face
    setupDragListeners();
    
    // Add drag event listeners to the date container
    setupDateDragListeners();
    
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
 * Sets up drag event listeners for the date container
 */
function setupDateDragListeners() {
    // If dateContainer is not initialized, get it now
    if (!dateContainer) {
        dateContainer = getElement('date-container');
    }
    
    // Get the date face element
    const dateFace = getElement('date-face');
    
    // If still no date elements, exit
    if (!dateContainer || !dateFace) {
        console.error("Date elements not found in setupDateDragListeners");
        return;
    }
    
    // Add event listeners to the date face (not the container)
    addDateDragListeners(dateFace);
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
 * Adds drag event listeners to the date container
 * @param {HTMLElement} element - The date container element
 */
function addDateDragListeners(element) {
    // Mouse events
    element.addEventListener('mousedown', startDateDrag);
    document.addEventListener('mousemove', handleDateDrag);
    document.addEventListener('mouseup', stopDateDrag);
    
    // Touch events
    element.addEventListener('touchstart', handleDateTouchStart);
    document.addEventListener('touchmove', handleDateTouchMove);
    document.addEventListener('touchend', stopDateDrag);
    document.addEventListener('touchcancel', stopDateDrag);
}

/**
 * Handles touch start event
 * @param {TouchEvent} event - The touch event
 */
function handleTouchStart(event) {
    handleElementTouchStart(event, startDrag);
}

/**
 * Handles touch move event
 * @param {TouchEvent} event - The touch event
 */
function handleTouchMove(event) {
    handleElementTouchMove(event, handleDrag);
}

/**
 * Handles date touch start event
 * @param {TouchEvent} event - The touch event
 */
function handleDateTouchStart(event) {
    handleElementTouchStart(event, startDateDrag);
}

/**
 * Handles date touch move event
 * @param {TouchEvent} event - The touch event
 */
function handleDateTouchMove(event) {
    handleElementTouchMove(event, handleDateDrag);
}

/**
 * Starts dragging the clock
 * @param {MouseEvent|Touch} event - The mouse event or touch point
 */
function startDrag(event) {
    // Get the active clock face
    const activeFace = document.querySelector('.clock-face.active');
    if (!activeFace || !clockContainer) return;
    
    // Use the shared element drag function
    const dragState = startElementDrag('clock', clockContainer, activeFace, event);
    
    // Store drag state
    isDragging = dragState.isDragging;
    dragOffsetX = dragState.offsetX;
    dragOffsetY = dragState.offsetY;
}

/**
 * Handles dragging the clock
 * @param {MouseEvent|Touch} event - The mouse event or touch point
 */
function handleDrag(event) {
    if (!isDragging || !clockContainer) return;
    
    // Use the shared element drag function
    handleElementDrag('clock', clockContainer, event, { offsetX: dragOffsetX, offsetY: dragOffsetY });
}

/**
 * Starts dragging the date container
 * @param {MouseEvent|Touch} event - The mouse event or touch point
 */
function startDateDrag(event) {
    if (!dateContainer) return;
    
    // Get the date face element
    const dateFace = getElement('date-face');
    if (!dateFace) return;
    
    // Use the shared element drag function
    const dragState = startElementDrag('date', dateContainer, dateFace, event);
    
    // Store drag state
    isDraggingDate = dragState.isDragging;
    dateDragOffsetX = dragState.offsetX;
    dateDragOffsetY = dragState.offsetY;
}

/**
 * Handles dragging the date container
 * @param {MouseEvent|Touch} event - The mouse event or touch point
 */
function handleDateDrag(event) {
    if (!isDraggingDate || !dateContainer) return;
    
    // Use the shared element drag function
    handleElementDrag('date', dateContainer, event, { offsetX: dateDragOffsetX, offsetY: dateDragOffsetY });
}

/**
 * Stops dragging the date container
 */
function stopDateDrag() {
    if (!isDraggingDate || !dateContainer) return;
    
    // Get the date face element
    const dateFace = getElement('date-face');
    if (!dateFace) return;
    
    // Get the date display instance from the element manager
    const dateDisplay = getDateDisplay();
    
    // Use the shared element drag function with applyScale callback
    stopElementDrag('date', dateContainer, dateFace, dateDisplay ? dateDisplay.applyScale.bind(dateDisplay) : null);
    
    isDraggingDate = false;
}

/**
 * Stops dragging the clock
 */
function stopDrag() {
    if (!isDragging) return;
    
    // Get the active clock face
    const activeFace = document.querySelector('.clock-face.active');
    if (!activeFace || !clockContainer) return;
    
    // Use the shared element drag function
    stopElementDrag('clock', clockContainer, activeFace);
    
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
