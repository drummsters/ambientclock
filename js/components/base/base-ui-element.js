// Core dependencies
import { EventBus } from '../../core/event-bus.js';
import { StateManager } from '../../core/state-manager.js';

// Import Mixins/Handlers
import { StateBindingMixin } from './mixins/StateBindingMixin.js';
import { StyleHandler } from './mixins/StyleHandler.js';
import { PluginManager } from './mixins/PluginManager.js';
import { CapabilityHandler } from './mixins/CapabilityHandler.js';
import { ResponsiveHandler } from './mixins/ResponsiveHandler.js';

/**
 * Base class for all UI elements in the application.
 * Provides core identity, lifecycle, and delegates responsibilities to handlers/mixins.
 */
export class BaseUIElement {
  // Static scale constraints moved to StyleHandler
  /**
   * Creates a new BaseUIElement instance.
   * @param {object} config - Configuration object for the element.
   * @param {string} config.id - Unique ID for this element instance.
   * @param {string} config.type - The type of element (e.g., 'clock', 'date').
   * @param {object} [config.options={}] - Initial options specific to this element type.
   * @param {string[]} [config.capabilities=[]] - List of capabilities this element possesses.
   * @param {object} [config.responsive] - Responsive configuration.
   */
  constructor(config) {
    // If config is not provided (e.g., element created by browser parsing HTML),
    // initialize config and read id/type from attributes.
    if (!config || typeof config !== 'object') {
        config = {}; // Initialize config as an empty object
    }

    // Read id from config or element attribute
    this.id = config.id;
    if (!this.id && typeof document !== "undefined" && this.getAttribute) {
        this.id = this.getAttribute('id');
    }

    // Read type from config or element tag name
    this.type = config.type;
    if (!this.type && typeof document !== "undefined" && this.tagName) {
        this.type = this.tagName.toLowerCase();
    }

    // Ensure id and type are present after attempting to read from config and attributes
    if (!this.id || !this.type) {
         throw new Error(`BaseUIElement requires id and type. Could not determine for element with tag: ${this.tagName || 'unknown'}`);
    }

    this.config = config; // Store the potentially updated config
    this.options = config.options || {};
    this.container = null; // Main DOM container for the element
    this.elements = {}; // Child DOM elements managed by this component
    this.eventHandlers = {}; // Managed event listeners (plugins might add here)
    this.statePath = `elements.${this.id}`; // Path in the global state
    this.capabilities = config.capabilities || []; // Store capabilities
    // Remove the separate dependencies storage, dependencies are direct properties of config now
    // this.dependencies = config.dependencies || {}; 
    
    // console.log(`[BaseUIElement] ${this.type} dependencies set to:`, this.dependencies); // Remove log
    this.responsiveConfig = config.responsive || { // Keep responsive config here for handler
        scalingMethod: 'viewport',
        minScale: 0.5,
        maxScale: 3.0,
        baseFontSize: 2,
        baseWidth: 150,
        baseHeight: 150,
    };

    // Create container *before* handlers that need it, passing the element instance itself
    // If the element is defined in HTML, createContainer should find and return 'this'.
    this.container = this.createContainer(this);
    if (!this.container) {
        throw new Error(`Failed to create container for element ${this.id}`);
    }
    // Ensure the container has the correct ID if it was created dynamically
    if (this.container !== this && !this.container.id) {
        this.container.id = this.id;
    }
    // Add base class and type-specific class if not already present
    if (!this.container.classList.contains('base-element')) {
        this.container.classList.add('base-element');
    }
     if (!this.container.classList.contains(`${this.type}-element`)) {
        this.container.classList.add(`${this.type}-element`);
    }

    // Instantiate Handlers/Mixins, passing 'this' (the element instance)
    this.stateBinding = new StateBindingMixin(this);
    this.styleHandler = new StyleHandler(this); // Now has access to this.container
    this.pluginManager = new PluginManager(this);
    this.capabilityHandler = new CapabilityHandler(this, this.pluginManager); // Pass pluginManager
    this.responsiveHandler = new ResponsiveHandler(this); // Now has access to this.container

    // Apply capabilities using the handler
    this.capabilityHandler.applyCapabilities(this.capabilities);
  }

  // --- Lifecycle Methods ---

  /**
   * Initializes the element: creates DOM, binds state, adds listeners.
   * Should be called after instantiation.
   * @returns {Promise<boolean>} True if initialization was successful.
   */
  async init() {
    console.log(`Initializing ${this.type} element: ${this.id}`);
    try {
      // 1. Container is already created in constructor
      // if (!this.container) { // Check moved to constructor
      //   console.error(`Container not created for ${this.id}`);
      //   return false;
      // }

      // 2. Create child elements (implemented by subclass)
      await this.createElements();

      // 3. Bind to state changes (using mixin)
      this.stateBinding.bindToState();

      // 4. Add event listeners (implemented by subclass or capabilities)
      this.addEventListeners(); // Subclass implements this

      // 5. Initialize responsive features (using handler)
      this.responsiveHandler.init();

      // 6. Initialize plugins (using manager) - Called after container exists
      this.pluginManager.initPlugins();

      // 7. Initial render based on current state
      // Note: Initial state is applied via bindToState callback
      // this.render(); // Might not be needed if updateFromState handles initial render

      console.log(`${this.type} element ${this.id} initialized successfully.`);
      return true;
    } catch (error) {
      console.error(`Error initializing ${this.type} element ${this.id}:`, error);
      this.destroy(); // Clean up if init fails
      return false;
    }
  }

  /**
   * Creates the main container DOM element for this UI element.
   * Subclasses can override this to provide a different container structure.
   *
   * If the element is defined directly in HTML, this method should return the element instance itself (`this`).
   * If the element is created dynamically via JavaScript, this method should create and return a new container element.
   *
   * @param {HTMLElement} [elementInstance] - The element instance (`this`) if called from a custom element constructor.
   * @returns {HTMLElement} The container element.
   */
  createContainer(elementInstance) {
    // If called from a custom element defined in HTML, return the instance itself
    if (elementInstance && elementInstance.tagName && elementInstance.tagName.includes('-')) {
        return elementInstance;
    }

    // Otherwise, create a new container div
    const container = document.createElement('div');
    // ID and classes will be set after this method returns in the constructor
    return container;
  }

  /**
   * Creates the specific child DOM elements needed for this component.
   * Must be implemented by subclasses.
   * @returns {Promise<void>}
   */
  async createElements() {
    // Abstract method - subclasses must implement
    console.warn(`createElements() not implemented for ${this.type} element: ${this.id}`);
  }

  /**
   * Renders or updates the element's visual representation based on its current state/options.
   * Often called within updateFromState or by specific event handlers.
   * Base implementation handles basic visibility check.
   */
  render() {
    // Base render can handle making the element visible after initial setup
    if (this.container && this.container.style.visibility === 'hidden') {
        // Check if essential state like position/scale is set before showing
        const state = StateManager.getNestedValue(StateManager.getState(), this.statePath);
        if (state && state.position && state.scale !== undefined) {
            // Check the 'visible' option managed by StyleHandler
            if (this.container.style.display !== 'none') {
                this.container.style.visibility = 'visible';
            }
        }
    }
  }

  /**
   * Updates the element based on changes in its specific part of the global state.
   * Delegates style updates to StyleHandler and option updates to subclass.
   * @param {object} state - The current state object for this element from the StateManager.
   */
  updateFromState(state) {
    if (!state) {
      // console.warn(`No state found for ${this.id} at path ${this.statePath}`);
      return;
    }

    // Delegate style updates to StyleHandler
    if (state.position !== undefined || state.centered !== undefined) {
      this.styleHandler.updatePosition(state.position, state.centered);
    }
    if (state.scale !== undefined) this.styleHandler.updateScale(state.scale);
    if (state.opacity !== undefined) this.styleHandler.updateOpacity(state.opacity);
    if (state.effectStyle !== undefined) this.styleHandler.updateEffects(state.effectStyle);

    // Delegate visibility update to StyleHandler (based on options.visible)
    this.styleHandler.updateVisibility(state.options?.visible ?? true);

    // Delegate type-specific option updates to subclass
    if (state.options) {
      const { visible, ...otherOptions } = state.options; // Exclude 'visible'
      if (Object.keys(otherOptions).length > 0) {
        this.updateOptions(otherOptions); // Call subclass implementation
      }
    }

    // Trigger subclass render to apply option changes
    this.render();
  }

  /**
   * Updates the element based on changes to its specific options.
   * Must be implemented by subclasses to handle their unique options.
   * @param {object} options - The options object for this element.
   */
  updateOptions(options) {
    // Abstract method - subclasses must implement
    this.options = { ...this.options, ...options }; // Basic merge for subclasses
    // console.warn(`updateOptions() not implemented for ${this.type} element: ${this.id}`);
  }

  /**
   * Cleans up resources used by the element (event listeners, observers, DOM elements).
   * Delegates cleanup to handlers/mixins.
   */
  destroy() {
    console.log(`Destroying ${this.type} element: ${this.id}`);

    // 1. Destroy Handlers/Mixins
    this.stateBinding?.destroy();
    this.styleHandler?.destroy();
    this.pluginManager?.destroy(); // This calls destroyPlugins internally
    this.capabilityHandler?.destroy();
    this.responsiveHandler?.destroy();

    // 2. Remove event listeners (subclass responsibility)
    this.removeEventListeners();

    // 3. Remove from DOM
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    this.container = null;
    this.elements = {};
    this.eventHandlers = {}; // Clear handlers map
  }

  // --- State Management (Delegated) ---
  // bindToState() moved to StateBindingMixin
  // updateElementState() moved to StateBindingMixin

  // --- DOM & Positioning (Delegated) ---
  // updatePosition() moved to StyleHandler
  // updateScale() moved to StyleHandler
  // updateOpacity() moved to StyleHandler
  // updateVisibility() moved to StyleHandler
  // updateEffects() moved to StyleHandler

  // --- Event Handling (Abstract) ---
  /**
   * Adds event listeners required by the element or its capabilities.
   * Subclasses should override to add their own listeners.
   */
  addEventListeners() {
    // Abstract method - subclasses implement
  }

  /**
   * Removes event listeners added by this element.
   * Subclasses should override to remove their own listeners.
   */
  removeEventListeners() {
    // Abstract method - subclasses implement
  }

  // --- Plugin & Capability System (Delegated) ---
  // usePlugin() moved to PluginManager
  // initPlugins() moved to PluginManager
  // destroyPlugins() moved to PluginManager
  // _applyCapabilities() moved to CapabilityHandler

  // --- Responsive Design (Delegated) ---
  // _initResponsiveFeatures() moved to ResponsiveHandler
  // _handleViewportChange() moved to ResponsiveHandler
  // applyResponsiveAdjustments() moved to ResponsiveHandler
  // ensureElementInViewport() moved to ResponsiveHandler
}
