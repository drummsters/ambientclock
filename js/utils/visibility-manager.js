/**
 * Visibility utility adapted from V1 for the Ambient Clock V2 application
 * Centralizes UI component visibility management with auto-hide.
 * Integrates with StateManager and EventBus.
 */
import { StateManager } from '../core/state-manager.js';
import { EventBus } from '../core/event-bus.js'; // Import EventBus
import * as logger from './logger.js'; // Corrected import path

// --- Simple DOM Helpers (Included directly as utils/dom.js doesn't exist in V2) ---
/**
 * Adds a class to an element if it doesn't already have it.
 * @param {HTMLElement} element - The target element.
 * @param {string} className - The class name to add.
 */
function addClass(element, className) {
    if (element && !element.classList.contains(className)) {
        element.classList.add(className);
    }
}

/**
 * Removes a class from an element if it has it.
 * @param {HTMLElement} element - The target element.
 * @param {string} className - The class name to remove.
 */
function removeClass(element, className) {
    if (element && element.classList.contains(className)) {
        element.classList.remove(className);
    }
}
// --- End DOM Helpers ---


/**
 * Manages visibility of designated UI elements based on global activity and controls state.
 */
export class VisibilityManager {
    /**
     * Creates a new VisibilityManager.
     * @param {StateManager} stateManager - The application's StateManager instance.
     * @param {Array<HTMLElement>} elementsToManage - An array of element IDs to manage.
     * @param {object} options - Configuration options.
     * @param {number} [options.initialShowDelay=2000] - Delay before initial show check.
     * @param {number} [options.mouseIdleHideDelay=3000] - Delay before hiding after mouse stops.
     * @param {number} [options.mouseMoveShowDelay=200] - Delay before showing after mouse moves.
     * @param {number} [options.mouseLeaveHideDelay=1000] - Delay before hiding after mouse leaves window.
     * @param {string} [options.visibleClass='visible'] - CSS class to apply for visibility.
     * @param {boolean} [options.showOnActivityWhenClosed=true] - Whether to show elements on mouse activity when controls are closed.
     */
    constructor(stateManager, elementsToManage = [], options = {}) {
        if (!stateManager) {
            throw new Error("VisibilityManager requires a valid StateManager instance.");
        }
        if (!Array.isArray(elementsToManage)) {
            throw new Error("elementsToManage must be an array of element IDs.");
        }

        this.stateManager = stateManager;
        this.elementIds = elementsToManage; // Store IDs, resolve elements later
        this.managedElements = []; // Store resolved elements

        // Configuration with defaults
        this.options = {
            initialShowDelay: 2000, // Kept for reference, but timer removed
            mouseIdleHideDelay: 3000,
            mouseMoveShowDelay: 200,
            mouseLeaveHideDelay: 1000,
            visibleClass: 'visible',
            showOnActivityWhenClosed: true,
            ...options
        };

        // State properties
        this.controlsOpen = false;
        this.activityDetected = false;
        this.isVisible = false;
        this.isMouseOverManagedElement = false;

        // Timers
        this.mouseIdleTimer = null;
        this.mouseMoveTimer = null;
        this.mouseLeaveHideTimer = null;

        // Listeners - store bound versions for easy removal
        this.boundHandleActivity = this.handleActivity.bind(this);
        this.boundHandleControlsVisibilityChange = this.handleControlsVisibilityChange.bind(this);
        this.boundHandleBlur = this.handleBlur.bind(this);
        this.boundHandleMouseLeave = this.handleMouseLeave.bind(this);
        this.boundHandleMouseEnter = this.handleMouseEnter.bind(this);
        this.boundHandleManagedElementMouseEnter = this.handleManagedElementMouseEnter.bind(this);
        this.boundHandleManagedElementMouseLeave = this.handleManagedElementMouseLeave.bind(this);
        this.boundHandleElementReady = this.handleElementReady.bind(this); // Added for new event

        // State subscription
        this.unsubscribeControlsVisibility = null;
        this.unsubscribeElementReady = null; // Added for new event

        // Bind methods once (already done in constructor)
    }

    /** Binds class methods to the instance for consistent listener removal. */
    _bindMethods() {
        // Already bound in constructor
    }

    // --- Initialization ---

    /**
     * Initializes the manager: resolves elements, sets up listeners and timers.
     */
    init() {
        logger.debug('[VisibilityManager] Initializing...');
        // Resolve element IDs to actual elements immediately
        this.managedElements = this.elementIds
            .map(id => {
                const el = document.getElementById(id);
                if (!el) {
                    logger.warn(`[VisibilityManager] Element ID "${id}" not found during initial init.`);
                }
                return el;
            })
            .filter(el => el !== null); // Filter out elements not found initially

        const initialFoundIds = this.managedElements.map(el => el.id).join(', ') || 'none';
        logger.debug(`[VisibilityManager] Initially found elements: ${initialFoundIds}`);

        // Get initial controls state
        this.controlsOpen = this.stateManager.getState().settings?.controls?.isOpen || false;

        // Add all event listeners (including the new element:ready listener)
        this._addEventListeners();

        // Ensure elements start hidden
        this.hideManagedElements(); // Hide elements found initially
        this.updateVisibility(); // Set initial visibility based on state

        logger.debug('[VisibilityManager] Initialized.');
    }

    // --- Core Logic ---

    /**
     * Updates the visibility of managed elements based on current state.
     */
    updateVisibility() {
        // Check if *any* elements are managed (either found initially or added via event)
        if (this.managedElements.length === 0 && this.elementIds.length > 0) {
             // Don't log constantly if we are still waiting for elements via event
             // logger.debug('[VisibilityManager] updateVisibility called, but no elements managed yet.');
             return;
        }
        const managedIds = this.managedElements.map(el => el.id).join(', ') || 'none';
        const currentControlsOpen = this.stateManager.getState().settings?.controls?.isOpen || false;

        clearTimeout(this.mouseMoveTimer);

        if (currentControlsOpen) {
            logger.debug(`[VisibilityManager managing: ${managedIds}] Controls state is OPEN, showing elements.`);
            this.showManagedElements();
            this.clearIdleTimer();
        } else {
            if (this.options.showOnActivityWhenClosed) {
                if (this.activityDetected) {
                    logger.debug(`[VisibilityManager managing: ${managedIds}] Controls state is CLOSED, but activity detected (showOnActivity=true). Showing temporarily.`);
                    this.showManagedElements();
                    this.resetIdleTimer();
                } else {
                    logger.debug(`[VisibilityManager managing: ${managedIds}] Controls state is CLOSED, no activity detected (showOnActivity=true). Hiding elements.`);
                    this.hideManagedElements();
                }
            } else {
                logger.debug(`[VisibilityManager managing: ${managedIds}] Controls state is CLOSED (showOnActivity=false). Hiding elements.`);
                this.hideManagedElements();
            }
        }
        this.activityDetected = false;
    }

    /**
     * Applies the visible class to all managed elements.
     */
    showManagedElements() {
        if (this.managedElements.length === 0) return;
        const managedIds = this.managedElements.map(el => el.id).join(', ') || 'none';
        if (this.isVisible) return;
        logger.debug(`[VisibilityManager managing: ${managedIds}] Applying class '${this.options.visibleClass}' to elements.`);
        this.managedElements.forEach(el => {
            // logger.debug(`[VisibilityManager] Adding .visible to ${el.id}`); // Reduce noise
            addClass(el, this.options.visibleClass);
        });
        this.isVisible = true;
        this.clearMouseLeaveTimer();
    }

    /**
     * Removes the visible class from all managed elements.
     */
    hideManagedElements() {
        if (this.managedElements.length === 0) return;
        const managedIds = this.managedElements.map(el => el.id).join(', ') || 'none';
        if (!this.isVisible) return;
        logger.debug(`[VisibilityManager managing: ${managedIds}] Removing class '${this.options.visibleClass}' from elements.`);
        this.managedElements.forEach(el => {
            // logger.debug(`[VisibilityManager] Removing .visible from ${el.id}`); // Reduce noise
            removeClass(el, this.options.visibleClass);
        });
        this.isVisible = false;
        this.clearIdleTimer();
        this.clearMouseLeaveTimer();
    }

    // --- Event Handlers ---

     /**
     * Handles the element:ready event from ElementManager.
     * @param {object} eventData - Data containing { id, container }.
     */
    handleElementReady({ id, container }) {
        // Is this an element we are supposed to manage?
        if (this.elementIds.includes(id)) {
            // Have we already found it?
            const alreadyFound = this.managedElements.some(el => el.id === id);
            if (!alreadyFound && container) {
                logger.log(`[VisibilityManager] Received element:ready for missing element: ${id}. Adding to managed list.`);
                this.managedElements.push(container);
                // Add specific listeners for this newly added element
                container.addEventListener('mouseenter', this.boundHandleManagedElementMouseEnter);
                container.addEventListener('mouseleave', this.boundHandleManagedElementMouseLeave);
                // Re-evaluate visibility now that the element is present
                this.updateVisibility();
            } else if (alreadyFound) {
                 // logger.debug(`[VisibilityManager] Received element:ready for already managed element: ${id}. Ignoring.`); // Reduce noise
            } else if (!container) {
                 logger.warn(`[VisibilityManager] Received element:ready for ${id}, but container was missing in event data.`);
            }
        }
    }


    /**
     * Handles global mouse activity.
     */
    handleActivity() {
        if (this.managedElements.length === 0) return;
        this.activityDetected = true;
        clearTimeout(this.mouseMoveTimer);
        this.mouseMoveTimer = setTimeout(() => {
            this.updateVisibility();
        }, this.options.mouseMoveShowDelay);
    }

    /**
     * Handles changes in the controls panel visibility state.
     * @param {boolean} isOpen - The new state of the controls panel.
     */
    handleControlsVisibilityChange(isOpen) {
        const managedIds = this.managedElements.map(el => el.id).join(', ') || 'none';
        logger.debug(`[VisibilityManager managing: ${managedIds}] Received controls state change: ${isOpen}`);
        if (this.controlsOpen !== isOpen) {
            this.controlsOpen = isOpen;
            this.updateVisibility(); // Re-evaluate visibility based on new state
        } else {
            logger.debug(`[VisibilityManager managing: ${managedIds}] State unchanged (${isOpen}), skipping update.`);
        }
    }

    /**
     * Handles window blur event (e.g., user switches tabs).
     */
    handleBlur() {
        if (this.managedElements.length === 0) return;
        logger.debug('[VisibilityManager] Window blurred, hiding elements.');
        this.hideManagedElements();
        this.clearIdleTimer();
        this.clearMouseLeaveTimer();
        clearTimeout(this.mouseMoveTimer);
    }

    /**
     * Handles mouse leaving the document boundaries.
     */
    handleMouseLeave() {
        if (this.managedElements.length === 0) return;
        const managedIds = this.managedElements.map(el => el.id).join(', ') || 'none';
        logger.debug(`[VisibilityManager managing: ${managedIds}] Mouse left window. Starting hide timer (${this.options.mouseLeaveHideDelay}ms).`);
        this.clearMouseLeaveTimer();
        this.mouseLeaveHideTimer = setTimeout(() => {
            logger.debug(`[VisibilityManager managing: ${managedIds}] Mouse leave timeout reached, hiding elements.`);
            this.hideManagedElements();
        }, this.options.mouseLeaveHideDelay);
    }

    /**
     * Handles mouse entering the document boundaries.
     */
    handleMouseEnter() {
        if (this.managedElements.length === 0) return;
        const managedIds = this.managedElements.map(el => el.id).join(', ') || 'none';
        logger.debug(`[VisibilityManager managing: ${managedIds}] Mouse entered window. Clearing hide timer.`);
        this.clearMouseLeaveTimer();
    }

    /**
     * Handles mouse entering a managed element.
     */
    handleManagedElementMouseEnter() {
        if (this.managedElements.length === 0) return;
        const managedIds = this.managedElements.map(el => el.id).join(', ') || 'none';
        logger.debug(`[VisibilityManager managing: ${managedIds}] Mouse entered a managed element. Clearing idle timer.`);
        this.isMouseOverManagedElement = true;
        this.clearIdleTimer();
    }

    /**
     * Handles mouse leaving a managed element.
     */
    handleManagedElementMouseLeave() {
        if (this.managedElements.length === 0) return;
        const managedIds = this.managedElements.map(el => el.id).join(', ') || 'none';
        logger.debug(`[VisibilityManager managing: ${managedIds}] Mouse left a managed element. Resetting idle timer if applicable.`);
        this.isMouseOverManagedElement = false;
        this.resetIdleTimer();
    }

    // --- Timers ---

    /**
     * Resets the idle timer to hide elements after inactivity, respecting hover state.
     */
    resetIdleTimer() {
        if (this.managedElements.length === 0) return;
        const managedIds = this.managedElements.map(el => el.id).join(', ') || 'none';
        this.clearIdleTimer();
        const currentControlsOpenForTimer = this.stateManager.getState().settings?.controls?.isOpen || false;
        if (this.isVisible && !currentControlsOpenForTimer && !this.isMouseOverManagedElement) {
            logger.debug(`[VisibilityManager managing: ${managedIds}] Resetting idle timer (${this.options.mouseIdleHideDelay}ms) - controls closed, not hovered.`);
            this.mouseIdleTimer = setTimeout(() => {
                logger.debug(`[VisibilityManager managing: ${managedIds}] Idle timeout reached (controls closed, not hovered), hiding elements.`);
                this.activityDetected = false;
                this.hideManagedElements();
            }, this.options.mouseIdleHideDelay);
        } else {
             logger.debug(`[VisibilityManager managing: ${managedIds}] Idle timer not reset (isVisible=${this.isVisible}, currentControlsOpen=${currentControlsOpenForTimer}, isHovered=${this.isMouseOverManagedElement}).`);
        }
    }

    /**
     * Clears the idle timer.
     */
    clearIdleTimer() {
        if (this.mouseIdleTimer) {
            clearTimeout(this.mouseIdleTimer);
            this.mouseIdleTimer = null;
        }
    }

    /**
     * Clears the mouse leave hide timer.
     */
    clearMouseLeaveTimer() {
        if (this.mouseLeaveHideTimer) {
            clearTimeout(this.mouseLeaveHideTimer);
            this.mouseLeaveHideTimer = null;
        }
    }

    // --- Cleanup ---

    /**
     * Cleans up listeners, timers, and subscriptions.
     */
    destroy() {
        logger.debug('[VisibilityManager] Destroying...');
        clearTimeout(this.mouseIdleTimer);
        clearTimeout(this.mouseMoveTimer);
        this.clearMouseLeaveTimer();
        this.mouseIdleTimer = null;
        this.mouseMoveTimer = null;
        this.mouseLeaveHideTimer = null;

        this._removeEventListeners(); // Removes all listeners including the new one

        this.managedElements = [];
        this.elementIds = [];

        logger.debug('[VisibilityManager] Destroyed.');
    }

    /** Sets up all necessary event listeners. */
    _addEventListeners() {
        // Global listeners
        document.addEventListener('mousemove', this.boundHandleActivity, { passive: true });
        window.addEventListener('blur', this.boundHandleBlur);
        document.documentElement.addEventListener('mouseleave', this.boundHandleMouseLeave);
        document.documentElement.addEventListener('mouseenter', this.boundHandleMouseEnter);

        // Listeners on managed elements (found initially)
        this.managedElements.forEach(el => {
            el.addEventListener('mouseenter', this.boundHandleManagedElementMouseEnter);
            el.addEventListener('mouseleave', this.boundHandleManagedElementMouseLeave);
        });

        // EventBus subscription for controls state
        const controlsEventName = 'state:settings.controls.isOpen:changed';
        logger.debug(`[VisibilityManager] Subscribing to EventBus event: ${controlsEventName}`);
        this.unsubscribeControlsVisibility = EventBus.subscribe(
            controlsEventName,
            this.boundHandleControlsVisibilityChange
        );

        // EventBus subscription for newly ready elements
        const elementReadyEventName = 'element:ready';
        logger.debug(`[VisibilityManager] Subscribing to EventBus event: ${elementReadyEventName}`);
        this.unsubscribeElementReady = EventBus.subscribe(
            elementReadyEventName,
            this.boundHandleElementReady
        );
    }

    /** Removes all event listeners. */
    _removeEventListeners() {
        // Global listeners
        document.removeEventListener('mousemove', this.boundHandleActivity);
        window.removeEventListener('blur', this.boundHandleBlur);
        document.documentElement.removeEventListener('mouseleave', this.boundHandleMouseLeave);
        document.documentElement.removeEventListener('mouseenter', this.boundHandleMouseEnter);

        // Listeners on managed elements
        this.managedElements.forEach(el => {
             if (el) { // Check if element still exists
                el.removeEventListener('mouseenter', this.boundHandleManagedElementMouseEnter);
                el.removeEventListener('mouseleave', this.boundHandleManagedElementMouseLeave);
             }
        });

        // EventBus unsubscriptions
        if (typeof this.unsubscribeControlsVisibility === 'function') {
            this.unsubscribeControlsVisibility();
        }
        if (typeof this.unsubscribeElementReady === 'function') { // Unsubscribe from new event
            this.unsubscribeElementReady();
        }
        this.unsubscribeControlsVisibility = null;
        this.unsubscribeElementReady = null;
    }
}
