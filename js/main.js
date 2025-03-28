/**
 * Main entry point for the Ambient Clock application
 * Initializes and coordinates all modules
 */

// Import state management
import { initState, getState } from './state.js';

// Import components
import { initBackground } from './components/background.js';
import { initClockManager } from './components/clock-manager.js';
import { initControls } from './components/controls.js';
import { initDonate } from './components/donate.js';
import { initControlsHint } from './components/controls-hint.js';

// Import features
import { initEffects } from './features/effects.js';
import { initPosition } from './features/position.js';
import { initKeyboard } from './features/keyboard.js';
import { initDrag } from './features/drag.js';

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
        initClockManager();
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
                const { clockOpacity } = getState();
                // Only set opacity if it's not already set by clock-manager
                if (clockContainer.style.opacity === '0') {
                    clockContainer.style.opacity = clockOpacity.toString();
                }
                console.log("Clock container revealed with opacity:", clockContainer.style.opacity);
            }
        }, 100);
        
        console.log("Initialization complete.");
    } catch (error) {
        console.error("Error during initialization:", error);
    }
}

// Run initialization when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);
