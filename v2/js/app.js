import { EventBus } from './core/event-bus.js';
import { StateManager } from './core/state-manager.js';
import { ComponentRegistry } from './core/component-registry.js';
import { ConfigManager } from './core/config-manager.js';
import { ElementManager } from './managers/element-manager.js';
import { ClockElement } from './components/elements/clock-element.js';
import { DateElement } from './components/elements/date-element.js'; // Import DateElement
import { BackgroundService } from './services/background-service.js';
import { ControlPanel } from './components/controls/control-panel.js';
import { BaseUIElement } from './components/base/base-ui-element.js'; // Import for scale constants
// Import other managers and services later as they are created
// import { DeviceService } from './services/device-service.js';
// import { migrateExistingState } from './utils/migration.js'; // Import later

// --- Default State ---
function getDefaultState() {
  // Define the initial structure of the application state
  return {
    settings: {
      theme: 'dark', // Example global setting
      background: {
        type: 'color', // Default to color initially
        source: 'unsplash', // Default source if image type is chosen
        category: 'Nature', // Default category
        customCategory: '', // For when 'Other' is selected
        color: '#000033', // Changed default background color to dark blue for testing
        overlayOpacity: 0.2, // Changed default overlay opacity for testing
        zoomEnabled: true,
      },
      // Removed global effects settings
      // effects: {
      //   style: 'raised',
      // },
      controls: {
        isOpen: false // Initially closed
      }
    },
    elements: {
      // Example initial elements (can be loaded from migration or defaults)
      'clock-default': {
        type: 'clock', 
        id: 'clock-default',
        position: { x: 50, y: 50 },
        scale: 1.4, // Moved scale outside options
        opacity: 1.0,
        effectStyle: 'raised', // Added element-level effect
        options: {
          face: 'led', // Changed from 'digital'
          timeFormat: '12',
          showSeconds: true,
          fontFamily: 'Segoe UI',
          color: '#FFFFFF',
        }
      },
      // Add default date element state
      'date-default': {
        type: 'date',
        id: 'date-default',
        position: { x: 50, y: 80 }, 
        scale: 1.0, // Moved scale outside options
        opacity: 1.0,
        effectStyle: 'raised', // Added element-level effect
        options: {
          format: 'Day, Month DD', 
          fontFamily: 'Segoe UI',
          color: '#FFFFFF',
          visible: true,
          showSeparator: false, // Added separator option
        }
      }
    }
  };
}

// --- Element Type Registration ---
function registerElementTypes() {
  console.log('Registering element types...');

  // Register Clock element
  ComponentRegistry.registerElementType('clock', ClockElement, {
    // Define control panel config and capabilities later if needed
    controlPanelConfig: [
        // Example structure - fill later
        // { title: 'Clock Settings', controls: [ { type: 'select', ... } ] }
    ],
    capabilities: ['draggable', 'resizable'] // Example capabilities
  });

  // Register Date element
  ComponentRegistry.registerElementType('date', DateElement, {
    // Define control panel config and capabilities later if needed
    controlPanelConfig: [
        // Example structure - fill later
    ],
    capabilities: ['draggable', 'resizable'] // Example capabilities
  });

  console.log('Element type registration complete.');
}

// --- Version Toggle Setup ---
function setupVersionToggle() {
    const toggleContainer = document.getElementById('version-toggle');
    if (!toggleContainer) return; // Exit if container not found

    // Basic styling for visibility
    toggleContainer.style.position = 'fixed';
    toggleContainer.style.bottom = '10px';
    toggleContainer.style.right = '10px';
    toggleContainer.style.padding = '5px 10px';
    toggleContainer.style.backgroundColor = 'rgba(0,0,0,0.7)';
    toggleContainer.style.color = 'white';
    toggleContainer.style.zIndex = '10000';
    toggleContainer.style.fontSize = '12px';
    toggleContainer.style.borderRadius = '4px';

    toggleContainer.innerHTML = `
      <span>Version: </span>
      <select id="version-select" style="background: #333; color: white; border: 1px solid #555; font-size: 12px;">
        <option value="v1">Original</option>
        <option value="v2" selected>New (v2)</option>
      </select>
    `;

    const selectElement = toggleContainer.querySelector('#version-select');
    if (selectElement) {
        selectElement.addEventListener('change', (e) => {
            if (e.target.value === 'v1') {
                console.log('Switching to v1...');
                // Navigate to the root index.html for v1
                window.location.href = '../index.html';
            }
        });
    }
}


// --- Application Initialization ---
async function initApp() {
  console.log('Initializing Ambient Clock v2...');

  try {
    // 1. Initialize Configuration Manager
    const configManager = new ConfigManager(); // Instantiate

    // --- API Key Setting Removed (Handled by Backend) ---

    const configReady = await configManager.init(); // Initialize and wait
    // configManager.saveConfig(); // Save call removed as keys aren't set here anymore

    // If essential config is missing and setup didn't complete, halt or run limited mode
    if (!configReady) {
      console.warn('Essential configuration is missing. Application might run with limited functionality.');
      // Optionally display a message to the user
      // return; // Or allow proceeding with defaults
    }

    // 2. Initialize State Manager
    // TODO: Implement migration logic later
    // const migratedState = migrateExistingState();

    // localStorage.removeItem('ambient-clock-v2-settings'); // Removed development helper
    // console.log('[app.js] Cleared localStorage to ensure default state is used.'); // Removed log

    const initialState = getDefaultState(); // Use default for now
    console.log('[app.js] Initial state before StateManager.init:', initialState);
    await StateManager.init(initialState); // Wait for StateManager to finish
    console.log('[app.js] State after StateManager.init:', StateManager.getState());

    // 3. Register Element Types
    registerElementTypes(); // Register constructors with the registry

    // 4. Initialize Device Service (Optional, for responsive/touch features)
    // const deviceService = new DeviceService();

    console.log('[app.js] Initializing BackgroundService...');
    
    // Check if background and overlay elements exist
    const backgroundElement = document.getElementById('app-background');
    const overlayElement = document.getElementById('app-overlay');
    console.log('[app.js] Background element:', backgroundElement);
    console.log('[app.js] Overlay element:', overlayElement);
    
    // 5. Initialize Background Service
    const backgroundService = new BackgroundService(
      backgroundElement,
      overlayElement,
      configManager // Pass config manager for API key checks etc.
    );
    await backgroundService.init();

    // 6. Initialize Element Manager
    const elementManager = new ElementManager(
      document.getElementById('elements-container')
    );
    await elementManager.init(); // Creates elements based on initial state

    // 7. Initialize Control Panel
    console.log('[app.js] Initializing ControlPanel...');
    const controlPanel = new ControlPanel(
        { id: 'controls-panel' },
        elementManager, // Pass the ElementManager instance
        configManager // Pass the ConfigManager instance
    );
    await controlPanel.init(); // Initialize the control panel

    // 8. Setup Version Toggle UI
    setupVersionToggle();
    
    // 9. Setup global wheel event handler for element resizing
    setupWheelResizeHandler();

    console.log('Ambient Clock v2 core initialization sequence complete.');

    // Publish state:initialized AFTER all core modules are initialized
    console.log('[app.js] Publishing state:initialized event (delayed)...');
    EventBus.publish('state:initialized', StateManager.getState());
    console.log('[app.js] Published state:initialized event (delayed).');

    EventBus.publish('app:initialized'); // Publish general app init event

  } catch (error) {
    console.error('Critical error during application initialization:', error);
    // Display error message to the user?
  }
}

// --- Setup Wheel Resize Handler ---
function setupWheelResizeHandler() {
  console.log('Setting up global wheel resize handler...');
  
  // Get the elements container
  const elementsContainer = document.getElementById('elements-container');
  if (!elementsContainer) {
    console.error('Cannot setup wheel resize: elements-container not found');
    return;
  }
  
  // Add wheel event listener to the elements container
  elementsContainer.addEventListener('wheel', handleWheelResize, { passive: false });
  console.log('Wheel resize handler attached to elements-container');
}

/**
 * Global wheel event handler for resizing elements.
 * Determines which element is under the cursor and resizes it.
 */
function handleWheelResize(event) {
  // Prevent default scrolling
  event.preventDefault();
  
  // Find the element under the cursor
  // Start from the target and traverse up to find a base-element
  let currentElement = event.target;
  let elementId = null;
  
  // Traverse up the DOM tree to find a base-element
  while (currentElement && currentElement !== document.body) {
    if (currentElement.classList && currentElement.classList.contains('base-element')) {
      elementId = currentElement.id;
      break;
    }
    currentElement = currentElement.parentElement;
  }
  
  if (!elementId) {
    return; // No base-element found under cursor
  }
  
  // Get the current state for this element
  const elementState = StateManager.getNestedValue(StateManager.getState(), `elements.${elementId}`);
  if (!elementState) {
    return; // No state found for element
  }
  
  // Get current scale
  const currentScale = elementState.scale ?? 1.0;
  
  // Calculate new scale based on wheel delta using centralized values
  const sensitivity = BaseUIElement.SCALE_STEP;
  const scaleChange = event.deltaY > 0 ? -sensitivity : sensitivity;
  let newScale = currentScale + scaleChange;
  
  // Apply constraints from BaseUIElement
  const minScale = BaseUIElement.MIN_SCALE;
  const maxScale = BaseUIElement.MAX_SCALE;
  newScale = Math.max(minScale, Math.min(maxScale, newScale));
  
  // Update state if scale changed significantly
  if (Math.abs(newScale - currentScale) > 0.001) {
    // Update the state
    StateManager.update({
      elements: {
        [elementId]: {
          scale: newScale
        }
      }
    });
  }
}

// --- Global Event Listeners (Example: Toggle Controls) ---
function setupGlobalListeners() {
  window.addEventListener('keydown', (event) => {
    // Toggle control panel on 'c' key press (ensure not typing in an input)
    if (event.key === 'c' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
      console.log("Toggling control panel via 'c' key...");
      const currentState = StateManager.getState();
      const currentVisibility = currentState.settings?.controls?.isOpen ?? false;
      StateManager.update({
        settings: {
          controls: {
            isOpen: !currentVisibility
          }
        }
      });
    }
  });
}


// --- Start Application ---
// Wait for the DOM to be fully loaded before initializing
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initApp().then(() => {
            setupGlobalListeners(); // Add listeners after app init
        });
    });
} else {
    // DOMContentLoaded has already fired
    initApp().then(() => {
        setupGlobalListeners(); // Add listeners after app init
    });
}
