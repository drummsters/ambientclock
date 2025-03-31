/**
 * Mobile utility functions for the Ambient Clock application
 * Handles touch events and mobile-specific behaviors
 */

/**
 * Initializes mobile-specific event handlers
 */
export function initMobileHandlers() {
    // Prevent default touch behaviors that might cause dragging or scrolling
    document.addEventListener('touchmove', preventTouchMove, { passive: false });
    document.addEventListener('touchstart', preventTouchStart, { passive: false });
    
    // Prevent pull-to-refresh on mobile browsers
    document.body.addEventListener('touchstart', preventPullToRefresh, { passive: false });
    
    // Prevent context menu on long press
    document.addEventListener('contextmenu', preventContextMenu);
    
    // Handle iOS specific issues
    handleIOSSpecificIssues();
    
    console.log("Mobile event handlers initialized");
}

/**
 * Prevents default touch move behavior
 * @param {TouchEvent} event - The touch event
 */
function preventTouchMove(event) {
    // Allow touch events only on controls panel and its children
    if (isControlsElement(event.target)) {
        return;
    }
    
    // Prevent default for all other elements
    event.preventDefault();
}

/**
 * Prevents default touch start behavior
 * @param {TouchEvent} event - The touch event
 */
function preventTouchStart(event) {
    // Allow touch events only on controls panel and its children
    if (isControlsElement(event.target)) {
        return;
    }
    
    // Prevent default for all other elements to avoid any potential dragging
    if (event.touches.length > 1) {
        event.preventDefault(); // Prevent pinch zoom
    }
}

/**
 * Prevents pull-to-refresh behavior on mobile browsers
 * @param {TouchEvent} event - The touch event
 */
function preventPullToRefresh(event) {
    // Prevent pull-to-refresh only if the touch starts at the top of the page
    if (window.scrollY === 0) {
        event.preventDefault();
    }
}

/**
 * Prevents context menu on long press
 * @param {Event} event - The context menu event
 */
function preventContextMenu(event) {
    event.preventDefault();
}

/**
 * Checks if the element is part of the controls panel
 * @param {HTMLElement} element - The element to check
 * @returns {boolean} True if the element is part of the controls panel
 */
function isControlsElement(element) {
    // Check if the element or any of its parents have the id 'controls'
    let currentElement = element;
    
    while (currentElement) {
        if (currentElement.id === 'controls') {
            return true;
        }
        currentElement = currentElement.parentElement;
    }
    
    return false;
}

/**
 * Handles iOS specific issues
 */
function handleIOSSpecificIssues() {
    // Fix for iOS Safari 100vh issue
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    
    if (isIOS) {
        // Set the height of html and body to window.innerHeight
        const setHeight = () => {
            document.documentElement.style.height = `${window.innerHeight}px`;
            document.body.style.height = `${window.innerHeight}px`;
        };
        
        // Set height initially and on resize
        setHeight();
        window.addEventListener('resize', setHeight);
        
        // Also update on orientation change
        window.addEventListener('orientationchange', () => {
            // Delay the height update to ensure it happens after the orientation change is complete
            setTimeout(setHeight, 200);
        });
    }
}
