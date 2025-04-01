import { BaseUIElement } from '../base/base-ui-element.js';
import { StateManager } from '../../core/state-manager.js';
import { EventBus } from '../../core/event-bus.js';
import { VisibilityManager } from '../../utils/visibility-manager.js'; // Import VisibilityManager
import { BackgroundService } from '../../services/background-service.js'; // Import BackgroundService
import { BackgroundControls } from './background-controls.js';
import { ClockControls } from './clock-controls.js';
import { DateControls } from './date-controls.js'; // Import DateControls

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
   */
  constructor(config, elementManager, configManager, backgroundService) { // Added backgroundService
    if (!elementManager) {
        throw new Error('ControlPanel requires an ElementManager instance.');
    }
    if (!configManager) {
        throw new Error('ControlPanel requires a ConfigManager instance.');
    }
    if (!backgroundService) { // Added check for backgroundService
        throw new Error('ControlPanel requires a BackgroundService instance.');
    }
    // Override type and potentially statePath if needed
    super({ ...config, type: 'control-panel' });
    this.statePath = 'settings.controls'; // Path for panel's own settings (e.g., visibility)
    this.elementManager = elementManager; // Store reference
    this.configManager = configManager; // Store reference
    this.backgroundService = backgroundService; // Store reference
    this.elementControls = new Map(); // Stores controls for individual elements
    this.visibilityManager = null; // Add property for VisibilityManager
    this.CONTROLS_HIDE_DELAY = 3000; // V1 default was 3000ms
    this.triggerElement = null; // Add property for hover trigger
    this.subscriptions = []; // Add array for EventBus subscriptions
    console.log(`ControlPanel constructor called with ID: ${this.id}`);
    // The main container is expected to exist in the HTML already
    this.container = document.getElementById(this.id);
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
      console.error(`[ControlPanel ${this.id}] Base init failed or container not found.`);
      return false; // Stop if base initialization failed or container missing
    }

    // Find the trigger element
    this.triggerElement = document.getElementById('controls-trigger'); // Assumes ID exists in HTML
    if (!this.triggerElement) {
        console.warn(`[ControlPanel ${this.id}] Hover trigger element #controls-trigger not found.`);
        // Proceed without hover trigger? Or fail? For now, proceed.
    }

    // Instantiate VisibilityManager for the panel, passing StateManager
    this.visibilityManager = new VisibilityManager(this.container, StateManager, this.CONTROLS_HIDE_DELAY);
    console.log(`[ControlPanel ${this.id}] VisibilityManager initialized.`);

    // Initial setup: Show controls briefly, then start hide timer
    // VisibilityManager constructor now handles initial state based on StateManager
    // this.visibilityManager.show(); // No longer needed here
    setTimeout(() => {
        // Only start hide timer if it's currently visible (based on initial state)
        if (this.visibilityManager?.isElementVisible()) {
            this.visibilityManager?.startHideTimer();
        }
    }, 2000); // Show for 2 seconds initially

    console.log(`[ControlPanel ${this.id}] Base init complete. Checking for existing elements...`);

    // Now, check for elements that might have been created before this panel initialized
    const existingElements = this.elementManager.getAllElementInstances();
    console.log(`[ControlPanel ${this.id}] Found ${existingElements.size} existing elements.`);
    existingElements.forEach(elementInstance => {
        this.addElementControls(elementInstance.id, elementInstance.type);
    });

    console.log(`[ControlPanel ${this.id}] Finished checking for existing elements.`);
    return true; // Return true assuming the check itself doesn't fail critically
  }


  /**
   * Overrides the base createContainer as the container should already exist in index.html.
   * @returns {HTMLElement} The existing container element.
   */
  createContainer() {
    const existingContainer = document.getElementById(this.id);
    if (!existingContainer) {
      console.error(`ControlPanel container element with ID "${this.id}" not found in the DOM.`);
      return null; // Indicate failure if it must exist
    }
    existingContainer.className = 'control-panel-element'; // Ensure base class is added
    console.log(`ControlPanel using existing container: #${this.id}`);
    return existingContainer;
  }

  /**
   * Creates the child elements within the control panel.
   * This is where different control sections will be added.
   * @returns {Promise<void>}
   */
  async createElements() {
    if (!this.container) return;
    console.log(`ControlPanel (${this.id}): Creating child elements...`);
    this.container.innerHTML = ''; // Clear any existing content

    // --- Create Sections in V1 Order ---

    // 1. Clock Section (Placeholder)
    this.elements.clockSectionPlaceholder = this.createSectionContainer('Clock');
    this.container.appendChild(this.elements.clockSectionPlaceholder);

    // 2. Date Section (Placeholder)
    this.elements.dateSectionPlaceholder = this.createSectionContainer('Date');
    this.container.appendChild(this.elements.dateSectionPlaceholder);

    // 3. Background Section
    const backgroundSection = this.createSectionContainer('Background');
    const backgroundControls = new BackgroundControls(backgroundSection, this.configManager, this.backgroundService);
    await backgroundControls.init();
    this.elements.backgroundControls = backgroundControls; // Store reference
    this.container.appendChild(backgroundSection);

    // 4. Effects Section (Placeholder for now)
    const effectsSection = this.createSectionContainer('Effects');
    // TODO: Add effect controls if needed (V2 handles effects per-element)
    const effectsPlaceholderText = document.createElement('p');
    effectsPlaceholderText.textContent = 'Element effects are controlled individually.';
    effectsPlaceholderText.style.fontSize = '0.9em';
    effectsPlaceholderText.style.opacity = '0.7';
    effectsSection.appendChild(effectsPlaceholderText);
    this.container.appendChild(effectsSection);

    // 5. Favorites Section (Placeholder for now)
    const favoritesSection = this.createSectionContainer('Favorites');
    // TODO: Implement Favorites functionality
    const favoritesPlaceholderText = document.createElement('p');
    favoritesPlaceholderText.textContent = 'Favorites feature coming soon.';
    favoritesPlaceholderText.style.fontSize = '0.9em';
    favoritesPlaceholderText.style.opacity = '0.7';
    favoritesSection.appendChild(favoritesPlaceholderText);
    this.container.appendChild(favoritesSection);

    // 6. Settings Section
    const settingsSection = this.createSectionContainer('Settings');
    const resetButton = document.createElement('button');
    resetButton.textContent = 'Reset All Settings';
    resetButton.id = `${this.id}-reset-button`;
    // Add class for styling instead of inline styles
    resetButton.className = 'reset-button'; // Use class for styling
    // Wrap button in a control group for consistent layout
    const resetGroup = document.createElement('div');
    resetGroup.className = 'control-group'; // Use standard group
    resetGroup.style.justifyContent = 'center'; // Center button within group
    resetGroup.appendChild(resetButton);
    settingsSection.appendChild(resetGroup);
    this.container.appendChild(settingsSection);
    this.elements.resetButton = resetButton; // Store reference

    console.log(`ControlPanel (${this.id}): Static child elements created.`);
  }

  /** Helper to create a section container with title */
  createSectionContainer(titleText) {
      const section = document.createElement('div');
      section.className = 'control-section';
      const title = document.createElement('h3');
      title.className = 'section-title'; // Use V1 class
      title.textContent = titleText;
      section.appendChild(title);
      return section;
  }

  /** Creates controls for global effects settings */
  createEffectsControls() {
    const effectsContainer = document.createElement('div');
    effectsContainer.className = 'control-section effects-controls';

    const title = document.createElement('h3');
    title.textContent = 'Global Effects';
    effectsContainer.appendChild(title);

    // --- Effect Style Select ---
    const styleGroup = document.createElement('div'); // Using BaseUIElement's helper might be better if available
    styleGroup.className = 'control-group';
    const styleLabel = document.createElement('label');
    styleLabel.textContent = 'Style:';
    styleLabel.style.marginRight = '10px';
    styleGroup.appendChild(styleLabel);

    this.elements.effectSelect = document.createElement('select');
    this.elements.effectSelect.id = 'global-effect-select';
    ['flat', 'raised', 'reflected'].forEach(style => {
        const option = document.createElement('option');
        option.value = style;
        option.textContent = style.charAt(0).toUpperCase() + style.slice(1);
        this.elements.effectSelect.appendChild(option);
    });
    styleGroup.appendChild(this.elements.effectSelect);
    effectsContainer.appendChild(styleGroup);

    this.container.appendChild(effectsContainer); // Add to main panel container
  }


  /**
   * Binds the control panel to relevant state changes.
   * (No longer needed for visibility, keep for potential future state bindings)
   */
  bindToState() {
    // No state bindings needed for visibility anymore
    console.log(`[ControlPanel ${this.id}] Skipping state binding for visibility.`);
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
    // Listen for element creation/destruction to add/remove controls dynamically
    const createdSub = EventBus.subscribe('element:created', ({ id, type }) => {
        console.log(`[ControlPanel] Received element:created event for ID: ${id}, Type: ${type}`);
        this.addElementControls(id, type);
    });

    const destroyedSub = EventBus.subscribe('element:destroyed', ({ id }) => {
        console.log(`[ControlPanel] Received element:destroyed event for ID: ${id}`);
        this.removeElementControls(id);
    });

    // Listen for the toggle event from the hint element
    const toggleSub = EventBus.subscribe('controls:toggle', this.toggleVisibility.bind(this));

    // Store unsubscribe functions
    this.subscriptions.push(createdSub, destroyedSub, toggleSub);

    // Reset button listener
    this.elements.resetButton?.addEventListener('click', this.handleResetClick.bind(this));

    // Add hover listener for the trigger element (if found)
    if (this.triggerElement) {
        this.triggerElement.addEventListener('mouseenter', () => {
            this.visibilityManager?.show();
            this.visibilityManager?.clearHideTimer(); // Keep open while hovering trigger
        });
        // Add mouseleave for trigger to start the hide timer when leaving the trigger area
        this.triggerElement.addEventListener('mouseleave', () => {
            this.visibilityManager?.startHideTimer();
        });
    }
  }

  /**
   * Adds controls for a newly created element if applicable.
   * @param {string} elementId - The ID of the created element.
   * @param {string} elementType - The type of the created element.
   */
  async addElementControls(elementId, elementType) {
    if (this.elementControls.has(elementId)) {
        console.log(`[ControlPanel] Controls for ${elementId} already exist.`);
        return; // Avoid adding duplicate controls
    }

    let controlsInstance = null;
    let success = false;
    let targetContainer = null;

    if (elementType === 'clock') {
        console.log(`[ControlPanel] Adding ClockControls for ${elementId}`);
        targetContainer = this.elements.clockSectionPlaceholder;
        if (targetContainer) {
            // Clear placeholder text if any
            targetContainer.innerHTML = '';
             // Re-add title if cleared
            const title = document.createElement('h3');
            title.className = 'section-title';
            title.textContent = 'Clock';
            targetContainer.appendChild(title);
            // Add controls
            controlsInstance = new ClockControls(targetContainer, elementId);
            success = await controlsInstance.init();
        } else {
             console.error(`[ControlPanel] Clock section placeholder not found for ${elementId}`);
        }
    } else if (elementType === 'date') {
        console.log(`[ControlPanel] Adding DateControls for ${elementId}`);
        targetContainer = this.elements.dateSectionPlaceholder;
         if (targetContainer) {
            // Clear placeholder text if any
            targetContainer.innerHTML = '';
             // Re-add title if cleared
            const title = document.createElement('h3');
            title.className = 'section-title';
            title.textContent = 'Date';
            targetContainer.appendChild(title);
            // Add controls
            controlsInstance = new DateControls(targetContainer, elementId);
            success = await controlsInstance.init();
        } else {
             console.error(`[ControlPanel] Date section placeholder not found for ${elementId}`);
        }
    }
    // Add more 'else if' blocks for other element types

    if (success && controlsInstance) {
        this.elementControls.set(elementId, controlsInstance);
    } else if (controlsInstance) { // If init failed but instance was created
         console.error(`[ControlPanel] Failed to initialize ${elementType} controls for ${elementId}`);
    }
  }

  /**
   * Removes controls associated with a destroyed element.
   * @param {string} elementId - The ID of the destroyed element.
   */
  removeElementControls(elementId) {
    const controls = this.elementControls.get(elementId);
    if (controls) {
        console.log(`[ControlPanel] Removing controls for ${elementId}`);
        controls.destroy(); // Call the control's own destroy method
        this.elementControls.delete(elementId);
    }
  }

  handleResetClick() { // Correctly placed handleResetClick
    // Confirm with the user first
    if (confirm('Are you sure you want to reset all settings to their defaults? This action cannot be undone.')) {
        console.log(`[ControlPanel ${this.id}] Reset button clicked. Publishing state:reset event.`);
        // Publish an event that the StateManager can listen for
        EventBus.publish('state:reset');
        // Optionally, close the panel after reset?
        // StateManager.update({ settings: { controls: { isOpen: false } } });
    }
  }

  /**
   * Toggles the visibility of the control panel using its VisibilityManager.
   */
  toggleVisibility() {
    this.visibilityManager?.toggle();
  }

  /** // Keep the comment block for the correct destroy
   * Cleans up the control panel.
   */
  destroy() {
    console.log(`Destroying ControlPanel: ${this.id}`);

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

    // Destroy dynamically added element controls
    this.elementControls.forEach(controls => controls.destroy());
    this.elementControls.clear();

    // Clear visibility manager timer
    this.visibilityManager?.clearHideTimer();

    // Call base destroy to handle subscriptions etc.
    super.destroy();
  }
}
