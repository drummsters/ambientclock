import { StateManager } from '../core/state-manager.js';
import { StyleHandler } from '../components/base/mixins/StyleHandler.js';
import * as logger from './logger.js'; // Import the logger

// Store references to instances and state
let controlPanelInstance = null;
const NUDGE_AMOUNT = 0.1; // Percentage to move on each arrow key press

/**
 * Sets up global keyboard listeners and element selection.
 * @param {ControlPanel} panelInstance - The instance of the ControlPanel to toggle.
 */
// Track double tap
let lastTapTime = 0;
const DOUBLE_TAP_DELAY = 300; // milliseconds

function handleTouchStart(event) {
    const currentTime = new Date().getTime();
    const tapLength = currentTime - lastTapTime;
    
    if (tapLength < DOUBLE_TAP_DELAY && tapLength > 0) {
        // Double tap detected
        event.preventDefault();
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable fullscreen: ${err.message}`);
            });
        } else {
            document.exitFullscreen();
        }
    }
    
    lastTapTime = currentTime;
}

export function setupGlobalKeyListeners(panelInstance) {
    controlPanelInstance = panelInstance; // Store the instance
    logger.debug('Setting up global key listeners...');
    
    // Remove previous listeners if any
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
    document.body.removeEventListener('click', handleBodyClick);
    document.body.removeEventListener('touchstart', handleTouchStart);
    
    // Add listeners
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    document.body.addEventListener('click', handleBodyClick);
    
    // Add double tap listener for mobile fullscreen
    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
        document.body.addEventListener('touchstart', handleTouchStart);
    }
    
    // Add click listeners to all draggable elements
    setupElementSelection();
}

/**
 * Sets up click listeners for element selection
 */
function setupElementSelection() {
    document.querySelectorAll('.base-element').forEach(element => {
        // Remove existing listener if any
        element.removeEventListener('click', handleElementClick);
        // Add new listener
        element.addEventListener('click', handleElementClick);
    });
}

/**
 * Handles element click for selection
 * @param {MouseEvent} event - The click event
 */
function handleElementClick(event) {
    event.stopPropagation(); // Prevent body click from immediately deselecting
    
    // Deselect any previously selected elements
    document.querySelectorAll('.base-element.selected').forEach(el => {
        if (el !== event.currentTarget) {
            el.classList.remove('selected', 'nudging');
        }
    });
    
    // Clear any existing hide timer
    if (window.nudgeHideTimer) {
        clearTimeout(window.nudgeHideTimer);
        window.nudgeHideTimer = null;
    }
    
    // Toggle selection on clicked element
    event.currentTarget.classList.toggle('selected');
    event.currentTarget.classList.remove('nudging');
}

/**
 * Handles click on body to deselect elements
 */
function handleBodyClick(event) {
    // Check if click was on control panel or its children
    let target = event.target;
    while (target && target !== document.body) {
        if (target.classList?.contains('control-panel-element')) {
            return; // Don't do anything if clicked on control panel
        }
        target = target.parentElement;
    }

    // If we get here, click was on background
    
    // Deselect any selected elements
    document.querySelectorAll('.base-element.selected').forEach(el => {
        el.classList.remove('selected');
    });

    // Only hide control panel if it's visible
    const panel = document.querySelector('.control-panel');
    if (panel?.style.display !== 'none') {
        controlPanelInstance?.toggleVisibility();
    }
}

/**
 * Handles keydown events for global shortcuts.
 * @param {KeyboardEvent} event - The keyboard event.
 */
function handleKeyDown(event) {
    // Check if we're in an input field
    const isInInput = document.activeElement?.tagName === 'INPUT' || 
                     document.activeElement?.tagName === 'SELECT' || 
                     document.activeElement?.tagName === 'TEXTAREA';

    // Show outline when Ctrl is pressed if an element is selected
    if (event.ctrlKey && !isInInput) {
        const selectedElement = document.querySelector('.base-element.selected');
        if (selectedElement) {
            selectedElement.classList.add('nudging');
        }
    }

    // Toggle Control Panel with Space or 'c'
    if (!isInInput && (event.code === 'Space' || event.key === 'c')) {
        if (event.code === 'Space') {
            event.preventDefault();
        }
        controlPanelInstance?.toggleVisibility();
    }
    // Toggle Debug Mode with Ctrl+Shift+Z
    else if (event.ctrlKey && event.shiftKey && event.key === 'Z') {
        event.preventDefault();
        logger.toggleDebugMode();
    }
    // Handle nudge controls (Ctrl + Arrow keys)
    else if (event.ctrlKey && !isInInput) {
        const selectedElement = document.querySelector('.base-element.selected');
        if (!selectedElement) return;

        // Get the element's current position from state
        const elementId = selectedElement.id;
        const elementState = StateManager.getNestedValue(StateManager.getState(), `elements.${elementId}`);
        if (!elementState?.position) return;

        // Add nudging class for visual feedback
        selectedElement.classList.add('nudging');

        // Clear any existing hide timer
        if (window.nudgeHideTimer) {
            clearTimeout(window.nudgeHideTimer);
        }

        // Set timer to hide outline after nudging stops
        window.nudgeHideTimer = setTimeout(() => {
            selectedElement.classList.remove('nudging');
        }, 1000);

        let newX = elementState.position.x;
        let newY = elementState.position.y;

        switch (event.key) {
            case 'ArrowLeft':
                event.preventDefault();
                newX = Math.max(0, newX - NUDGE_AMOUNT);
                break;
            case 'ArrowRight':
                event.preventDefault();
                newX = Math.min(100, newX + NUDGE_AMOUNT);
                break;
            case 'ArrowUp':
                event.preventDefault();
                newY = Math.max(0, newY - NUDGE_AMOUNT);
                break;
            case 'ArrowDown':
                event.preventDefault();
                newY = Math.min(100, newY + NUDGE_AMOUNT);
                break;
            default:
                return;
        }

        // Update the element's position in state
        StateManager.update({
            elements: {
                [elementId]: {
                    position: { x: newX, y: newY }
                }
            }
        });
    }
}

/**
 * Sets up the global wheel event handler for resizing elements.
 */
export function setupWheelResizeListener() {
    logger.debug('Setting up global wheel resize listener...');
    const elementsContainer = document.getElementById('elements-container');
    if (!elementsContainer) {
        logger.error('Cannot setup wheel resize: elements-container not found');
        return;
    }
    // Remove previous listener if any to prevent duplicates during hot-reloading/re-init
    elementsContainer.removeEventListener('wheel', handleWheelResize);
    elementsContainer.addEventListener('wheel', handleWheelResize, { passive: false });
    logger.debug('Wheel resize listener attached to elements-container');
}

/**
 * Global wheel event handler for resizing elements.
 * Determines which element is under the cursor and resizes it.
 * @param {WheelEvent} event - The wheel event.
 */
function handleWheelResize(event) {
    // Prevent default scrolling behavior associated with the wheel event
    event.preventDefault();

    // Find the element under the cursor, traversing up to find a '.base-element'
    let currentElement = event.target;
    let elementId = null;
    while (currentElement && currentElement !== document.body) {
        if (currentElement.classList?.contains('base-element')) {
            elementId = currentElement.id;
            break;
        }
        currentElement = currentElement.parentElement;
    }

    if (!elementId) {
        // console.log('Wheel event outside a base-element.');
        return; // Exit if no target element found
    }

    // Get the current state for the target element
    const elementState = StateManager.getNestedValue(StateManager.getState(), `elements.${elementId}`);
    if (!elementState) {
        logger.warn(`No state found for element ID: ${elementId}`);
        return; // Exit if no state exists for the element
    }

    // Check if the element is resizable (assuming a capability check or similar)
    // For now, we assume elements with 'scale' are resizable. A more robust check
    // using ComponentRegistry.getElementCapabilities(elementState.type) might be better.
    if (typeof elementState.scale === 'undefined') {
        // console.log(`Element ${elementId} is not resizable (no scale property).`);
        return; // Exit if the element doesn't have a scale property
    }

    // Calculate the new scale based on wheel direction and sensitivity
    const currentScale = elementState.scale ?? 1.0; // Default to 1.0 if scale is missing
    const sensitivity = StyleHandler.SCALE_STEP;
    const scaleChange = event.deltaY > 0 ? -sensitivity : sensitivity; // deltaY > 0 is wheel down/away
    let newScale = currentScale + scaleChange;

    // Clamp the new scale within defined min/max boundaries
    newScale = Math.max(StyleHandler.MIN_SCALE, Math.min(StyleHandler.MAX_SCALE, newScale));

    // Update the state only if the scale has changed significantly
    if (Math.abs(newScale - currentScale) > 0.001) {
        // console.log(`Resizing ${elementId}: ${currentScale.toFixed(2)} -> ${newScale.toFixed(2)}`);
        StateManager.update({
            elements: {
                [elementId]: {
                    scale: newScale
                }
            }
        });
    }
}

/**
 * Handle keyup events
 * @param {KeyboardEvent} event - The keyboard event.
 */
function handleKeyUp(event) {
    // Hide outline when Ctrl is released
    if (!event.ctrlKey) {
        const selectedElement = document.querySelector('.base-element.selected');
        if (selectedElement) {
            selectedElement.classList.remove('nudging');
        }
    }
}

/**
 * Removes all global listeners set up by this module.
 */
export function removeGlobalListeners() {
    logger.debug('Removing global listeners...');
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
    document.body.removeEventListener('click', handleBodyClick);
    document.body.removeEventListener('touchstart', handleTouchStart);

    // Remove selection listeners from elements
    document.querySelectorAll('.base-element').forEach(element => {
        element.removeEventListener('click', handleElementClick);
    });

    const elementsContainer = document.getElementById('elements-container');
    if (elementsContainer) {
        elementsContainer.removeEventListener('wheel', handleWheelResize);
    }
    controlPanelInstance = null; // Clear the stored instance
    logger.debug('Global listeners removed.');
}
