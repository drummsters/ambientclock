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
import * as logger from './utils/logger.js'; // Import the logger (including syncDebugMode)

// --- Application Initialization ---
let controlPanel = null; // Declare controlPanel in a higher scope

async function initApp() {
  logger.debug('Initializing Ambient Clock v2...');

  try {
    // 1. Initialize Configuration Manager
    const configManager = new ConfigManager();
    console.log('[app.js] ConfigManager created, attempting init...');
    let configReady;
    try {
        configReady = await configManager.init();
        console.log('[app.js] ConfigManager init completed. Ready:', configReady);
    } catch (error) {
        console.error('[app.js] ConfigManager init failed:', error);
        configReady = false;
    }
    if (!configReady) {
        logger.warn('Essential configuration is missing. Application might run with limited functionality.');
    }

    // 2. Initialize State Manager
    // TODO: Implement migration logic later
    const initialState = getDefaultState(); // Use imported function
    logger.debug('[app.js] Initial state before StateManager.init:', initialState); // Changed to debug
    await StateManager.init(initialState);
    logger.log('[app.js] State initialized.'); // Simplified log

    // Sync logger's internal state with the loaded state
    // Sync logger's internal state with the loaded state
    const currentState = StateManager.getState();
    const debugModeFromState = currentState?.settings?.debugModeEnabled ?? false;
    logger.syncDebugMode(debugModeFromState); // Call the new sync function
    // console.log(`[App.js] Explicit log after logger sync attempt. Debug state from StateManager: ${debugModeFromState}`); // Remove explicit log

    // 3. Register Element Types
    await registerElementTypes(configManager); // Pass configManager instance

    // 4. Initialize Device Service (Optional, for responsive/touch features)
    // const deviceService = new DeviceService();

    // 5. Initialize Favorites Service
    logger.debug('[app.js] Initializing FavoritesService...');
    const favoritesService = new FavoritesService(StateManager);

    // 6. Initialize Background Service
    logger.debug('[app.js] Initializing BackgroundService...');
    const backgroundElementA = document.getElementById('app-background-a');
    const backgroundElementB = document.getElementById('app-background-b');
    const overlayElement = document.getElementById('app-overlay');
    if (!backgroundElementA || !backgroundElementB || !overlayElement) {
        throw new Error("Required background or overlay elements not found in the DOM.");
    }

    const backgroundService = new BackgroundService(
      backgroundElementA,
      backgroundElementB,
      overlayElement,
      configManager,
      favoritesService
    );
    await backgroundService.init();

    // 6. Initialize Element Manager
    const elementManager = new ElementManager(
      document.getElementById('elements-container'),
      { configManager, stateManager: StateManager, favoritesService }
    );
    await elementManager.init();

    // Setup wheel resize listener immediately after element manager init
    setupWheelResizeListener();

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

    // 8. Initialize Visibility Managers
    logger.debug('[app.js] Initializing VisibilityManagers...');

    // Define elements for alwaysShow manager based on environment
    let alwaysShowElements = ['controls-hint-default', 'next-background-button-default', 'favorite-toggle-default', 'app-title'];
    // Use the configManager instance created earlier
    if (configManager.isFeatureEnabled('includeDonate')) {
        alwaysShowElements.push('donate-default');
        logger.debug('[app.js] Including donate-default in alwaysShowVisibilityManager because includeDonate feature is enabled.');
    }
    
    // Visibility manager for elements that should show on mouse movement
    const alwaysShowVisibilityManager = new VisibilityManager(
        StateManager,
        alwaysShowElements, // Use dynamically defined array
        {
            showOnActivityWhenClosed: true // Show on activity even if controls are closed
        }
    );
    alwaysShowVisibilityManager.init();

    // Visibility manager for elements that should only show when controls are open (Now empty, could be removed or kept for future use)
    const controlsVisibilityManager = new VisibilityManager(
        StateManager,
        [], // Removed favorite-toggle-default
        {
            showOnActivityWhenClosed: false // Original setting, doesn't matter now as list is empty
        }
    );
    controlsVisibilityManager.init();

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
// Add global reset function
window.ambientClock = {
    resetAndReload: () => {
        localStorage.clear();
        window.location.reload();
    }
};

// Helper function to initialize listeners after sync
function initializeListeners() {
    // Use a flag to ensure listeners are only set up once
    if (window.listenersInitialized) return;
    window.listenersInitialized = true;
    logger.debug('[app.js] Element manager sync complete. Setting up app listeners...');
    setupAppListeners();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initApp().then(() => {
            // Wait for the element manager to confirm sync before setting up listeners
            EventBus.subscribe('elementmanager:sync:complete', initializeListeners);
            // In case the event fired *just* before subscription (unlikely but possible)
            // or if the initial sync happens very quickly, check if elements exist
            // and potentially call initializeListeners directly if needed.
            // However, the event-based approach is generally safer.
        });
    });
} else {
    // DOMContentLoaded has already fired
    initApp().then(() => {
        // Wait for the element manager to confirm sync before setting up listeners
        EventBus.subscribe('elementmanager:sync:complete', initializeListeners);
        // Handle potential race condition as above if necessary.
    });
}
