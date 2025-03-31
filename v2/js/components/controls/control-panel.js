import { BaseUIElement } from '../base/base-ui-element.js';
import { StateManager } from '../../core/state-manager.js';
import { EventBus } from '../../core/event-bus.js';
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
   */
  constructor(config, elementManager, configManager) { // Add configManager parameter
    if (!elementManager) {
        throw new Error('ControlPanel requires an ElementManager instance.');
    }
    if (!configManager) { // Add check for configManager
        throw new Error('ControlPanel requires a ConfigManager instance.');
    }
    // Override type and potentially statePath if needed
    super({ ...config, type: 'control-panel' });
    this.statePath = 'settings.controls'; // Path for panel's own settings (e.g., visibility)
    this.elementManager = elementManager; // Store reference
    this.configManager = configManager; // Store reference
    this.elementControls = new Map(); // Stores controls for individual elements
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
    if (!baseInitSuccess) {
      return false; // Stop if base initialization failed
    }

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
    // Example: Add a title or placeholder
    const title = document.createElement('h2');
    title.textContent = 'Settings';
    this.container.appendChild(title);

    // Instantiate and initialize Background Controls, passing configManager
    const backgroundControls = new BackgroundControls(this.container, this.configManager); // Pass configManager
    await backgroundControls.init();
    this.elements.backgroundControls = backgroundControls; // Store reference

    // Element-specific controls will be added dynamically via event listeners

    console.log(`ControlPanel (${this.id}): Static child elements created.`);
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
   * For example, listening for whether the panel should be open or closed.
   */
  bindToState() {
    // Example: Subscribe to a state property that controls panel visibility
    const visibilityPath = `${this.statePath}.isOpen`; // e.g., 'settings.controls.isOpen'
    const eventName = `state:${visibilityPath}:changed`;

    const subscription = EventBus.subscribe(eventName, (isOpen) => {
      console.log(`[${this.id}] Event received: ${eventName}`, isOpen);
      this.updateVisibility(isOpen);
    });
    this.unsubscribers.push(subscription.unsubscribe);

    // Apply initial visibility state
    const initialVisibilityState = StateManager.getNestedValue(StateManager.getState(), visibilityPath);
    console.log(`[${this.id}] Initial visibility state: ${initialVisibilityState}`);
    this.updateVisibility(initialVisibilityState ?? false); // Default to closed if no state
    // Removed global effect state binding
  }

  /**
   * Updates the visibility of the control panel.
   * @param {boolean} isOpen - Whether the panel should be visible.
   */
  updateVisibility(isOpen) {
    if (!this.container) return;
    console.log(`[${this.id}] Updating visibility to: ${isOpen}`);
    this.container.classList.toggle('is-open', isOpen);
    this.container.style.display = isOpen ? 'block' : 'none'; // Or use CSS transitions
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
    // Listen for element creation/destruction to add/remove controls dynamically
    const createdUnsub = EventBus.subscribe('element:created', ({ id, type }) => {
        console.log(`[ControlPanel] Received element:created event for ID: ${id}, Type: ${type}`);
        this.addElementControls(id, type);
    });

    const destroyedUnsub = EventBus.subscribe('element:destroyed', ({ id }) => {
        console.log(`[ControlPanel] Received element:destroyed event for ID: ${id}`);
        this.removeElementControls(id);
    });

    this.unsubscribers.push(createdUnsub.unsubscribe, destroyedUnsub.unsubscribe);

    // TODO: Add listener for a toggle button if one exists outside the panel
    // Removed global effect listener
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

    if (elementType === 'clock') {
        console.log(`[ControlPanel] Adding ClockControls for ${elementId}`);
        controlsInstance = new ClockControls(this.container, elementId);
        success = await controlsInstance.init();
    } else if (elementType === 'date') {
        console.log(`[ControlPanel] Adding DateControls for ${elementId}`);
        controlsInstance = new DateControls(this.container, elementId);
        success = await controlsInstance.init();
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

  /**
   * Cleans up the control panel.
   */
  destroy() {
    console.log(`Destroying ControlPanel: ${this.id}`);
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

    // Call base destroy to handle subscriptions etc.
    super.destroy();
  }
}
