import { EventBus } from '../core/event-bus.js';
// Removed duplicate EventBus import
import { ClockControls } from '../components/controls/clock-controls.js';
import { DateControls } from '../components/controls/date-controls.js';
import * as logger from '../utils/logger.js'; // Import the logger
// Import other dynamic control types here as needed

/**
 * Manages the lifecycle (creation, initialization, destruction) of dynamic
 * control components (like ClockControls, DateControls) based on application events.
 */
export class DynamicControlManager {
    /**
     * Creates a DynamicControlManager instance.
     * @param {object} placeholders - An object containing the placeholder elements for dynamic controls.
     * @param {HTMLElement} placeholders.clockSectionPlaceholder - Placeholder for clock controls.
     * @param {HTMLElement} placeholders.dateSectionPlaceholder - Placeholder for date controls.
     * @param {ElementManager} elementManager - The application's ElementManager instance.
     */
    constructor(placeholders, elementManager) {
        if (!placeholders || !placeholders.clockSectionPlaceholder || !placeholders.dateSectionPlaceholder) {
            throw new Error('DynamicControlManager requires placeholder elements.');
        }
        if (!elementManager) {
            throw new Error('DynamicControlManager requires an ElementManager instance.');
        }
        this.placeholders = placeholders;
        this.elementManager = elementManager;
        this.activeControls = new Map(); // Stores active control instances { elementId: controlsInstance }
        this.subscriptions = [];
        this.controlMap = { // Maps element types to control classes and placeholders
            'clock': { class: ClockControls, placeholder: this.placeholders.clockSectionPlaceholder, title: 'Clock' },
            'date': { class: DateControls, placeholder: this.placeholders.dateSectionPlaceholder, title: 'Date' }
            // Add other mappings here
        };
        logger.log('[DynamicControlManager] Instantiated.'); // Keep as log
    }

    /**
     * Initializes the manager: subscribes to events and handles existing elements.
     */
    init() {
        logger.log('[DynamicControlManager] Initializing...'); // Keep as log
        this._subscribeToEvents();
        this._initializeControlsForExistingElements();
        logger.log('[DynamicControlManager] Initialized.'); // Keep as log
    }

    /**
     * Subscribes to relevant EventBus events.
     */
    _subscribeToEvents() {
        const createdSub = EventBus.subscribe('element:created', ({ id, type }) => {
            logger.debug(`[DynamicControlManager] Received element:created event for ID: ${id}, Type: ${type}`); // Changed to debug
            this._handleElementCreated(id, type);
        });

        const destroyedSub = EventBus.subscribe('element:destroyed', ({ id }) => {
            logger.debug(`[DynamicControlManager] Received element:destroyed event for ID: ${id}`); // Changed to debug
            this._handleElementDestroyed(id);
        });

        this.subscriptions.push(createdSub, destroyedSub);
        logger.log('[DynamicControlManager] Subscribed to element events.'); // Keep as log
    }

    /** Initializes controls for elements that already exist when the manager loads */
    _initializeControlsForExistingElements() {
        const existingElements = this.elementManager.getAllElementInstances();
        logger.debug(`[DynamicControlManager] Found ${existingElements.size} existing elements.`); // Changed to debug
        existingElements.forEach(elementInstance => {
            this._handleElementCreated(elementInstance.id, elementInstance.type);
        });
        logger.debug(`[DynamicControlManager] Finished checking for existing elements.`); // Changed to debug
    }


    /**
     * Handles the creation of a new element by creating its corresponding controls.
     * @param {string} elementId - The ID of the created element.
     * @param {string} elementType - The type of the created element.
     */
    async _handleElementCreated(elementId, elementType) {
        if (this.activeControls.has(elementId)) {
            logger.debug(`[DynamicControlManager] Controls for ${elementId} already exist.`); // Changed to debug
            return; // Avoid adding duplicate controls
        }

        const controlInfo = this.controlMap[elementType];
        if (!controlInfo) {
            logger.debug(`[DynamicControlManager] No specific controls defined for element type: ${elementType}`); // Changed to debug
            return;
        }

        const { class: ControlClass, placeholder: targetContainer, title: sectionTitle } = controlInfo;

        if (!targetContainer) {
            logger.error(`[DynamicControlManager] Placeholder container not found for ${elementType} controls (${elementId})`); // Use logger.error
            return;
        }

        logger.log(`[DynamicControlManager] Initializing ${elementType} controls for ${elementId}`); // Keep as log
        // Clear placeholder content and re-add title (only if no other controls of this type exist?)
        // For simplicity now, we assume one control type per placeholder. If multiple clocks/dates
        // were possible, this logic would need refinement (e.g., appending instead of clearing).
        targetContainer.innerHTML = '';
        const title = document.createElement('h3');
        title.className = 'section-title';
        title.textContent = sectionTitle;
        targetContainer.appendChild(title);

        // Instantiate and initialize controls
        const controlsInstance = new ControlClass(targetContainer, elementId);
        const success = await controlsInstance.init();

        if (success) {
            this.activeControls.set(elementId, controlsInstance);
            logger.log(`[DynamicControlManager] Successfully added controls for ${elementType} element: ${elementId}`); // Keep as log
        } else {
            logger.error(`[DynamicControlManager] Failed to initialize ${elementType} controls for ${elementId}`); // Use logger.error
            controlsInstance?.destroy(); // Clean up failed instance
            // Optionally restore placeholder text?
            // targetContainer.innerHTML = `<p>Error loading ${sectionTitle} controls.</p>`;
        }
    }

    /**
     * Handles the destruction of an element by removing its corresponding controls.
     * @param {string} elementId - The ID of the destroyed element.
     */
    _handleElementDestroyed(elementId) {
        const controls = this.activeControls.get(elementId);
        if (controls) {
            const elementType = controls.constructor.name; // Get class name for logging
            logger.log(`[DynamicControlManager] Removing ${elementType} controls for ${elementId}`); // Keep as log
            controls.destroy(); // Call the control's own destroy method
            this.activeControls.delete(elementId);

            // Optional: Restore placeholder if this was the last control of its type
            // This requires more complex tracking if multiple instances per type are allowed.
            // For now, we assume the placeholder remains empty after the last control is removed.
        } else {
             logger.debug(`[DynamicControlManager] No active controls found for destroyed element ID: ${elementId}`); // Changed to debug
        }
    }

    /**
     * Cleans up the manager, unsubscribing from events and destroying active controls.
     */
    destroy() {
        logger.log('[DynamicControlManager] Destroying...'); // Keep as log
        // Unsubscribe from EventBus listeners
        this.subscriptions.forEach(sub => sub.unsubscribe());
        this.subscriptions = [];

        // Destroy dynamically added element controls
        this.activeControls.forEach(controls => controls.destroy());
        this.activeControls.clear();

        logger.log('[DynamicControlManager] Destroyed.'); // Keep as log
    }
}
