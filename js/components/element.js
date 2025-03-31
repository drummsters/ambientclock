/**
 * Generic Element class for the Ambient Clock application
 * Base class for all UI elements (clocks, date display, etc.)
 */

import { getState, updateState } from '../state.js';
import { getElement, updateStyle } from '../utils/dom.js';
import { CUSTOM_POSITION_INDEX, MAX_SCALE, MIN_SCALE } from '../config.js';

/**
 * Generic Element class that provides common functionality for all UI elements
 */
export class Element {
    /**
     * Creates a new Element instance
     * @param {string} type - The type of element (e.g., 'clock', 'date')
     * @param {string} containerId - The ID of the container element
     * @param {string} faceId - The ID of the face element
     */
    constructor(type, containerId, faceId) {
        this.type = type;
        this.containerId = containerId;
        this.faceId = faceId;
        this.container = null;
        this.face = null;
        this.isDragging = false;
        this.dragOffsetX = 0;
        this.dragOffsetY = 0;
    }

    /**
     * Initializes the element
     */
    init() {
        // Get DOM elements
        this.container = getElement(this.containerId);
        this.face = getElement(this.faceId);
        
        if (!this.container || !this.face) {
            console.error(`${this.type} elements not found`);
            return false;
        }
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Apply initial position and scale
        this.applyPosition();
        this.applyScale();
        
        return true;
    }

    /**
     * Sets up event listeners for the element
     */
    setupEventListeners() {
        // Mouse events for dragging
        this.face.addEventListener('mousedown', this.startDrag.bind(this));
        document.addEventListener('mousemove', this.handleDrag.bind(this));
        document.addEventListener('mouseup', this.stopDrag.bind(this));
        
        // Touch events for dragging
        this.face.addEventListener('touchstart', this.handleTouchStart.bind(this));
        document.addEventListener('touchmove', this.handleTouchMove.bind(this));
        document.addEventListener('touchend', this.stopDrag.bind(this));
        document.addEventListener('touchcancel', this.stopDrag.bind(this));
        
        // Wheel event for resizing
        this.face.addEventListener('wheel', this.handleWheel.bind(this), { passive: false });
    }

    /**
     * Handles touch start event
     * @param {TouchEvent} event - The touch event
     */
    handleTouchStart(event) {
        // Safely prevent default if possible
        if (event && typeof event.preventDefault === 'function') {
            event.preventDefault();
        }
        
        // Make sure event and touches exist before proceeding
        if (event && event.touches && event.touches.length > 0) {
            this.startDrag(event.touches[0]);
        }
    }

    /**
     * Handles touch move event
     * @param {TouchEvent} event - The touch event
     */
    handleTouchMove(event) {
        // Safely prevent default if possible
        if (event && typeof event.preventDefault === 'function') {
            event.preventDefault();
        }
        
        // Make sure event and touches exist before proceeding
        if (event && event.touches && event.touches.length > 0) {
            this.handleDrag(event.touches[0]);
        }
    }

    /**
     * Starts dragging the element
     * @param {MouseEvent|Touch} event - The mouse event or touch point
     */
    startDrag(event) {
        if (!this.container || !this.face) return;
        
        // Get current position
        const containerRect = this.container.getBoundingClientRect();
        const initialLeft = containerRect.left;
        const initialTop = containerRect.top;
        
        // Calculate the offset of the mouse pointer relative to the container
        this.dragOffsetX = event.clientX - initialLeft;
        this.dragOffsetY = event.clientY - initialTop;
        
        // Switch to custom position mode if not already in it
        const positionIndexKey = `${this.type}PositionIndex`;
        const state = getState();
        
        // Calculate current position as percentage
        const customPositionX = (initialLeft / window.innerWidth) * 100;
        const customPositionY = (initialTop / window.innerHeight) * 100;
        
        // Switch to custom position mode
        const stateUpdate = {
            [positionIndexKey]: CUSTOM_POSITION_INDEX,
            [`${this.type}CustomPositionX`]: customPositionX,
            [`${this.type}CustomPositionY`]: customPositionY
        };
        updateState(stateUpdate, false, true); // Don't save immediately, skip notifying subscribers
        
        // Add custom-position class for date elements
        if (this.type === 'date') {
            this.container.classList.add('custom-position');
        }
        
        // Ensure the container has absolute positioning
        this.container.style.position = 'absolute';
        
        // Add dragging class
        this.face.classList.add('dragging');
        
        // Set dragging state
        this.isDragging = true;
        
        // Prevent text selection during drag (if event is preventable)
        if (event && typeof event.preventDefault === 'function') {
            event.preventDefault();
        }
    }

    /**
     * Handles dragging the element
     * @param {MouseEvent|Touch} event - The mouse event or touch point
     */
    handleDrag(event) {
        if (!this.isDragging || !this.container) return;
        
        // Calculate new position
        const left = event.clientX - this.dragOffsetX;
        const top = event.clientY - this.dragOffsetY;
        
        // Ensure the container has absolute positioning
        this.container.style.position = 'absolute';
        
        // Make sure the custom-position class is applied for date elements
        if (this.type === 'date') {
            this.container.classList.add('custom-position');
            
            // Update state to indicate we're in custom position mode
            // This ensures the position sticks even if the mouse stops moving
            if (getState().datePositionIndex !== CUSTOM_POSITION_INDEX) {
                updateState({
                    datePositionIndex: CUSTOM_POSITION_INDEX
                }, false, true); // Don't save immediately, skip notifying subscribers
            }
        }
        
        // Update position directly in pixels for smooth dragging
        this.container.style.left = `${left}px`;
        this.container.style.top = `${top}px`;
    }

    /**
     * Stops dragging the element
     */
    stopDrag() {
        if (!this.isDragging || !this.container || !this.face) return;
        
        // Remove dragging class
        this.face.classList.remove('dragging');
        
        // Get the final position
        const containerRect = this.container.getBoundingClientRect();
        const left = containerRect.left;
        const top = containerRect.top;
        
        // Convert to percentage of window size for responsive positioning
        const positionX = (left / window.innerWidth) * 100;
        const positionY = (top / window.innerHeight) * 100;
        
        // Update state with final position
        if (this.type === 'date') {
            // For date elements, use flat state update to ensure it's applied immediately
            updateState({
                datePositionIndex: CUSTOM_POSITION_INDEX,
                dateCustomPositionX: positionX,
                dateCustomPositionY: positionY
            }, false, true); // Don't save immediately, skip notifying subscribers
            
            // Make sure the custom-position class is maintained
            this.container.classList.add('custom-position');
        } else {
            // For other elements, use nested state update
            const stateUpdate = {
                [this.type]: {
                    [`${this.type}PositionIndex`]: CUSTOM_POSITION_INDEX,
                    [`${this.type}CustomPositionX`]: positionX,
                    [`${this.type}CustomPositionY`]: positionY
                }
            };
            updateState(stateUpdate, false, true); // Don't save immediately, skip notifying subscribers
        }
        
        // Apply the new position
        this.applyPosition();
        
        // Reset dragging state
        this.isDragging = false;
    }

    /**
     * Handles wheel events for resizing
     * @param {WheelEvent} event - The wheel event
     */
    handleWheel(event) {
        // Ignore if event is on form elements
        if (event.target.tagName === 'INPUT' || 
            event.target.tagName === 'SELECT') {
            return;
        }

        // Always prevent default scrolling behavior (if event is preventable)
        if (event && typeof event.preventDefault === 'function') {
            event.preventDefault();
        }
        
        // Check if shift key is pressed
        const isShiftPressed = event.shiftKey;
        
        if (isShiftPressed) {
            // Shift + Wheel - controls opacity
            if (event.deltaY < 0) {
                this.increaseOpacity();
            } else {
                this.decreaseOpacity();
            }
        } else {
            // Regular wheel - controls size
            if (event.deltaY < 0) {
                this.increaseSize();
            } else {
                this.decreaseSize();
            }
        }
    }

    /**
     * Applies the position to the element
     */
    applyPosition() {
        if (!this.container) return;
        
        const state = getState();
        const positionIndexKey = `${this.type}PositionIndex`;
        const positionIndex = state[positionIndexKey];
        
        // Handle custom position separately
        if (positionIndex === CUSTOM_POSITION_INDEX) {
            // Add custom-position class to remove the centering transform
            if (this.type === 'date') {
                this.container.classList.add('custom-position');
            }
            
            // Apply custom position styles
            this.container.style.position = 'absolute';
            this.applyCustomPosition();
            return;
        } else {
            // Remove custom-position class if not in custom position mode
            if (this.type === 'date') {
                this.container.classList.remove('custom-position');
            }
        }
    }

    /**
     * Applies a custom position to the element
     */
    applyCustomPosition() {
        if (!this.container) return;
        
        // Get position from state
        const state = getState();
        const customPositionX = state[`${this.type}CustomPositionX`];
        const customPositionY = state[`${this.type}CustomPositionY`];
        
        // Convert percentage to pixels
        const left = (window.innerWidth * customPositionX / 100);
        const top = (window.innerHeight * customPositionY / 100);
        
        updateStyle(this.container, {
            position: 'absolute',
            left: `${left}px`,
            top: `${top}px`,
            justifyContent: '',
            alignItems: ''
        });
    }

    /**
     * Applies the scale to the element
     */
    applyScale() {
        if (!this.face) return;
        
        const state = getState();
        const scale = state[`${this.type}Scale`];
        
        // Apply scale transform to the face
        if (scale !== undefined) {
            updateStyle(this.face, {
                transform: `scale(${scale})`
            });
        }
    }

    /**
     * Updates the element size
     * @param {number} scale - The scale factor to apply
     */
    updateSize(scale) {
        if (!this.face) return;
        
        // Clamp scale between MIN_SCALE and MAX_SCALE
        const clampedScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale));
        
        // Apply scale to the face
        updateStyle(this.face, {
            transform: `scale(${clampedScale})`
        });
        
        // Update state if needed
        const scaleKey = `${this.type}Scale`;
        if (clampedScale !== getState()[scaleKey]) {
            const stateUpdate = {
                [this.type]: {
                    [scaleKey]: clampedScale
                }
            };
            updateState(stateUpdate, false, true); // Don't save immediately, skip notifying subscribers
        }
        
        console.log(`${this.type} size changed to: ${Math.round(clampedScale * 100)}%`);
    }

    /**
     * Increases the element size
     * @param {number} [step=0.1] - The amount to increase by
     */
    increaseSize(step = 0.1) {
        const scaleKey = `${this.type}Scale`;
        const currentScale = getState()[scaleKey];
        this.updateSize(currentScale + step);
    }

    /**
     * Decreases the element size
     * @param {number} [step=0.1] - The amount to decrease by
     */
    decreaseSize(step = 0.1) {
        const scaleKey = `${this.type}Scale`;
        const currentScale = getState()[scaleKey];
        this.updateSize(currentScale - step);
    }

    /**
     * Updates the element opacity
     * @param {number} opacity - The opacity value (0.1 to 1.0)
     */
    updateOpacity(opacity) {
        if (!this.container) return;
        
        // Clamp opacity between 0.1 (minimum visibility) and 1.0
        const clampedOpacity = Math.max(0.1, Math.min(1.0, opacity));
        
        // Apply opacity to the container
        this.container.style.opacity = clampedOpacity.toFixed(2);
        
        // Update state if needed
        const opacityKey = `${this.type}Opacity`;
        if (clampedOpacity !== getState()[opacityKey]) {
            const stateUpdate = {
                [this.type]: {
                    [opacityKey]: clampedOpacity
                }
            };
            updateState(stateUpdate, false, true); // Don't save immediately, skip notifying subscribers
        }
        
        console.log(`${this.type} opacity set to: ${clampedOpacity.toFixed(2)}`);
    }

    /**
     * Increases the element opacity
     * @param {number} [step=0.1] - The amount to increase by
     */
    increaseOpacity(step = 0.1) {
        const opacityKey = `${this.type}Opacity`;
        const currentOpacity = getState()[opacityKey];
        this.updateOpacity(currentOpacity + step);
    }

    /**
     * Decreases the element opacity
     * @param {number} [step=0.1] - The amount to decrease by
     */
    decreaseOpacity(step = 0.1) {
        const opacityKey = `${this.type}Opacity`;
        const currentOpacity = getState()[opacityKey];
        this.updateOpacity(currentOpacity - step);
    }

    /**
     * Updates the element
     * This method should be overridden by subclasses
     */
    update() {
        // To be implemented by subclasses
    }
}
