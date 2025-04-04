import { StateManager } from '../core/state-manager.js';
import { StyleHandler } from '../components/base/mixins/StyleHandler.js';
import * as logger from './logger.js'; // Import the logger

// Store reference to control panel instance when setting up listeners
let controlPanelInstance = null;

/**
 * Sets up global keyboard listeners.
 * @param {ControlPanel} panelInstance - The instance of the ControlPanel to toggle.
 */
export function setupGlobalKeyListeners(panelInstance) {
    controlPanelInstance = panelInstance; // Store the instance
    logger.debug('Setting up global key listeners...');
    window.removeEventListener('keydown', handleKeyDown); // Remove previous listener if any
    window.addEventListener('keydown', handleKeyDown);
}

/**
 * Handles keydown events for global shortcuts.
 * @param {KeyboardEvent} event - The keyboard event.
 */
function handleKeyDown(event) {
    // Toggle Control Panel with Space or 'c'
    if (event.code === 'Space' || event.key === 'c') {
        // Prevent default spacebar scroll
        if (event.code === 'Space') {
            event.preventDefault();
        }
        // Check if focus is inside an input field to avoid toggling while typing
        if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'SELECT') {
            controlPanelInstance?.toggleVisibility(); // Use the stored instance
        }
    }
    // Toggle Debug Mode with Ctrl+Shift+Z
    else if (event.ctrlKey && event.shiftKey && event.key === 'Z') { // Changed key from 'D' to 'Z'
        event.preventDefault(); // Prevent default browser action if any
        logger.toggleDebugMode();
    }
    // Example: Handle other global key presses if needed
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
 * Removes all global listeners set up by this module.
 */
export function removeGlobalListeners() {
    logger.debug('Removing global listeners...');
    window.removeEventListener('keydown', handleKeyDown);

    const elementsContainer = document.getElementById('elements-container');
    if (elementsContainer) {
        elementsContainer.removeEventListener('wheel', handleWheelResize);
    }
    controlPanelInstance = null; // Clear the stored instance
    logger.debug('Global listeners removed.');
}
