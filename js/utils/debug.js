/**
 * Debug utilities for the Ambient Clock application
 * These functions are intended for development and debugging purposes
 */

import { STORAGE_KEY } from '../config.js';
import { resetSettings } from '../state.js';

// Debug mode flag - set by URL parameter ?debug=true
let debugMode = false;

// Initialize debug mode
initDebugMode();

/**
 * Initializes debug mode based on URL parameters
 */
function initDebugMode() {
    const urlParams = new URLSearchParams(window.location.search);
    debugMode = urlParams.get('debug') === 'true';
    
    if (debugMode) {
        console.log('%c[DEBUG MODE ENABLED]', 'background: #f44336; color: white; padding: 2px 5px; border-radius: 3px;');
        setupVisualDebugging();
    }
}

/**
 * Sets up visual debugging indicators
 */
function setupVisualDebugging() {
    // Create debug indicator container
    const debugIndicator = document.createElement('div');
    debugIndicator.id = 'debug-indicator';
    debugIndicator.style.position = 'fixed';
    debugIndicator.style.top = '5px';
    debugIndicator.style.right = '5px';
    debugIndicator.style.zIndex = '9999';
    debugIndicator.style.display = 'flex';
    debugIndicator.style.flexDirection = 'column';
    debugIndicator.style.gap = '5px';
    document.body.appendChild(debugIndicator);
    
    // Create timer indicator
    const timerIndicator = document.createElement('div');
    timerIndicator.id = 'timer-indicator';
    timerIndicator.style.width = '10px';
    timerIndicator.style.height = '10px';
    timerIndicator.style.borderRadius = '50%';
    timerIndicator.style.backgroundColor = '#ccc';
    timerIndicator.style.transition = 'background-color 0.2s ease';
    debugIndicator.appendChild(timerIndicator);
    
    // Create hover indicator
    const hoverIndicator = document.createElement('div');
    hoverIndicator.id = 'hover-indicator';
    hoverIndicator.style.width = '10px';
    hoverIndicator.style.height = '10px';
    hoverIndicator.style.borderRadius = '50%';
    hoverIndicator.style.backgroundColor = '#ccc';
    hoverIndicator.style.transition = 'background-color 0.2s ease';
    debugIndicator.appendChild(hoverIndicator);
    
    // Add CSS for hover debugging
    const style = document.createElement('style');
    style.textContent = `
        .debug-hover-outline {
            outline: 2px solid rgba(33, 150, 243, 0.5) !important;
            outline-offset: 2px !important;
        }
        .debug-state-transition {
            animation: debug-flash 0.5s ease !important;
        }
        @keyframes debug-flash {
            0%, 100% { background-color: transparent; }
            50% { background-color: rgba(255, 193, 7, 0.2); }
        }
    `;
    document.head.appendChild(style);
    
    // Add hover tracking to all interactive elements
    document.querySelectorAll('button, select, input, a, [role="button"]').forEach(el => {
        el.addEventListener('mouseenter', () => {
            el.classList.add('debug-hover-outline');
            hoverIndicator.style.backgroundColor = '#2196F3';
            logDebug('hover', `Element hovered: ${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}`);
        });
        
        el.addEventListener('mouseleave', () => {
            el.classList.remove('debug-hover-outline');
            hoverIndicator.style.backgroundColor = '#ccc';
            logDebug('hover', `Element unhovered: ${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}`);
        });
    });
    
    // Expose debug indicators to global scope
    window.ambientClock = window.ambientClock || {};
    window.ambientClock.debugIndicators = {
        timer: timerIndicator,
        hover: hoverIndicator
    };
}

/**
 * Checks if debug mode is enabled
 * @returns {boolean} True if debug mode is enabled
 */
export function isDebugMode() {
    return debugMode;
}

/**
 * Logs a debug message with context
 * @param {string} category - The category of the debug message
 * @param {string} message - The debug message
 * @param {Object} [data] - Optional data to log
 */
export function logDebug(category, message, data) {
    if (!debugMode) return;
    
    const timestamp = new Date().toISOString().split('T')[1].slice(0, -1);
    let style = '';
    
    switch (category) {
        case 'state':
            style = 'color: #9C27B0'; // Purple for state changes
            break;
        case 'event':
            style = 'color: #4CAF50'; // Green for events
            break;
        case 'timer':
            style = 'color: #F44336'; // Red for timers
            if (window.ambientClock?.debugIndicators?.timer) {
                window.ambientClock.debugIndicators.timer.style.backgroundColor = '#F44336';
                setTimeout(() => {
                    window.ambientClock.debugIndicators.timer.style.backgroundColor = '#ccc';
                }, 500);
            }
            break;
        case 'hover':
            style = 'color: #2196F3'; // Blue for hover events
            break;
        case 'api':
            style = 'color: #FF9800'; // Orange for API calls
            break;
        default:
            style = 'color: #607D8B'; // Blue-grey for other
    }
    
    if (data) {
        console.groupCollapsed(`%c[${category.toUpperCase()}] ${timestamp} - ${message}`, style);
        console.log(data);
        console.groupEnd();
    } else {
        console.log(`%c[${category.toUpperCase()}] ${timestamp} - ${message}`, style);
    }
}

/**
 * Logs a state change
 * @param {string} component - The component name
 * @param {string} property - The property that changed
 * @param {*} oldValue - The old value
 * @param {*} newValue - The new value
 */
export function logStateChange(component, property, oldValue, newValue) {
    if (!debugMode) return;
    
    logDebug('state', `${component}.${property} changed`, {
        from: oldValue,
        to: newValue,
        diff: typeof newValue === 'object' ? 
            JSON.stringify(newValue, null, 2) : 
            `${oldValue} → ${newValue}`
    });
}

/**
 * Logs an event
 * @param {string} component - The component name
 * @param {string} event - The event name
 * @param {Object} [details] - Event details
 */
export function logEvent(component, event, details) {
    if (!debugMode) return;
    
    logDebug('event', `${component} ${event}`, details);
}

/**
 * Logs a timer operation
 * @param {string} component - The component name
 * @param {string} operation - The timer operation (start, stop, clear)
 * @param {string} timerId - The timer ID or name
 * @param {number} [delay] - The timer delay in ms
 */
export function logTimer(component, operation, timerId, delay) {
    if (!debugMode) return;
    
    logDebug('timer', `${component} ${operation} timer ${timerId}${delay ? ` (${delay}ms)` : ''}`);
}

/**
 * Logs an API call
 * @param {string} api - The API name
 * @param {string} endpoint - The endpoint being called
 * @param {Object} [params] - The parameters sent
 */
export function logApiCall(api, endpoint, params) {
    if (!debugMode) return;
    
    logDebug('api', `${api} API call to ${endpoint}`, params);
}

/**
 * Marks a state transition for a component
 * @param {HTMLElement} element - The element transitioning states
 * @param {string} fromState - The previous state
 * @param {string} toState - The new state
 */
export function markStateTransition(element, fromState, toState) {
    if (!debugMode || !element) return;
    
    // Add and remove class to trigger animation
    element.classList.add('debug-state-transition');
    setTimeout(() => {
        element.classList.remove('debug-state-transition');
    }, 500);
    
    logDebug('state', `Element state transition: ${fromState} → ${toState}`, {
        element: element.tagName.toLowerCase() + (element.id ? `#${element.id}` : '')
    });
}

/**
 * Clears the localStorage for the Ambient Clock application
 * This function can be called from the browser console to reset all settings
 * @returns {boolean} True if localStorage was successfully cleared
 */
export function clearLocalStorage() {
    try {
        // Remove the specific storage key for this application
        localStorage.removeItem(STORAGE_KEY);
        console.log(`LocalStorage cleared for key: ${STORAGE_KEY}`);
        
        // Reset settings to defaults
        resetSettings();
        console.log("Settings reset to defaults");
        
        // Return true to indicate success
        return true;
    } catch (error) {
        console.error("Failed to clear localStorage:", error);
        return false;
    }
}

/**
 * Resets all settings and reloads the page
 * This function can be called from the browser console to completely reset the application
 */
export function resetAndReload() {
    clearLocalStorage();
    window.location.reload();
    return "Reloading page...";
}

/**
 * Toggles debug mode
 * This function can be called from the browser console to toggle debug mode
 */
export function toggleDebugMode() {
    const url = new URL(window.location.href);
    
    if (debugMode) {
        url.searchParams.delete('debug');
        console.log("Disabling debug mode and reloading...");
    } else {
        url.searchParams.set('debug', 'true');
        console.log("Enabling debug mode and reloading...");
    }
    
    window.location.href = url.toString();
    return "Reloading page...";
}

// Make functions available globally for console access
window.ambientClock = window.ambientClock || {};
window.ambientClock.clearLocalStorage = clearLocalStorage;
window.ambientClock.resetAndReload = resetAndReload;
window.ambientClock.toggleDebugMode = toggleDebugMode;
window.ambientClock.debugMode = debugMode;

// Log a message to indicate debug utilities are available
console.log("Ambient Clock debug utilities loaded. Available commands:");
console.log("- ambientClock.clearLocalStorage() - Clears saved settings");
console.log("- ambientClock.resetAndReload() - Clears settings and reloads the page");
console.log("- ambientClock.toggleDebugMode() - Toggles debug mode");
console.log(`- Debug mode is currently ${debugMode ? 'ENABLED' : 'DISABLED'}`);
console.log("- Add ?debug=true to URL to enable debug mode");
