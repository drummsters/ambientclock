import { EventBus } from '../../core/event-bus.js';
import { StateManager } from '../../core/state-manager.js';
// import { CapabilityRegistry } from '../../core/capability-registry.js'; // Import later if we create this
// Import known plugins - ideally this would be more dynamic
import { DragPlugin } from '../plugins/drag-plugin.js';
// Removed ResizePlugin import

/**
 * Base class for all UI elements in the application.
 * Provides common lifecycle methods, state binding, event handling,
 * plugin support, and responsive capabilities.
 */
export class BaseUIElement {
  // Static scale constraints for all UI elements
  static MIN_SCALE = 0.2;
  static MAX_SCALE = 5.0;
  static SCALE_STEP = 0.1;
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
    if (!config || !config.id || !config.type) {
      throw new Error('BaseUIElement requires id and type in config');
    }

    this.id = config.id;
    this.type = config.type;
    this.options = config.options || {}; // Type-specific options
    this.container = null; // Main DOM container for the element
    this.elements = {}; // Child DOM elements managed by this component
    this.plugins = {}; // Attached plugins
    this.eventHandlers = {}; // Managed event listeners
    this.unsubscribers = []; // Store unsubscribe functions for cleanup
    this.statePath = `elements.${this.id}`; // Path in the global state
    // Removed global effectStatePath
    this.capabilities = config.capabilities || []; // Store capabilities

    // Responsive configuration
    this.responsiveConfig = config.responsive || {
      scalingMethod: 'viewport', // 'viewport', 'fixed', 'auto'
      minScale: 0.5, // Default min scale factor
      maxScale: 3.0, // Default max scale factor
      baseFontSize: 2, // Base font size in 'em' for scaling
      baseWidth: 150, // Base width for analog clock scaling
      baseHeight: 150, // Base height for analog clock scaling
    };
    this.resizeObserver = null;
    this.viewportChangeHandler = this._handleViewportChange.bind(this); // Debounced handler

    // Apply capabilities defined during registration
    this._applyCapabilities(this.capabilities); // Apply capabilities during construction
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
      // 1. Create DOM structure
      this.container = this.createContainer();
      if (!this.container) {
        console.error(`Failed to create container for ${this.id}`);
        return false;
      }

      // 2. Create child elements (implemented by subclass)
      await this.createElements();

      // 3. Bind to state changes
      this.bindToState(); // Subscribes and gets initial state

      // 4. Add event listeners (implemented by subclass or capabilities)
      this.addEventListeners();

      // 5. Initialize responsive features
      this._initResponsiveFeatures();

      // 6. Initialize plugins (if any) - Called after container exists
      this.initPlugins();

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
   * @returns {HTMLElement} The created container element.
   */
  createContainer() {
    const container = document.createElement('div');
    container.id = this.id;
    // Add base class and type-specific class
    container.className = `base-element ${this.type}-element`;
    // Initial styles (positioning will be handled by state updates)
    container.style.position = 'absolute';
    container.style.visibility = 'hidden'; // Start hidden until positioned/scaled
    return container;
  }

  /**
   * Creates the specific child DOM elements needed for this component.
   * Must be implemented by subclasses.
   * @returns {Promise<void>}
   */
  async createElements() {
    // Example: this.elements.face = document.createElement('div');
    //          this.container.appendChild(this.elements.face);
    console.warn(`createElements() not implemented for ${this.type} element: ${this.id}`);
  }

  /**
   * Renders or updates the element's visual representation based on its current state/options.
   * Often called within updateFromState or by specific event handlers.
   */
  render() {
    // Example: Update text content, styles, attributes based on this.options or state
    // console.log(`Rendering ${this.type} element: ${this.id}`);
    // Make container visible after initial positioning/scaling
     if (this.container && this.container.style.visibility === 'hidden') {
         // Check if position and scale seem valid before showing
         const state = StateManager.getNestedValue(StateManager.getState(), this.statePath);
         if (state && state.position && state.scale !== undefined) {
            // Also check the 'visible' option before making it visible
            if (state.options?.visible !== false) { // Default to visible if option is missing
                 this.container.style.visibility = 'visible';
            }
         }
     }
  }

  /**
   * Updates the element based on changes in its specific part of the global state.
   * Called automatically by the StateManager subscription.
   * @param {object} state - The current state object for this element from the StateManager.
   */
  updateFromState(state) {
    if (!state) {
      console.warn(`No state found for ${this.id} at path ${this.statePath}`);
      return; // No state for this element yet
    }
    // console.log(`Updating ${this.id} from state:`, state);

    // Apply common properties managed by BaseUIElement
    if (state.position) {
      this.updatePosition(state.position);
    }
    if (state.scale !== undefined) {
      this.updateScale(state.scale);
    }
    if (state.opacity !== undefined) {
      this.updateOpacity(state.opacity);
    }
    // Apply effect style if it exists in the state update
    if (state.effectStyle !== undefined) {
        this.updateEffects(state.effectStyle);
    }

    // Handle visibility option directly here
    // Use ?? true to default to visible if the option is missing
    this.updateVisibility(state.options?.visible ?? true);

    // Apply type-specific options (handled by subclass)
    // Pass only the options part to the subclass method
    if (state.options) {
      // Filter out 'visible' as it's handled above
      const { visible, ...otherOptions } = state.options;
      if (Object.keys(otherOptions).length > 0) {
          this.updateOptions(otherOptions);
      }
    }

    // Trigger a render to reflect changes (render might make it visible)
    this.render();
  }

  /**
   * Updates the element based on changes to its specific options.
   * Must be implemented by subclasses to handle their unique options.
   * @param {object} options - The options object for this element.
   */
  updateOptions(options) {
    this.options = { ...this.options, ...options }; // Merge new options
    // Subclass should implement logic here based on new options
    // console.warn(`updateOptions() not implemented for ${this.type} element: ${this.id}`);
  }

  /**
   * Cleans up resources used by the element (event listeners, observers, DOM elements).
   */
  destroy() {
    console.log(`Destroying ${this.type} element: ${this.id}`);
    // 1. Unsubscribe from state updates
    this.unsubscribers.forEach(unsubscribe => unsubscribe());
    this.unsubscribers = [];

    // 2. Remove event listeners
    this.removeEventListeners();

    // 3. Destroy plugins
    this.destroyPlugins();

    // 4. Disconnect observers
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    window.removeEventListener('resize', this.viewportChangeHandler);
    window.removeEventListener('orientationchange', this.viewportChangeHandler);


    // 5. Remove from DOM
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    this.container = null;
    this.elements = {};
  }

  // --- State Management ---

  /**
   * Subscribes the element to its relevant part of the global state via EventBus.
   * Also applies the initial state immediately.
   */
  bindToState() {
    // Subscribe to changes for the entire element state object
    const eventName = `state:${this.statePath}:changed`;
    const subscription = EventBus.subscribe(eventName, (state) => {
      console.log(`[${this.id}] Event received: ${eventName}`, state);
      this.updateFromState(state); // updateFromState handles applying all changes
    });
    this.unsubscribers.push(subscription.unsubscribe);

    // Apply initial state directly after subscribing
    const initialState = StateManager.getNestedValue(StateManager.getState(), this.statePath);
    if (initialState) {
        console.log(`[${this.id}] Applying initial state:`, initialState);
        this.updateFromState(initialState);
        // Apply initial effect style from the element's state
        this.updateEffects(initialState.effectStyle); // Pass the style string
    } else {
        console.log(`[${this.id}] No initial state found at path: ${this.statePath}`);
        // Apply default options if no state exists
        this.updateFromState({ options: this.options }); // Apply constructor options
        this.updateEffects('flat'); // Apply default effect if no state
    }
    // Removed global effect subscription
  }

  /**
   * Updates a specific part of this element's state in the StateManager.
   * @param {object} changes - An object containing the state changes for this element.
   */
  updateElementState(changes) {
      const updatePayload = {
          elements: {
              [this.id]: changes
          }
      };
      StateManager.update(updatePayload);
  }

  /**
   * Updates the element's visual effects based on its effectStyle state.
   * @param {string} style - The effect style string (e.g., 'flat', 'raised', 'reflected').
   */
  updateEffects(style = 'flat') { // Default to 'flat'
      if (!this.container) return;

      console.log(`[${this.id}] Updating effect style to: ${style}`);

      // Remove existing effect classes
      this.container.classList.remove('effect-flat', 'effect-raised', 'effect-reflected');

      // Add the new effect class
      if (style === 'raised') {
          this.container.classList.add('effect-raised');
      } else if (style === 'reflected') {
          this.container.classList.add('effect-reflected');
      } else {
          this.container.classList.add('effect-flat'); // Default to flat
      }
  }

  // --- DOM & Positioning ---

  /**
   * Updates the element's position based on percentage values.
   * @param {object} position - Object with x and y properties (percentages).
   */
  updatePosition(position) {
    if (!this.container || typeof position?.x !== 'number' || typeof position?.y !== 'number') return;

    this.container.style.left = `${position.x}%`;
    this.container.style.top = `${position.y}%`;
    // Use translate to center the element on its coordinates
    // Combine with existing scale if present
    // const currentScale = this.container.style.transform.match(/scale\(([^)]+)\)/); // Removed scale from transform
    // const scaleValue = currentScale ? currentScale[1] : 1;
    this.container.style.transform = `translate(-50%, -50%)`; // Only translate
    // Initial render might make it visible now
    this.render();
  }

  /**
   * Updates the element's scale using font-size and dimensions (v1 style).
   * Subclasses might override this for more complex scaling logic.
   * @param {number} scale - The scale factor (e.g., 1.0 is base size).
   */
  updateScale(scale) {
    if (!this.container || typeof scale !== 'number') return;

    // --- V1 Style Scaling: Adjust font-size ---
    const baseFontSize = this.responsiveConfig.baseFontSize || 2; // Base size in 'em' units
    const newSize = baseFontSize * scale;

    // Apply to the main container or a specific 'face' element if needed
    // If the element has a dedicated 'face' div, target that. Otherwise, target container.
    const targetElement = this.elements.face || this.container;
    targetElement.style.fontSize = `${newSize.toFixed(2)}em`;

    // --- Remove transform: scale() ---
    // Ensure transform only handles positioning
    this.container.style.transform = `translate(-50%, -50%)`;

    // For analog clock, adjust width/height of the face container
    if (this.type === 'clock' && this.options.face === 'analog' && this.elements.analogFace) {
        const baseDimWidth = this.responsiveConfig.baseWidth || 150; // Base width/height in px
        const baseDimHeight = this.responsiveConfig.baseHeight || 150;
        const newWidth = baseDimWidth * scale;
        const newHeight = baseDimHeight * scale;
        // Apply to the .analog-face div within the main container
        this.elements.analogFace.style.width = `${newWidth}px`;
        this.elements.analogFace.style.height = `${newHeight}px`;
    }

    // Initial render might make it visible now
    this.render();
  }

  /**
   * Updates the element's opacity.
   * @param {number} opacity - The opacity value (0 to 1).
   */
  updateOpacity(opacity) {
    if (!this.container || typeof opacity !== 'number') return;
    this.container.style.opacity = Math.max(0, Math.min(1, opacity));
  }

  /**
   * Updates the element's visibility based on the 'visible' option.
   * @param {boolean} isVisible - Whether the element should be visible.
   */
  updateVisibility(isVisible) {
    if (!this.container) return;
    // Use 'display' none/block or add/remove a CSS class
    this.container.style.display = isVisible ? '' : 'none';
    // Note: If using display: '', ensure the element's default display is appropriate (e.g., block, inline-block)
    // Or use a class: this.container.classList.toggle('element-hidden', !isVisible);
  }

  // --- Event Handling ---

  /**
   * Adds event listeners required by the element or its capabilities.
   * Subclasses should override to add their own listeners.
   */
  addEventListeners() {
    // Wheel event handling moved to app.js (global handler)
    // Subclasses should override to add their own listeners
  }

  /**
   * Removes event listeners added by this element.
   * Subclasses should override to remove their own listeners.
   */
  removeEventListeners() {
    // Subclasses should override to remove their own listeners
  }

  // --- Plugin & Capability System ---

  /**
   * Attaches and initializes a plugin for this element instance.
   * @param {object} plugin - The plugin object/class.
   * @param {object} [config={}] - Configuration for the plugin.
   */
  usePlugin(plugin, config = {}) {
    if (!plugin || typeof plugin.init !== 'function' || !plugin.name) {
      console.error('Invalid plugin provided:', plugin);
      return;
    }
    try {
      // Pass the element instance (this) to the plugin's init method
      const pluginInstance = plugin.init(this, config);
      this.plugins[plugin.name] = {
        definition: plugin,
        instance: pluginInstance, // Store whatever init returns (API, internal state, etc.)
        config
      };
      console.log(`Plugin "${plugin.name}" attached to ${this.id}`);
    } catch (error) {
        console.error(`Error initializing plugin "${plugin.name}" for ${this.id}:`, error);
    }
  }

  /**
   * Initializes all attached plugins. Called during the element's init phase.
   */
  initPlugins() {
    // This is called after the container exists and basic setup is done
    Object.values(this.plugins).forEach(p => {
      // Plugins might need access to the container or other elements
      // The init method in usePlugin already ran, this is for post-init steps
      if (p.instance && typeof p.instance.attachEventListeners === 'function') {
        p.instance.attachEventListeners(); // Example lifecycle hook
      }
    });
  }

  /**
   * Destroys all attached plugins.
   */
  destroyPlugins() {
     Object.values(this.plugins).forEach(p => {
      if (p.instance && typeof p.instance.destroy === 'function') {
        p.instance.destroy();
      }
    });
    this.plugins = {};
  }

  /**
   * Applies capabilities (mixins) to the element instance based on the capabilities array.
   * This is a simple implementation that attaches known plugins based on capability names.
   * A more robust system might use a dedicated CapabilityRegistry.
   * @param {string[]} capabilities - Array of capability names.
   */
  _applyCapabilities(capabilities) {
    console.log(`Applying capabilities for ${this.id}:`, capabilities);
    if (capabilities.includes('draggable')) {
        // Check if DragPlugin is available (imported)
        if (typeof DragPlugin !== 'undefined') {
            this.usePlugin(DragPlugin); // Use default config for now
        } else {
            console.warn(`DragPlugin not found for element ${this.id}`);
        }
    }
    // Removed ResizePlugin application
    // Add checks for other capabilities here
  }

  // --- Responsive Design ---

  /**
   * Initializes responsive features like resize observers.
   */
  _initResponsiveFeatures() {
    // Use ResizeObserver if available for better performance
    if (window.ResizeObserver) {
      this.resizeObserver = new ResizeObserver(entries => {
        // We only observe one element (the container)
        if (entries[0]) {
          this.viewportChangeHandler(); // Call debounced handler
        }
      });
      if (this.container) {
        this.resizeObserver.observe(this.container);
      }
    } else {
      // Fallback to window resize listener
      window.addEventListener('resize', this.viewportChangeHandler);
    }
    window.addEventListener('orientationchange', this.viewportChangeHandler);

    // Initial check
    this._handleViewportChange();
  }

  /**
   * Debounced handler for viewport size changes.
   */
  _handleViewportChange() {
    // Simple debounce implementation
    if (this._resizeTimeout) {
      clearTimeout(this._resizeTimeout);
    }
    this._resizeTimeout = setTimeout(() => {
      this.applyResponsiveAdjustments();
      this._resizeTimeout = null;
    }, 100); // 100ms debounce
  }

  /**
   * Applies responsive adjustments based on current viewport and config.
   * Subclasses can override or extend this.
   */
  applyResponsiveAdjustments() {
    if (!this.container) return;

    const viewportWidth = window.innerWidth;
    // const viewportHeight = window.innerHeight; // If needed

    // Example: Adjust scale based on viewport width (can be more complex)
    // This is a basic example; a breakpoint system might be better.
    if (this.responsiveConfig.scalingMethod === 'viewport') {
        const baseWidth = 1920; // Design base width
        let scaleMultiplier = Math.min(1.5, Math.max(0.5, viewportWidth / baseWidth)); // Basic scaling

        // Apply min/max scale limits from config
        scaleMultiplier = Math.max(this.responsiveConfig.minScale, Math.min(this.responsiveConfig.maxScale, scaleMultiplier));

        // TODO: Integrate with element's base scale from state
        // This needs careful handling to avoid conflicts with user-set scale.
        // Maybe adjust a CSS variable instead?
        // this.container.style.setProperty('--responsive-scale-multiplier', scaleMultiplier);
        // Then the actual scale calculation uses this multiplier.
        // console.log(`Responsive adjustment for ${this.id}: scaleMultiplier=${scaleMultiplier}`);
    }

    // Ensure element stays within viewport bounds
    this.ensureElementInViewport();
  }

   /**
   * Adjusts the element's position if it goes outside the viewport boundaries.
   */
  ensureElementInViewport() {
    if (!this.container) return;

    const rect = this.container.getBoundingClientRect();
    const state = StateManager.getNestedValue(StateManager.getState(), this.statePath);
    if (!state || !state.position) return;

    let { x, y } = state.position; // Current percentage position
    let needsUpdate = false;

    // Rough check based on percentages (more accurate check might need element dimensions)
    // Assuming element center is at (x%, y%)
    const halfWidthPercent = (rect.width / 2 / window.innerWidth) * 100;
    const halfHeightPercent = (rect.height / 2 / window.innerHeight) * 100;

    if (x - halfWidthPercent < 0) { x = halfWidthPercent; needsUpdate = true; }
    if (x + halfWidthPercent > 100) { x = 100 - halfWidthPercent; needsUpdate = true; }
    if (y - halfHeightPercent < 0) { y = halfHeightPercent; needsUpdate = true; }
    if (y + halfHeightPercent > 100) { y = 100 - halfHeightPercent; needsUpdate = true; }

    // Clamp to avoid extreme edge cases
    x = Math.max(0, Math.min(100, x));
    y = Math.max(0, Math.min(100, y));


    if (needsUpdate) {
        console.log(`Adjusting ${this.id} position to stay in viewport: (${x.toFixed(1)}%, ${y.toFixed(1)}%)`);
        this.updateElementState({ position: { x, y } });
    }
  }
}
