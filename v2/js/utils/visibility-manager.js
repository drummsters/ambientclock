/**
 * Visibility utility adapted from V1 for the Ambient Clock V2 application
 * Centralizes UI component visibility management with auto-hide.
 */

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
 * Manages visibility of UI components with auto-hide functionality
 */
export class VisibilityManager {
    /**
     * Creates a new VisibilityManager
     * @param {HTMLElement} element - The element to manage visibility for
     * @param {number} hideDelay - Delay in milliseconds before auto-hiding
     * @param {Function} [onShow] - Optional callback when element is shown
     * @param {Function} [onHide] - Optional callback when element is hidden
     */
    constructor(element, hideDelay, onShow = null, onHide = null) {
        if (!element) {
            throw new Error("VisibilityManager requires a valid HTML element.");
        }
        this.element = element;
        this.hideDelay = hideDelay;
        this.onShow = onShow;
        this.onHide = onHide;
        this.hideTimerId = null;
        this.isHovering = false;
        this.isVisible = false; // Assume hidden initially

        // Set up hover tracking
        this.element.addEventListener('mouseenter', () => this.handleMouseEnter());
        this.element.addEventListener('mouseleave', () => this.handleMouseLeave());

        // Check initial visibility based on class
        this.isVisible = this.element.classList.contains('visible');
    }

    /**
     * Handles mouse enter event
     */
    handleMouseEnter() {
        this.isHovering = true;
        this.clearHideTimer();
        // console.log('[VisibilityManager] Mouse Enter - Hovering:', this.isHovering);
    }

    /**
     * Handles mouse leave event
     */
    handleMouseLeave() {
        this.isHovering = false;
        this.startHideTimer();
        // console.log('[VisibilityManager] Mouse Leave - Hovering:', this.isHovering);
    }

    /**
     * Shows the element
     */
    show() {
        if (this.isVisible) return; // Already visible

        // console.log('[VisibilityManager] Showing element');
        addClass(this.element, 'visible');
        // Use requestAnimationFrame to ensure the class is applied before setting opacity
        requestAnimationFrame(() => {
            addClass(this.element, 'is-open'); // Add is-open for opacity transition
        });
        this.isVisible = true;

        // Clear any existing hide timer
        this.clearHideTimer();

        // Call onShow callback if provided
        if (this.onShow) {
            this.onShow();
        }
    }

    /**
     * Hides the element
     * @param {boolean} [force=false] - Whether to force hiding even if hovering
     */
    hide(force = false) {
        if (!this.isVisible) return; // Already hidden
        if (this.isHovering && !force) {
            // console.log('[VisibilityManager] Hide prevented by hover');
            return; // Don't hide if hovering unless forced
        }

        // console.log('[VisibilityManager] Hiding element (Force:', force, ')');
        removeClass(this.element, 'is-open'); // Remove is-open first for transition
        // Wait for transition to finish before removing 'visible' (adjust time if needed)
        // Using a timeout slightly longer than the CSS transition duration
        setTimeout(() => {
            // Double-check visibility state before removing 'visible'
            // This prevents issues if show() was called during the timeout
            if (!this.isVisible && !this.isHovering) {
                 removeClass(this.element, 'visible');
            }
        }, 350); // Match transition duration + small buffer

        this.isVisible = false;

        // Call onHide callback if provided
        if (this.onHide) {
            this.onHide();
        }
    }

    /**
     * Forces hiding the element regardless of hover state
     */
    forceHide() {
        this.hide(true);
    }

    /**
     * Toggles the element's visibility
     */
    toggle() {
        if (this.isVisible) {
            this.hide(true); // Force hide on toggle off
        } else {
            this.show();
        }
    }

    /**
     * Starts the auto-hide timer
     * @param {boolean} [forceHideAfterDelay=false] - Whether to force hide after delay even if hovering
     */
    startHideTimer(forceHideAfterDelay = false) {
        // If not forcing hide after delay, only start timer if not hovering
        if (!forceHideAfterDelay && this.isHovering) {
            // console.log('[VisibilityManager] StartHideTimer prevented by hover');
            return;
        }

        // Clear any existing timer
        this.clearHideTimer();

        // console.log('[VisibilityManager] Starting hide timer (Delay:', this.hideDelay, 'Force:', forceHideAfterDelay, ')');
        // Set new timer
        this.hideTimerId = setTimeout(() => {
            // console.log('[VisibilityManager] Hide timer expired');
            if (forceHideAfterDelay) {
                this.forceHide();
            } else {
                this.hide(); // Hide only if not hovering
            }
            this.hideTimerId = null;
        }, this.hideDelay);
    }

    /**
     * Clears the auto-hide timer
     */
    clearHideTimer() {
        if (this.hideTimerId) {
            // console.log('[VisibilityManager] Clearing hide timer');
            clearTimeout(this.hideTimerId);
            this.hideTimerId = null;
        }
    }

    /**
     * Checks if the element is currently visible
     * @returns {boolean} True if the element is visible
     */
    isElementVisible() {
        return this.isVisible;
    }
}
