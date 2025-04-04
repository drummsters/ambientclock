import { BaseUIElement } from '../base/base-ui-element.js';
import { StateManager } from '../../core/state-manager.js';
import { EventBus } from '../../core/event-bus.js';
import { VisibilityManager } from '../../utils/visibility-manager.js';
import { BackgroundService } from '../../services/background-service.js';
import * as logger from '../../utils/logger.js'; // Import the logger
import { BackgroundControls } from './background-controls.js';
import { ClockControls } from './clock-controls.js';
import { DateControls } from './date-controls.js'; // Keep for potential direct use or type checking if needed elsewhere
import { FavoritesControls } from './favorites-controls.js'; // Import FavoritesControls
import { ControlPanelUIBuilder } from './ui/ControlPanelUIBuilder.js'; // Import the builder
import { DynamicControlManager } from '../../managers/DynamicControlManager.js'; // Import the new manager

/**
 * Manages the main control panel UI.
 * This component will contain various control sections (e.g., background, clock settings).
 */
export class ControlPanel extends BaseUIElement {
  /**
   * Creates a ControlPanel instance.
   * @param {object} config - Configuration object.
   * @param {string} config.id - The ID for the control panel element (e.g., 'controls-panel').
   * @param {ElementManager} elementManager - The application's ElementManager instance.
   * @param {ConfigManager} configManager - The application's ConfigManager instance.
   * @param {BackgroundService} backgroundService - The application's BackgroundService instance.
   * @param {FavoritesService} favoritesService - The application's FavoritesService instance.
   */
  constructor(config, elementManager, configManager, backgroundService, favoritesService) { // Added backgroundService and favoritesService
    if (!elementManager) {
        throw new Error('ControlPanel requires an ElementManager instance.');
    }
    if (!configManager) {
        throw new Error('ControlPanel requires a ConfigManager instance.');
    }
    if (!backgroundService) {
        throw new Error('ControlPanel requires a BackgroundService instance.');
    }
    if (!favoritesService) { // Added check for favoritesService
        throw new Error('ControlPanel requires a FavoritesService instance.');
    }
    // Override type and potentially statePath if needed
    super({ ...config, type: 'control-panel' });
    this.statePath = 'settings.controls'; // Path for panel's own settings (e.g., visibility)
    this.elementManager = elementManager; // Store reference
    this.configManager = configManager; // Store reference
    this.backgroundService = backgroundService; // Store reference
    this.favoritesService = favoritesService; // Store reference
    // this.elementControls = new Map(); // Removed - Handled by DynamicControlManager
    this.visibilityManager = null; // Add property for VisibilityManager
    this.dynamicControlManager = null; // Add property for the dynamic controls manager
    this.CONTROLS_HIDE_DELAY = 3000; // V1 default was 3000ms
    this.subscriptions = []; // Add array for EventBus subscriptions
    logger.debug(`ControlPanel constructor called with ID: ${this.id}`); // Keep as log
    // The main container is expected to exist in the HTML already
    this.container = document.getElementById(this.id);
    this.uiBuilder = null; // Add property for the UI builder
  }

  /**
   * Initializes the ControlPanel: creates static controls, binds state,
   * adds listeners, and checks for pre-existing elements.
   * @returns {Promise<boolean>} True if initialization was successful.
   */
  async init() {
    // Call the base class init first to set up container, static elements, listeners etc.
    const baseInitSuccess = await super.init();
    if (!baseInitSuccess || !this.container) {
      logger.error(`[ControlPanel ${this.id}] Base init failed or container not found.`); // Use logger.error
      return false; // Stop if base initialization failed or container missing
    }

    // Removed finding the trigger element

    // Instantiate VisibilityManager for the panel, passing StateManager and its own ID
    // Note: ControlPanel manages its own visibility separately from the hint/donate elements
    this.visibilityManager = new VisibilityManager(
        StateManager, // Pass the global StateManager
        [this.id],     // Manage only the panel's container element
        {
            mouseIdleHideDelay: this.CONTROLS_HIDE_DELAY, // Pass existing delay
            showOnActivityWhenClosed: false // <<< Set to false for the panel
        }
    );
    // The VisibilityManager's init method will handle listeners and initial state check
    this.visibilityManager.init(); // Initialize the manager for the panel
    logger.debug(`[ControlPanel ${this.id}] VisibilityManager initialized for the panel itself.`); // Keep as log

    // Removed old initial show/hide logic, now handled by VisibilityManager.init()

    // Instantiate and initialize DynamicControlManager AFTER UI is built
    // Ensure placeholders are available from the builder result stored in createElements
    if (this.elements.clockSectionPlaceholder && this.elements.dateSectionPlaceholder) {
        this.dynamicControlManager = new DynamicControlManager(
            {
                clockSectionPlaceholder: this.elements.clockSectionPlaceholder,
                dateSectionPlaceholder: this.elements.dateSectionPlaceholder
                // Pass other placeholders if the manager handles more types
            },
            this.elementManager // Pass ElementManager
        );
            this.dynamicControlManager.init(); // Initialize the manager
        logger.debug(`[ControlPanel ${this.id}] DynamicControlManager initialized.`); // Keep as log
    } else {
        logger.error(`[ControlPanel ${this.id}] Failed to initialize DynamicControlManager: Placeholders missing.`); // Use logger.error
        // Decide if this is a critical failure
    }


    // Removed _initializeControlsForExistingElements(); - Handled by DynamicControlManager.init()

    return true; // Return true assuming the check itself doesn't fail critically
  }


  /**
   * Overrides the base createContainer as the container should already exist in index.html.
   * @returns {HTMLElement} The existing container element.
   */
  createContainer() {
    const existingContainer = document.getElementById(this.id);
    if (!existingContainer) {
      logger.error(`ControlPanel container element with ID "${this.id}" not found in the DOM.`); // Use logger.error
      return null; // Indicate failure if it must exist
    }
    existingContainer.className = 'control-panel-element'; // Ensure base class is added
    logger.debug(`ControlPanel using existing container: #${this.id}`); // Keep as log
    return existingContainer;
  }

  /**
   * Creates the child elements within the control panel.
   * This is where different control sections will be added.
   * @returns {Promise<void>}
   */
  async createElements() {
    if (!this.container) return;
    logger.debug(`ControlPanel (${this.id}): Creating child elements using UIBuilder...`); // Keep as log

    // Instantiate and use the builder
    this.uiBuilder = new ControlPanelUIBuilder(this.container);
    const builtElements = this.uiBuilder.build();

    // Store references provided by the builder
    this.elements.clockSectionPlaceholder = builtElements.clockSectionPlaceholder;
    this.elements.dateSectionPlaceholder = builtElements.dateSectionPlaceholder;
    this.elements.backgroundSection = builtElements.backgroundSection;
    this.elements.favoritesSection = builtElements.favoritesSection;
    this.elements.settingsSection = builtElements.settingsSection;
    this.elements.resetButton = builtElements.resetButton;

    // Now create and append the actual controls into the built structure
    await this._createStaticControls();

    logger.debug(`ControlPanel (${this.id}): Child elements created.`); // Keep as log
  }

  // Removed createSectionContainer - handled by builder
  // Removed createEffectsControls - assuming this is handled elsewhere or not needed now
  // Removed _createDynamicPlaceholders - handled by builder

  /** Creates and initializes static controls (Background, Favorites) into their containers */
  async _createStaticControls() {
    // Background Controls
    if (this.elements.backgroundSection) {
        const backgroundControls = new BackgroundControls(this.elements.backgroundSection, this.configManager, this.backgroundService);
        await backgroundControls.init();
        this.elements.backgroundControls = backgroundControls; // Store reference
    } else {
        logger.error(`[ControlPanel ${this.id}] Background section container not found after build.`); // Use logger.error
    }

    // Favorites Controls
    if (this.elements.favoritesSection) {
        const favoritesControls = new FavoritesControls(this.elements.favoritesSection, this.favoritesService);
        await favoritesControls.init();
        this.elements.favoritesControls = favoritesControls; // Store reference
    } else {
        logger.error(`[ControlPanel ${this.id}] Favorites section container not found after build.`); // Use logger.error
    }

    // Settings Section Reset Button is already created by the builder, reference stored in createElements
  }

  // Removed _initializeControlsForExistingElements - Handled by DynamicControlManager
  // Removed _initializeElementControls - Handled by DynamicControlManager

  /**
   * Binds the control panel to relevant state changes.
   * (No longer needed for visibility, keep for potential future state bindings)
   */
  bindToState() {
    // No state bindings needed for visibility anymore
    logger.debug(`[ControlPanel ${this.id}] Skipping state binding for visibility.`); // Changed to debug
  }

  // updateVisibility method removed as VisibilityManager handles it now

  /**
   * Renders the control panel (potentially updating child controls).
   */
  render() {
    // Base render might not do much if visibility is handled by updateVisibility
    // console.log(`Rendering ControlPanel: ${this.id}`);
  }

  /**
   * Updates options (if any specific options are needed for the panel itself).
   * @param {object} options - The options object.
   */
  updateOptions(options) {
    super.updateOptions(options); // Call base implementation
    // Handle specific control panel options if needed
  }

  /**
   * Adds event listeners for the control panel (e.g., toggle button).
   */
  addEventListeners() {
    // Removed element:created and element:destroyed listeners - Handled by DynamicControlManager

    // Listen for the toggle event from the hint element
    const toggleSub = EventBus.subscribe('controls:toggle', this.toggleVisibility.bind(this));

    // Store unsubscribe functions
    this.subscriptions.push(toggleSub); // Only store the toggle subscription now

    // Reset button listener (using reference from builder)
    this.elements.resetButton?.addEventListener('click', this.handleResetClick.bind(this));

    // Removed hover listener setup for the trigger element
  }

  // Removed addElementControls - Handled by DynamicControlManager
  // Removed removeElementControls - Handled by DynamicControlManager

  handleResetClick() { // Correctly placed handleResetClick
    // Confirm with the user first
    if (confirm('Are you sure you want to reset all settings to their defaults? This action cannot be undone.')) {
        logger.debug(`[ControlPanel ${this.id}] Reset button clicked. Publishing state:reset event.`); // Keep as log
        // Publish an event that the StateManager can listen for
        EventBus.publish('state:reset');
        // Optionally, close the panel after reset?
        // StateManager.update({ settings: { controls: { isOpen: false } } });
    }
  }

  /**
   * Toggles the visibility state of the control panel in the StateManager.
   * The VisibilityManager instance will react to the state change.
   */
  toggleVisibility() {
    logger.debug(`[ControlPanel ${this.id}] toggleVisibility called.`); // Changed to debug
    const currentState = StateManager.getState().settings?.controls?.isOpen || false;
    const newState = !currentState;
    logger.debug(`[ControlPanel ${this.id}] Current state: ${currentState}, New state: ${newState}`); // Changed to debug
    logger.debug(`[ControlPanel ${this.id}] Updating StateManager...`); // Changed to debug
    StateManager.update({
        settings: {
            controls: {
                isOpen: newState // Use newState variable
            }
        }
    });
    logger.debug(`[ControlPanel ${this.id}] StateManager update called.`); // Changed to debug
    // No need to call visibilityManager.toggle() directly anymore.
  }

  /** // Keep the comment block for the correct destroy
   * Cleans up the control panel.
   */
  destroy() {
    logger.debug(`Destroying ControlPanel: ${this.id}`); // Keep as log

    // Unsubscribe from EventBus listeners
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.subscriptions = [];

    // Remove any elements created dynamically inside the panel
    if (this.container) {
        // Don't clear innerHTML, just destroy managed controls
        // this.container.innerHTML = '';
    }
    // Destroy static controls
    this.elements.backgroundControls?.destroy();
    this.elements.favoritesControls?.destroy(); // Destroy favorites controls

    // Destroy dynamically added element controls via the manager
    this.dynamicControlManager?.destroy();

    // Clear visibility manager timer
    this.visibilityManager?.clearHideTimer(); // Keep this for the panel's own visibility

    // Call base destroy to handle subscriptions etc.
    super.destroy();
  }
}
