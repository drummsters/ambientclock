// Core Modules
import { EventBus } from './core/event-bus.js';
import { StateManager } from './core/state-manager.js';
import { ConfigManager } from './core/config-manager.js';
import { registerElementTypes } from './core/element-registration.js'; // Import registration function

// State
import { getDefaultState } from './state/default-state.js'; // Import default state function

// Managers
import { ElementManager } from './managers/element-manager.js';
import { VisibilityManager } from './utils/visibility-manager.js';

// Services
import { BackgroundService } from './services/background-service.js';
import { FavoritesService } from './services/favorites-service.js';

// UI Components
import { ControlPanel } from './components/controls/control-panel.js';

// Utilities
import { setupGlobalKeyListeners, setupWheelResizeListener } from './utils/global-listeners.js';
import * as logger from './utils/logger.js'; // Import the logger

// --- Application Initialization ---
let controlPanel = null; // Declare controlPanel in a higher scope

async function initApp() {
  logger.debug('Initializing Ambient Clock v2...');

  try {
    // 1. Initialize Configuration Manager
    const configManager = new ConfigManager();
    const configReady = await configManager.init();
    if (!configReady) {
      logger.warn('Essential configuration is missing. Application might run with limited functionality.');
    }

    // 2. Initialize State Manager
    // TODO: Implement migration logic later
    const initialState = getDefaultState(); // Use imported function
    logger.debug('[app.js] Initial state before StateManager.init:', initialState); // Changed to debug
    await StateManager.init(initialState);
    logger.log('[app.js] State initialized.'); // Simplified log

    // NOTE: We are *not* syncing logger state from StateManager on init.
    // Logger will always start with debugMode disabled on page load.
    // The hotkey (Ctrl+Shift+Z) will toggle both the logger's internal state
    // and update the StateManager for the current session.

    // 3. Register Element Types
    registerElementTypes(); // Use imported function

    // 4. Initialize Device Service (Optional, for responsive/touch features)
    // const deviceService = new DeviceService();

    logger.debug('[app.js] Initializing BackgroundService...');
    const backgroundElementA = document.getElementById('app-background-a');
    const backgroundElementB = document.getElementById('app-background-b');
    const overlayElement = document.getElementById('app-overlay');
    if (!backgroundElementA || !backgroundElementB || !overlayElement) {
        throw new Error("Required background or overlay elements not found in the DOM.");
    }

    // 5. Initialize Background Service
    const backgroundService = new BackgroundService(
      backgroundElementA,
      backgroundElementB,
      overlayElement,
      configManager
    );
    await backgroundService.init();

    // 5.5 Initialize Favorites Service
    logger.debug('[app.js] Initializing FavoritesService...');
    const favoritesService = new FavoritesService(StateManager);

    // 6. Initialize Element Manager
    const elementManager = new ElementManager(
      document.getElementById('elements-container'),
      { configManager, stateManager: StateManager, favoritesService }
    );
    await elementManager.init();

    // 7. Initialize Control Panel
    logger.debug('[app.js] Initializing ControlPanel...');
    controlPanel = new ControlPanel( // Assign to higher-scoped variable
        { id: 'controls-panel' },
        elementManager,
        configManager,
        backgroundService,
        favoritesService
    );
    await controlPanel.init();

    // 8. Initialize Visibility Manager for Hint, Donate, Favorite Toggle
    logger.debug('[app.js] Initializing VisibilityManager...');
    const visibilityManager = new VisibilityManager(
        StateManager,
        ['controls-hint-default', 'donate-default', 'favorite-toggle-default', 'next-background-button-default'], // Corrected ID to match DOM
        // Optional config can be added here if needed
    );
    visibilityManager.init();

    // 9. Setup global listeners (now called separately after initApp)

    logger.debug('Ambient Clock v2 core initialization sequence complete.');

    // Publish state:initialized AFTER all core modules are initialized
    logger.debug('[app.js] Publishing state:initialized event...');
    EventBus.publish('state:initialized', StateManager.getState());
    logger.debug('[app.js] Published state:initialized event.');

    EventBus.publish('app:initialized');

  } catch (error) {
    logger.error('Critical error during application initialization:', error);
    // Display error message to the user?
  }
}

// --- Global Event Listeners Setup (Called after initApp) ---
function setupAppListeners() {
    if (!controlPanel) {
        logger.error("Cannot setup listeners: ControlPanel instance is not available.");
        return;
    }
    setupWheelResizeListener(); // Use imported function
    setupGlobalKeyListeners(controlPanel); // Use imported function, pass controlPanel instance
}


// --- Start Application ---
// Wait for the DOM to be fully loaded before initializing
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initApp().then(() => {
            setupAppListeners(); // Setup listeners after app init completes
        });
    });
} else {
    // DOMContentLoaded has already fired
    initApp().then(() => {
        setupAppListeners(); // Setup listeners after app init completes
    });
}
