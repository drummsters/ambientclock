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
            initialShowDelay: 2000,
            mouseIdleHideDelay: 3000,
            mouseMoveShowDelay: 200,
            mouseLeaveHideDelay: 1000, // Added default for mouse leave
            visibleClass: 'visible',
            showOnActivityWhenClosed: true, // Default to true
            ...options
        };

        // State properties
        this.controlsOpen = false; // Track controls panel state
        this.activityDetected = false; // Track if mouse activity happened recently
        this.isVisible = false; // Overall visibility state for managed elements
        this.isMouseOverManagedElement = false; // Track hover state over managed elements

        // Timers
        // this.initialShowTimer = null; // Removed initial show timer
        this.mouseIdleTimer = null;
        this.mouseMoveTimer = null;
        this.mouseLeaveHideTimer = null; // Added timer for mouse leave

        // Listeners - store bound versions for easy removal
        this.boundHandleActivity = this.handleActivity.bind(this);
        this.boundHandleControlsVisibilityChange = this.handleControlsVisibilityChange.bind(this);
        this.boundHandleBlur = this.handleBlur.bind(this);
        this.boundHandleMouseLeave = this.handleMouseLeave.bind(this); // Added mouse leave handler (window)
        this.boundHandleMouseEnter = this.handleMouseEnter.bind(this); // Added mouse enter handler (window)
        this.boundHandleManagedElementMouseEnter = this.handleManagedElementMouseEnter.bind(this); // Added mouse enter handler (element)
        this.boundHandleManagedElementMouseLeave = this.handleManagedElementMouseLeave.bind(this); // Added mouse leave handler (element)

        // State subscription
        this.unsubscribeControlsVisibility = null;

        // Bind methods once
        this._bindMethods();
    }

    /** Binds class methods to the instance for consistent listener removal. */
    _bindMethods() {
        this.boundHandleActivity = this.handleActivity.bind(this);
        this.boundHandleControlsVisibilityChange = this.handleControlsVisibilityChange.bind(this);
        this.boundHandleBlur = this.handleBlur.bind(this);
        this.boundHandleMouseLeave = this.handleMouseLeave.bind(this);
        this.boundHandleMouseEnter = this.handleMouseEnter.bind(this);
        this.boundHandleManagedElementMouseEnter = this.handleManagedElementMouseEnter.bind(this);
        this.boundHandleManagedElementMouseLeave = this.handleManagedElementMouseLeave.bind(this);
    }

    // --- Initialization ---

    /**
     * Initializes the manager: resolves elements, sets up listeners and timers.
     */
    init() {
        logger.debug('[VisibilityManager] Initializing...'); // Keep as log
        // Resolve element IDs to actual elements
        this.managedElements = this.elementIds
            .map(id => document.getElementById(id))
            .filter(el => el !== null); // Filter out elements not found

        if (this.managedElements.length === 0) {
            logger.warn('[VisibilityManager] No valid elements found to manage.'); // Keep as warn
            return; // Nothing to manage
        }
        logger.debug('[VisibilityManager] Managing elements:', this.managedElements.map(el => el.id)); // Keep as log

        // Get initial controls state
        this.controlsOpen = this.stateManager.getState().settings?.controls?.isOpen || false;

        // Add all event listeners
        this._addEventListeners();

        // Initial visibility check after a delay - REMOVED
        // this.initialShowTimer = setTimeout(() => {
        //     this.updateVisibility();
        // }, this.options.initialShowDelay);

        // Ensure elements start hidden
        this.hideManagedElements();
        logger.debug('[VisibilityManager] Initialized and elements initially hidden.'); // Keep as log
    }

    // --- Core Logic ---

    /**
     * Updates the visibility of managed elements based on current state.
     */
    updateVisibility() {
        const managedIds = this.managedElements.map(el => el.id).join(', ') || 'none';
        // Read the current state directly from StateManager each time
        const currentControlsOpen = this.stateManager.getState().settings?.controls?.isOpen || false;

        // --- DETAILED LOGGING COMMENTED OUT ---
        // logger.debug(`[VisibilityManager Update - Instance: ${managedIds}] State Check: internalControlsOpen=${this.controlsOpen}, currentControlsOpen=${currentControlsOpen}, activityDetected=${this.activityDetected}, showOnActivityWhenClosed=${this.options.showOnActivityWhenClosed}`);
        // --- END DETAILED LOGGING COMMENTED OUT ---
        clearTimeout(this.mouseMoveTimer); // Clear pending show timer

        // Use the freshly read state for the decision logic
        if (currentControlsOpen) {
            // If controls are open, always show managed elements
            logger.debug(`[VisibilityManager managing: ${managedIds}] Controls are open, showing elements.`); // Changed to debug
            this.showManagedElements();
            this.clearIdleTimer(); // No auto-hide when controls are open
        } else {
            // If controls are closed (using currentControlsOpen)...
            // Check if we should show on activity based on the option
            if (this.options.showOnActivityWhenClosed && this.activityDetected) {
                // Show based on activity, then auto-hide
                logger.debug(`[VisibilityManager managing: ${managedIds}] Controls closed, activity detected (showOnActivityWhenClosed=true), showing elements and resetting idle timer.`); // Changed to debug
                this.showManagedElements();
                this.resetIdleTimer(); // Start timer to hide after inactivity
            } else {
                // Hide if controls are closed AND (either showOnActivityWhenClosed is false OR no activity was detected)
        logger.debug(`[VisibilityManager managing: ${managedIds}] Controls closed, hiding elements (showOnActivityWhenClosed=${this.options.showOnActivityWhenClosed}, activityDetected=${this.activityDetected}).`); // Changed to debug
        // logger.debug(`[VisibilityManager managing: ${managedIds}] Controls closed, no activity, hiding elements.`); // Redundant log
        this.hideManagedElements();
            }
        }
        // Reset activity flag after check
        this.activityDetected = false;
    }

    /**
     * Applies the visible class to all managed elements.
     */
    showManagedElements() {
        const managedIds = this.managedElements.map(el => el.id).join(', ') || 'none';
        if (this.isVisible) {
            // logger.debug(`[VisibilityManager managing: ${managedIds}] showManagedElements called, but already visible.`); // Keep commented
            return; // Already visible
        }
        logger.debug(`[VisibilityManager managing: ${managedIds}] Applying class '${this.options.visibleClass}' to elements.`); // Changed to debug
        this.managedElements.forEach(el => {
            logger.debug(`[VisibilityManager] Adding .visible to ${el.id}`); // Changed to debug
            addClass(el, this.options.visibleClass);
        });
        this.isVisible = true;
        this.clearMouseLeaveTimer(); // Clear leave timer when explicitly shown
    }

    /**
     * Removes the visible class from all managed elements.
     */
    hideManagedElements() {
        const managedIds = this.managedElements.map(el => el.id).join(', ') || 'none';
        if (!this.isVisible) {
            // logger.debug(`[VisibilityManager managing: ${managedIds}] hideManagedElements called, but already hidden.`); // Keep commented
            return; // Already hidden
        }
        logger.debug(`[VisibilityManager managing: ${managedIds}] Removing class '${this.options.visibleClass}' from elements.`); // Changed to debug
        this.managedElements.forEach(el => {
            logger.debug(`[VisibilityManager] Removing .visible from ${el.id}`); // Changed to debug
            removeClass(el, this.options.visibleClass);
        });
        this.isVisible = false;
        this.clearIdleTimer(); // Ensure idle timer is cleared when hiding
        this.clearMouseLeaveTimer(); // Ensure leave timer is cleared when hiding
    }

    // --- Event Handlers ---

    /**
     * Handles global mouse activity.
     */
    handleActivity() {
        this.activityDetected = true;
        // Use a short timer to trigger visibility update after mouse moves
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
        // Log which elements this instance manages for context
        const managedIds = this.managedElements.map(el => el.id).join(', ') || 'none';
        logger.debug(`[VisibilityManager managing: ${managedIds}] Received controls state change: ${isOpen}`); // Changed to debug
        if (this.controlsOpen !== isOpen) {
            this.controlsOpen = isOpen;
            logger.debug(`[VisibilityManager managing: ${managedIds}] State updated. Calling updateVisibility.`); // Changed to debug
            this.updateVisibility(); // Re-evaluate visibility based on new state
        } else {
            logger.debug(`[VisibilityManager managing: ${managedIds}] State unchanged (${isOpen}), skipping update.`); // Changed to debug
        }
    }

    /**
     * Handles window blur event (e.g., user switches tabs).
     */
    handleBlur() {
        logger.debug('[VisibilityManager] Window blurred, hiding elements.'); // Changed to debug
        // Force hide immediately when window loses focus
        this.hideManagedElements();
        this.clearIdleTimer();
        this.clearMouseLeaveTimer(); // Clear leave timer on blur
        clearTimeout(this.mouseMoveTimer);
        // clearTimeout(this.initialShowTimer); // Timer removed
    }

    /**
     * Handles mouse leaving the document boundaries.
     */
    handleMouseLeave() {
        const managedIds = this.managedElements.map(el => el.id).join(', ') || 'none';
        logger.debug(`[VisibilityManager managing: ${managedIds}] Mouse left window. Starting hide timer (${this.options.mouseLeaveHideDelay}ms).`); // Changed to debug
        this.clearMouseLeaveTimer(); // Clear any existing timer first
        this.mouseLeaveHideTimer = setTimeout(() => {
            logger.debug(`[VisibilityManager managing: ${managedIds}] Mouse leave timeout reached, hiding elements.`); // Changed to debug
            this.hideManagedElements();
        }, this.options.mouseLeaveHideDelay);
    }

    /**
     * Handles mouse entering the document boundaries.
     */
    handleMouseEnter() {
        const managedIds = this.managedElements.map(el => el.id).join(', ') || 'none';
        logger.debug(`[VisibilityManager managing: ${managedIds}] Mouse entered window. Clearing hide timer.`); // Changed to debug
        this.clearMouseLeaveTimer(); // Cancel hiding if mouse re-enters window
    }

    /**
     * Handles mouse entering a managed element.
     */
    handleManagedElementMouseEnter() {
        const managedIds = this.managedElements.map(el => el.id).join(', ') || 'none';
        logger.debug(`[VisibilityManager managing: ${managedIds}] Mouse entered a managed element. Clearing idle timer.`); // Changed to debug
        this.isMouseOverManagedElement = true;
        this.clearIdleTimer(); // Prevent hiding while hovered
    }

    /**
     * Handles mouse leaving a managed element.
     */
    handleManagedElementMouseLeave() {
        const managedIds = this.managedElements.map(el => el.id).join(', ') || 'none';
        logger.debug(`[VisibilityManager managing: ${managedIds}] Mouse left a managed element. Resetting idle timer if applicable.`); // Changed to debug
        this.isMouseOverManagedElement = false;
        // Restart idle timer only if elements are meant to be visible but auto-hiding (e.g., controls closed but activity occurred)
        this.resetIdleTimer();
    }

    // --- Timers ---

    /**
     * Resets the idle timer to hide elements after inactivity, respecting hover state.
     */
    resetIdleTimer() {
        const managedIds = this.managedElements.map(el => el.id).join(', ') || 'none';
        this.clearIdleTimer();
        // Only start timer if elements are currently visible, controls are closed (read directly), AND mouse is not over a managed element
        const currentControlsOpenForTimer = this.stateManager.getState().settings?.controls?.isOpen || false; // Read fresh state again for timer logic
        if (this.isVisible && !currentControlsOpenForTimer && !this.isMouseOverManagedElement) {
            logger.debug(`[VisibilityManager managing: ${managedIds}] Resetting idle timer (${this.options.mouseIdleHideDelay}ms) - controls closed, not hovered.`); // Changed to debug
            this.mouseIdleTimer = setTimeout(() => {
                logger.debug(`[VisibilityManager managing: ${managedIds}] Idle timeout reached (controls closed, not hovered), hiding elements.`); // Changed to debug
                this.activityDetected = false; // Ensure activity flag is false before hiding
                this.hideManagedElements();
            }, this.options.mouseIdleHideDelay);
        } else {
             logger.debug(`[VisibilityManager managing: ${managedIds}] Idle timer not reset (isVisible=${this.isVisible}, currentControlsOpen=${currentControlsOpenForTimer}, isHovered=${this.isMouseOverManagedElement}).`); // Changed to debug
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

    // --- Cleanup ---

    /**
     * Cleans up listeners, timers, and subscriptions.
     */
    destroy() {
        logger.debug('[VisibilityManager] Destroying...'); // Keep as log
        // Clear timers
        // clearTimeout(this.initialShowTimer); // Timer removed
        clearTimeout(this.mouseIdleTimer);
        clearTimeout(this.mouseMoveTimer);
        this.clearMouseLeaveTimer(); // Clear leave timer on destroy
        // this.initialShowTimer = null; // Timer removed
        this.mouseIdleTimer = null;
        this.mouseMoveTimer = null;
        this.mouseLeaveHideTimer = null;

        // Remove all event listeners
        this._removeEventListeners();

        // Clear element references
        this.managedElements = [];
        this.elementIds = [];

        logger.debug('[VisibilityManager] Destroyed.'); // Keep as log
    }

    /** Sets up all necessary event listeners. */
    _addEventListeners() {
        // Global listeners
        document.addEventListener('mousemove', this.boundHandleActivity, { passive: true });
        window.addEventListener('blur', this.boundHandleBlur);
        document.documentElement.addEventListener('mouseleave', this.boundHandleMouseLeave);
        document.documentElement.addEventListener('mouseenter', this.boundHandleMouseEnter);

        // Listeners on managed elements
        this.managedElements.forEach(el => {
            el.addEventListener('mouseenter', this.boundHandleManagedElementMouseEnter);
            el.addEventListener('mouseleave', this.boundHandleManagedElementMouseLeave);
        });

        // EventBus subscription
        const eventName = 'state:settings.controls.isOpen:changed';
        logger.debug(`[VisibilityManager] Subscribing to EventBus event: ${eventName}`); // Changed to debug
        this.unsubscribeControlsVisibility = EventBus.subscribe(
            eventName,
            this.boundHandleControlsVisibilityChange
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

        // EventBus unsubscription
        if (typeof this.unsubscribeControlsVisibility === 'function') {
            logger.debug('[VisibilityManager] Unsubscribing from EventBus state changes.'); // Changed to debug
            this.unsubscribeControlsVisibility();
        }
        this.unsubscribeControlsVisibility = null;
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
}
