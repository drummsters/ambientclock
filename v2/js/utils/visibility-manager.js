/**
 * Visibility utility adapted from V1 for the Ambient Clock V2 application
 * Centralizes UI component visibility management with auto-hide.
 * Integrates with StateManager and EventBus.
 */
import { StateManager } from '../core/state-manager.js';
import { EventBus } from '../core/event-bus.js'; // Import EventBus

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
            visibleClass: 'visible',
            showOnActivityWhenClosed: true, // Default to true
            ...options
        };

        // State properties
        this.controlsOpen = false; // Track controls panel state
        this.activityDetected = false; // Track if mouse activity happened recently
        this.isVisible = false; // Overall visibility state for managed elements

        // Timers
        this.initialShowTimer = null;
        this.mouseIdleTimer = null;
        this.mouseMoveTimer = null;

        // Listeners - store bound versions for easy removal
        this.boundHandleActivity = this.handleActivity.bind(this);
        this.boundHandleControlsVisibilityChange = this.handleControlsVisibilityChange.bind(this);
        this.boundHandleBlur = this.handleBlur.bind(this);

        // State subscription
        this.unsubscribeControlsVisibility = null;
    }

    // --- Initialization ---

    /**
     * Initializes the manager: resolves elements, sets up listeners and timers.
     */
    init() {
        console.log('[VisibilityManager] Initializing...');
        // Resolve element IDs to actual elements
        this.managedElements = this.elementIds
            .map(id => document.getElementById(id))
            .filter(el => el !== null); // Filter out elements not found

        if (this.managedElements.length === 0) {
            console.warn('[VisibilityManager] No valid elements found to manage.');
            return; // Nothing to manage
        }
        console.log('[VisibilityManager] Managing elements:', this.managedElements.map(el => el.id));

        // Get initial controls state
        this.controlsOpen = this.stateManager.getState().settings?.controls?.isOpen || false;

        // Set up global listeners
        document.addEventListener('mousemove', this.boundHandleActivity, { passive: true });
        // Consider adding other activity triggers like 'scroll', 'keydown' if needed
        window.addEventListener('blur', this.boundHandleBlur);

        // Subscribe to controls state changes via EventBus
        const eventName = 'state:settings.controls.isOpen:changed';
        console.log(`[VisibilityManager] Subscribing to EventBus event: ${eventName}`);
        this.unsubscribeControlsVisibility = EventBus.subscribe(
            eventName,
            this.boundHandleControlsVisibilityChange // Use the bound handler directly
        );

        // Initial visibility check after a delay
        this.initialShowTimer = setTimeout(() => {
            this.updateVisibility();
        }, this.options.initialShowDelay);

        console.log('[VisibilityManager] Initialized.');
    }

    // --- Core Logic ---

    /**
     * Updates the visibility of managed elements based on current state.
     */
    updateVisibility() {
        const managedIds = this.managedElements.map(el => el.id).join(', ') || 'none';
        console.log(`[VisibilityManager managing: ${managedIds}] updateVisibility called. Controls open: ${this.controlsOpen}, Activity detected: ${this.activityDetected}`);
        clearTimeout(this.mouseMoveTimer); // Clear pending show timer

        if (this.controlsOpen) {
            // If controls are open, always show managed elements
            console.log(`[VisibilityManager managing: ${managedIds}] Controls are open, showing elements.`);
            this.showManagedElements();
            this.clearIdleTimer(); // No auto-hide when controls are open
        } else {
            // If controls are closed...
            // Check if we should show on activity based on the option
            if (this.options.showOnActivityWhenClosed && this.activityDetected) {
                // Show based on activity, then auto-hide
                console.log(`[VisibilityManager managing: ${managedIds}] Controls closed, activity detected (showOnActivityWhenClosed=true), showing elements and resetting idle timer.`);
                this.showManagedElements();
                this.resetIdleTimer(); // Start timer to hide after inactivity
            } else {
                // Hide if controls are closed AND (either showOnActivityWhenClosed is false OR no activity was detected)
                console.log(`[VisibilityManager managing: ${managedIds}] Controls closed, hiding elements (showOnActivityWhenClosed=${this.options.showOnActivityWhenClosed}, activityDetected=${this.activityDetected}).`);
                console.log(`[VisibilityManager managing: ${managedIds}] Controls closed, no activity, hiding elements.`);
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
            // console.log(`[VisibilityManager managing: ${managedIds}] showManagedElements called, but already visible.`);
            return; // Already visible
        }
        console.log(`[VisibilityManager managing: ${managedIds}] Applying class '${this.options.visibleClass}' to elements.`);
        this.managedElements.forEach(el => addClass(el, this.options.visibleClass));
        this.isVisible = true;
    }

    /**
     * Removes the visible class from all managed elements.
     */
    hideManagedElements() {
        const managedIds = this.managedElements.map(el => el.id).join(', ') || 'none';
        if (!this.isVisible) {
            // console.log(`[VisibilityManager managing: ${managedIds}] hideManagedElements called, but already hidden.`);
            return; // Already hidden
        }
        console.log(`[VisibilityManager managing: ${managedIds}] Removing class '${this.options.visibleClass}' from elements.`);
        this.managedElements.forEach(el => removeClass(el, this.options.visibleClass));
        this.isVisible = false;
        this.clearIdleTimer(); // Ensure idle timer is cleared when hiding
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
        console.log(`[VisibilityManager managing: ${managedIds}] Received controls state change: ${isOpen}`);
        if (this.controlsOpen !== isOpen) {
            this.controlsOpen = isOpen;
            console.log(`[VisibilityManager managing: ${managedIds}] State updated. Calling updateVisibility.`);
            this.updateVisibility(); // Re-evaluate visibility based on new state
        } else {
            console.log(`[VisibilityManager managing: ${managedIds}] State unchanged (${isOpen}), skipping update.`);
        }
    }

    /**
     * Handles window blur event (e.g., user switches tabs).
     */
    handleBlur() {
        console.log('[VisibilityManager] Window blurred, hiding elements.');
        // Force hide immediately when window loses focus
        this.hideManagedElements();
        this.clearIdleTimer();
        clearTimeout(this.mouseMoveTimer);
        clearTimeout(this.initialShowTimer);
    }

    // --- Timers ---

    /**
     * Resets the idle timer to hide elements after inactivity.
     */
    resetIdleTimer() {
        this.clearIdleTimer();
        // Only start timer if elements are currently visible and controls are closed
        if (this.isVisible && !this.controlsOpen) {
            this.mouseIdleTimer = setTimeout(() => {
                console.log('[VisibilityManager] Idle timeout reached, hiding elements.');
                this.activityDetected = false; // Ensure activity flag is false before hiding
                this.hideManagedElements();
            }, this.options.mouseIdleHideDelay);
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
        console.log('[VisibilityManager] Destroying...');
        // Clear timers
        clearTimeout(this.initialShowTimer);
        clearTimeout(this.mouseIdleTimer);
        clearTimeout(this.mouseMoveTimer);
        this.initialShowTimer = null;
        this.mouseIdleTimer = null;
        this.mouseMoveTimer = null;

        // Remove global listeners
        document.removeEventListener('mousemove', this.boundHandleActivity);
        window.removeEventListener('blur', this.boundHandleBlur);

        // Unsubscribe from EventBus state changes
        if (typeof this.unsubscribeControlsVisibility === 'function') {
            console.log('[VisibilityManager] Unsubscribing from EventBus state changes.');
            this.unsubscribeControlsVisibility(); // Call the unsubscribe function from EventBus
        }
        this.unsubscribeControlsVisibility = null;

        // Clear element references
        this.managedElements = [];
        this.elementIds = [];

        console.log('[VisibilityManager] Destroyed.');
    }
}
