/**
 * Main entry point for the Ambient Clock application
 * Initializes and coordinates all modules
 */

// Import state management
import { initState, getState } from './state.js';

// Import components
import { initBackground } from './components/background.js';
import { initElements } from './components/element-manager.js';
import { initControls } from './components/controls.js';
import { initDonate } from './components/donate.js';
import { initControlsHint } from './components/controls-hint.js';

// Import features
import { initEffects } from './features/effects.js';
import { initPosition } from './features/position.js';
import { initKeyboard } from './features/keyboard.js';
import { initDrag } from './features/drag.js';
import { handleWindowResize } from './features/element-position.js';

// Import debug utilities (for console access)
import './utils/debug.js';

/**
 * Initializes the application
 */
function initApp() {
    console.log("Initializing Ambient Clock...");
    
    try {
        // Initialize state first
        initState();
        
        // Initialize components
        initBackground();
        initElements(); // Initialize all elements (clocks and date display)
        initControls();
        initDonate();
        initControlsHint();
        
        // Initialize features
        initEffects();
        initPosition();
        initKeyboard();
        initDrag();
        
        // Show the clock container after a small delay to ensure all styles are applied
        setTimeout(() => {
            const clockContainer = document.getElementById('clock-container');
            if (clockContainer) {
                // Use the opacity from state instead of hardcoding to '1'
                const state = getState();
                const clockOpacity = state.clockOpacity || (state.clock && state.clock.clockOpacity) || 1.0;
                
                // Only set opacity if it's not already set by clock-manager
                if (clockContainer.style.opacity === '0') {
                    clockContainer.style.opacity = clockOpacity.toString();
                }
                console.log("Clock container revealed with opacity:", clockContainer.style.opacity);
                
                // Apply the effect (style) from state
                const effect = state.effect || (state.global && state.global.effect) || 'raised';
                
                // Remove any existing effect classes
                clockContainer.classList.remove('effect-flat', 'effect-raised', 'effect-reflected');
                
                // Add the current effect class
                clockContainer.classList.add(`effect-${effect}`);
                console.log("Clock style applied:", effect);
            }
            
            // Also apply date opacity from state
            const dateContainer = document.getElementById('date-container');
            const dateFace = document.getElementById('date-face');
            if (dateContainer && dateFace) {
                const state = getState();
                // Get opacity from state - prioritize nested structure, then flat structure
                const dateOpacity = state.date?.dateOpacity !== undefined ? 
                                   state.date.dateOpacity : 
                                   (state.dateOpacity !== undefined ? state.dateOpacity : 1.0);
                
                // Apply opacity directly to the date face
                dateFace.style.opacity = dateOpacity.toString();
                console.log("Date face revealed with opacity:", dateOpacity);
            }
        }, 100);
        
        console.log("Initialization complete.");
    } catch (error) {
        console.error("Error during initialization:", error);
    }
}

// Run initialization when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);
