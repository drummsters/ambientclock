/**
 * Visibility utility for the Ambient Clock application
 * Centralizes UI component visibility management
 */

import { addClass, removeClass } from './dom.js';

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
        this.element = element;
        this.hideDelay = hideDelay;
        this.onShow = onShow;
        this.onHide = onHide;
        this.hideTimerId = null;
        this.isHovering = false;
        this.isVisible = false;
        
        // Set up hover tracking if the element exists
        if (element) {
            element.addEventListener('mouseenter', () => this.handleMouseEnter());
            element.addEventListener('mouseleave', () => this.handleMouseLeave());
        }
    }
    
    /**
     * Handles mouse enter event
     */
    handleMouseEnter() {
        this.isHovering = true;
        this.clearHideTimer();
    }
    
    /**
     * Handles mouse leave event
     */
    handleMouseLeave() {
        this.isHovering = false;
        this.startHideTimer();
    }
    
    /**
     * Shows the element
     */
    show() {
        if (!this.element) return;
        
        addClass(this.element, 'visible');
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
        if (!this.element) return;
        if (this.isHovering && !force) return;
        
        removeClass(this.element, 'visible');
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
            this.hide();
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
        if (!forceHideAfterDelay && this.isHovering) return;
        
        // Clear any existing timer
        this.clearHideTimer();
        
        // Set new timer
        this.hideTimerId = setTimeout(() => {
            if (forceHideAfterDelay) {
                this.forceHide();
            } else {
                this.hide();
            }
            this.hideTimerId = null;
        }, this.hideDelay);
    }
    
    /**
     * Clears the auto-hide timer
     */
    clearHideTimer() {
        if (this.hideTimerId) {
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
