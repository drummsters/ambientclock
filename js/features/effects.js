/**
 * Effects feature for the Ambient Clock application
 * Manages visual effects for clock faces
 */

import { getState, updateState, subscribe } from '../state.js';
import { getElement, addClass, removeClass } from '../utils/dom.js';

// DOM elements
let clockContainer;

// Valid effect names
const VALID_EFFECTS = ['flat', 'raised', 'reflected'];

/**
 * Initializes the effects feature
 */
export function initEffects() {
    // Get DOM elements
    clockContainer = getElement('clock-container');
    
    if (!clockContainer) {
        console.error("Clock container element not found");
        return;
    }
    
    // Subscribe to state changes
    subscribe(handleStateChange);
    
    // Initial setup based on current state
    const { effect } = getState();
    setEffect(effect);
}

/**
 * Handles state changes
 * @param {Object} state - The current state
 */
function handleStateChange(state) {
    setEffect(state.effect);
}

/**
 * Sets the visual effect for the clock
 * @param {string} effectName - The name of the effect to apply ('flat', 'raised', or 'reflected')
 */
export function setEffect(effectName) {
    if (!clockContainer) return;
    
    // Remove previous effect classes
    removeClass(clockContainer, 'effect-flat');
    removeClass(clockContainer, 'effect-raised');
    removeClass(clockContainer, 'effect-reflected');

    // Validate effect name
    if (VALID_EFFECTS.includes(effectName)) {
        addClass(clockContainer, `effect-${effectName}`);
        
        // Update state if needed
        const { effect } = getState();
        if (effect !== effectName) {
            updateState({ effect: effectName });
        }
        
        console.log("Effect set to:", effectName);
    } else {
        // Fallback to flat if invalid
        addClass(clockContainer, 'effect-flat');
        
        // Update state if needed
        const { effect } = getState();
        if (effect !== 'flat') {
            updateState({ effect: 'flat' });
        }
        
        console.warn("Invalid effect name, defaulting to flat.");
    }
}

/**
 * Gets the current effect
 * @returns {string} The current effect name
 */
export function getCurrentEffect() {
    return getState().effect;
}
