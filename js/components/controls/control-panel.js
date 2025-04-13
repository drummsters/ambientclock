import { BaseUIElement } from '../base/base-ui-element.js';
import { StateManager } from '../../core/state-manager.js';
import { EventBus } from '../../core/event-bus.js';
// import { VisibilityManager } from '../../utils/visibility-manager.js'; // REMOVED
import { BackgroundService } from '../../services/background-service.js';
import * as logger from '../../utils/logger.js'; // Import the logger
import { BackgroundControls } from './background-controls.js';
import { ClockControls } from './clock-controls.js';
import { DateControls } from './date-controls.js';
import { FavoritesControls } from './favorites-controls.js';
import { FontPanel } from './font-panel.js'; // Import the new FontPanel
import { ControlPanelUIBuilder } from './ui/ControlPanelUIBuilder.js';
import { DynamicControlManager } from '../../managers/DynamicControlManager.js';
import { SettingsIOService } from '../../services/settings-io-service.js';
import { AVAILABLE_FONTS } from '../../utils/font-list.js'; // Corrected import path

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
    this.dynamicControlManager = null;
    this.fontPanel = null; // Add property for FontPanel instance
    this.settingsIOService = new SettingsIOService();
    this.subscriptions = [];
    // REMOVED: visibilityManager, CONTROLS_HIDE_DELAY, visibilityObserver, hover states, timers
    this.boundHandleBackgroundClick = this.handleBackgroundClick.bind(this); // Keep background click handler
    logger.debug(`ControlPanel constructor called with ID: ${this.id}`);
    this.container = document.getElementById(this.id);
    this.uiBuilder = null;
    this.isVisible = false; // Track visibility state internally
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

    // REMOVED: VisibilityManager instantiation and initial visibility logic

    // Instantiate and initialize DynamicControlManager AFTER UI is built
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

    // Find and potentially initialize the FontPanel instance
    this.fontPanel = document.querySelector('font-panel');
    if (!this.fontPanel) {
        logger.error(`[ControlPanel ${this.id}] FontPanel element not found in the DOM.`);
    } else {
        // TODO: Populate fonts later when available
        logger.debug(`[ControlPanel ${this.id}] FontPanel instance found.`);
    }
    // REMOVED: _observeVisibilityChanges(); call

    // Ensure panel starts hidden
    if (this.container) {
        this.container.style.display = 'none';
        this.isVisible = false;
    }

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
    this.elements.downloadButton = builtElements.downloadButton;
    this.elements.uploadButton = builtElements.uploadButton;
    this.elements.fileInput = builtElements.fileInput; // Store reference to hidden input
    this.elements.resetButton = builtElements.resetButton;

    // Now create and append the actual controls into the built structure
    await this._createStaticControls();

    // Populate the font panel once after all controls are potentially initialized
    this._populateFontPanelOnce();

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
   * Populates the font panel with the consolidated list, ensuring it only happens once.
   * @private
   */
  _populateFontPanelOnce() {
      const fontPanel = document.querySelector('font-panel');
      if (!fontPanel) {
          logger.warn(`[ControlPanel ${this.id}] FontPanel element not found, cannot populate.`);
          return;
      }

      // Check if already populated (using the panel's internal state)
      if (fontPanel.fonts && fontPanel.fonts.length > 0) {
          // console.log(`[ControlPanel ${this.id}] FontPanel already populated, skipping.`);
          return;
      }

      // Use the imported consolidated list (already sorted)
      const fonts = AVAILABLE_FONTS;

      if (typeof fontPanel.populateFonts === 'function') {
          logger.log(`[ControlPanel ${this.id}] Populating FontPanel with ${fonts.length} fonts.`);
          fontPanel.populateFonts(fonts);
      } else {
          logger.error(`[ControlPanel ${this.id}] FontPanel instance does not have a populateFonts method.`);
      }
  }

  /**
   * Binds the control panel to relevant state changes.
   * Binds the control panel to relevant state changes (e.g., its own visibility).
   */
  bindToState() {
    // Subscribe to changes in the panel's open state
    const statePath = 'settings.controls.isOpen';
    const eventName = `state:${statePath}:changed`;
    logger.debug(`[ControlPanel ${this.id}] Subscribing to ${eventName}`);

    const visibilitySub = EventBus.subscribe(eventName, (isOpen) => {
      logger.debug(`[ControlPanel ${this.id}] Received ${eventName} event with value: ${isOpen}`);
      if (isOpen) {
        this.show();
      } else {
        this.hide();
      }
    });
    this.subscriptions.push(visibilitySub); // Add to subscriptions for cleanup

    // Apply initial state
    const initialState = StateManager.getNestedValue(StateManager.getState(), statePath);
    logger.debug(`[ControlPanel ${this.id}] Applying initial state for ${statePath}: ${initialState}`);
    if (initialState) {
        this.show();
    } else {
        this.hide(); // Ensure it's hidden if initial state is false/undefined
    }
  }

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
    // Listen for show requests (e.g., from hint click or element click)
    // This might be redundant now if state is the primary driver, but keep for now
    const showRequestSub = EventBus.subscribe('controls:showRequest', this.show.bind(this));
    this.subscriptions.push(showRequestSub);

    // REMOVED: Incorrect call to bindToState() here. BaseUIElement.init() calls it.

    // Reset button listener
    this.elements.resetButton?.addEventListener('click', this.handleResetClick.bind(this));

    // Settings Download button listener
    this.elements.downloadButton?.addEventListener('click', () => this.settingsIOService.exportSettings());

    // Settings Upload button listener (triggers hidden input)
    this.elements.uploadButton?.addEventListener('click', () => this.elements.fileInput?.click());

    // Hidden file input listener (handles the actual file selection)
    this.elements.fileInput?.addEventListener('change', this.handleFileImport.bind(this));

    // Add listener to hide panel on background click using the stored bound reference
    // Note: The logic inside handleBackgroundClick will be simplified
    document.addEventListener('click', this.boundHandleBackgroundClick);

    // REMOVED: mousemove, mouseenter, mouseleave listeners
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
    // StateManager.update({ settings: { controls: { isOpen: false } } }); // Don't update state
      }
  }

   /**
    * Handles clicks outside the control panel, font panel, clock, and date elements to hide panels.
    * This listener is attached to the document in addEventListeners.
    * @param {Event} event - The click event.
    */
   handleBackgroundClick(event) {
       // REMOVED: if (!this.isVisible) return;

       const clickedControlPanel = this.container?.contains(event.target);
       const clickedFontPanel = this.fontPanel?.contains(event.target);
       const clickedClock = event.target.closest('.clock-element');
       const clickedDate = event.target.closest('.date-element');
       const clickedHint = event.target.closest('.controls-hint-element'); // Also ignore hint clicks

       // If the click was outside all these elements, toggle the panels' visibility
       if (!clickedControlPanel && !clickedFontPanel && !clickedClock && !clickedDate && !clickedHint) {
           if (this.isVisible) {
               logger.debug(`[ControlPanel ${this.id}] Background click detected outside relevant elements. Hiding panels.`);
               this.hide();
           } else {
               // If hidden, a background click should show it (unless this behavior is unwanted)
               // For now, let's assume background click toggles show/hide
               logger.debug(`[ControlPanel ${this.id}] Background click detected outside relevant elements. Showing panels.`);
               this.show();
           }
       } else {
           // Click was inside relevant elements, do nothing (keep panels visible if they were)
           logger.debug(`[ControlPanel ${this.id}] Click detected inside relevant elements. Panels visibility unchanged.`);
       }
   }

  // REMOVED: _observeVisibilityChanges()

  /**
   * Handles the file selection event from the hidden input.
   * @param {Event} event - The change event object.
   */
  async handleFileImport(event) {
    const file = event.target.files[0];
    if (!file) {
      logger.log('[ControlPanel] No file selected for import.');
      return;
    }

    // Call the service method, passing the file
    // Note: We'll need to modify SettingsIOService.importSettings to accept the file
    await this.settingsIOService.importSettings(file);

    // Reset the file input value so the same file can be selected again if needed
    event.target.value = null;
  }

  // REMOVED: toggleVisibility() method entirely

  // --- New Simple Show/Hide Methods ---

  /** Shows the control panel by adding the .visible class */
  show() {
      if (this.isVisible || !this.container) return;
      logger.debug(`[ControlPanel ${this.id}] Showing panel by adding .visible class.`);
      this.container.classList.add('visible');
      // We might not even need style.display if .visible handles it, but let's ensure it's not 'none'
      if (this.container.style.display === 'none') {
          this.container.style.display = 'flex'; // Ensure display is set if previously 'none'
      }
      this.isVisible = true;
      // Note: Font panel visibility is handled separately by its own triggers now
  }

  /** Hides the control panel and the font panel by removing the .visible class */
  hide() {
      if (!this.isVisible || !this.container) return;
      logger.debug(`[ControlPanel ${this.id}] Hiding panel by removing .visible class.`);
      this.container.classList.remove('visible');
      // Optionally set display to none as well, though CSS might handle it via .visible removal
      // this.container.style.display = 'none';
      this.isVisible = false;

      // Also hide the font panel when the main panel hides
      if (this.fontPanel?.isVisible) {
          logger.debug(`[ControlPanel ${this.id}] Hiding font panel as well.`);
          this.fontPanel.hide();
      }
  }

  // --- End New Simple Show/Hide Methods ---

  /**
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

    // Destroy FontPanel (if it has a destroy method) - FontPanel is HTMLElement, no destroy needed unless added
    // if (this.fontPanel && typeof this.fontPanel.destroy === 'function') {
    //     this.fontPanel.destroy();
    // }

    // REMOVED: visibilityManager cleanup
    // REMOVED: visibilityObserver disconnect

    // Call base destroy to handle subscriptions etc.
    super.destroy();

    // Remove background click listener using the stored bound reference
    document.removeEventListener('click', this.boundHandleBackgroundClick);
  }
}
