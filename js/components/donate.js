/**
 * Donate component for the Ambient Clock application
 * Manages the "Buy Me a Coffee" donation widget
 */

import { getElement, addEvent } from '../utils/dom.js';
import { areControlsVisible } from './controls.js';
import { VisibilityManager } from '../utils/visibility.js';

// DOM elements
let donateWidget;
let paymentDropdown;

// Visibility manager for donate widget
let donateVisibility;

/**
 * Initializes the donate component
 */
export function initDonate() {
    // Get DOM elements
    donateWidget = getElement('donate-widget');
    paymentDropdown = getElement('payment-dropdown');
    
    if (!donateWidget) {
        console.error("Donate widget element not found");
        return;
    }
    
    // Initialize visibility manager with 3 second hide delay
    donateVisibility = new VisibilityManager(donateWidget, 3000);
    
    // Set up event listeners
    setupEventListeners();
    
    // Show donate widget initially, then start auto-hide timer
    showDonateWidget();
    
    // Start the auto-hide timer after a short delay to allow the page to load
    // Use forceHideAfterDelay=true to ensure donation widget hides even if mouse is over it
    setTimeout(() => {
        if (donateVisibility) {
            donateVisibility.startHideTimer(true);
        }
    }, 2000); // 2 seconds delay
    
    console.log("Donate widget initialized");
}

/**
 * Sets up event listeners for the donate widget
 */
function setupEventListeners() {
    if (!donateWidget || !paymentDropdown) return;
    
    // Add event listeners to payment options to prevent them from disappearing
    const paymentOptions = paymentDropdown.querySelectorAll('.payment-option a');
    paymentOptions.forEach(option => {
        addEvent(option, 'mouseenter', () => donateVisibility.handleMouseEnter());
    });
    
    // Handle special case for dropdown interaction
    addEvent(paymentDropdown, 'mouseenter', () => donateVisibility.handleMouseEnter());
    addEvent(paymentDropdown, 'mouseleave', (event) => {
        // Only trigger mouseleave if not moving to the main widget
        if (!donateWidget.contains(event.relatedTarget)) {
            donateVisibility.handleMouseLeave();
        }
    });
    
    // Add event listeners to the main donate widget
    addEvent(donateWidget, 'mouseenter', () => donateVisibility.handleMouseEnter());
    addEvent(donateWidget, 'mouseleave', () => {
        donateVisibility.isHovering = false;
        donateVisibility.startHideTimer(true);
    });
    
    // Add event listener for when mouse leaves the window
    document.addEventListener('mouseleave', () => {
        donateVisibility.isHovering = false;
        donateVisibility.startHideTimer(true);
    });
}

/**
 * Shows the donate widget
 */
export function showDonateWidget() {
    if (!donateVisibility) return;
    donateVisibility.show();
}

/**
 * Hides the donate widget
 */
export function hideDonateWidget() {
    if (!donateVisibility) return;
    donateVisibility.hide();
}

/**
 * Updates the donate widget visibility based on controls visibility
 * @param {boolean} controlsVisible - Whether the controls are visible
 */
export function updateDonateWidgetVisibility(controlsVisible) {
    if (!donateVisibility) return;
    
    if (controlsVisible) {
        // Show the donate widget when controls are visible
        donateVisibility.show();
    } else {
        // When controls are hidden, check if mouse is directly over the donate widget
        const isMouseDirectlyOverDonate = donateWidget && donateWidget.matches(':hover');
        
        if (isMouseDirectlyOverDonate) {
            // If mouse is directly over the donate widget, keep it visible
            // but start the hide timer so it will hide after a delay even if mouse is still over it
            donateVisibility.startHideTimer(true);
        } else {
            // If mouse is not over the donate widget, hide it immediately
            donateVisibility.hide();
        }
    }
}
