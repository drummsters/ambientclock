import { StateManager } from '../../core/state-manager.js';
import { EventBus } from '../../core/event-bus.js';
import { StyleHandler } from '../base/mixins/StyleHandler.js';
import { DateControlsUIBuilder } from './ui/DateControlsUIBuilder.js'; // Import the new UI Builder

/**
 * Manages the UI controls for a specific Date element within the control panel.
 */
export class DateControls {
  /**
   * Creates a DateControls instance.
   * @param {HTMLElement} parentContainer - The DOM element to append the controls to.
   * @param {string} elementId - The ID of the date element being controlled (e.g., 'date-default').
   */
  constructor(parentContainer, elementId) {
    if (!parentContainer) {
      throw new Error('DateControls requires a parent container element.');
    }
    if (!elementId) {
        throw new Error('DateControls requires the ID of the element to control.');
    }
    this.parentContainer = parentContainer;
    this.elementId = elementId;
    this.container = null; // The main container for these controls
    this.elements = {}; // To store references to input elements
    this.statePath = `elements.${this.elementId}.options`;
    this.builder = new DateControlsUIBuilder(this.elementId); // Instantiate the builder
    this.unsubscribers = [];

    console.log(`DateControls constructor called for element ID: ${this.elementId}`);
  }

  /**
   * Initializes the date controls: creates DOM, binds state, adds listeners.
   * @returns {Promise<boolean>} True if initialization was successful.
   */
  async init() {
    console.log(`Initializing DateControls for ${this.elementId}...`);
    try {
      // 1. Create a container *within* the parent (ControlPanel)
      this.container = document.createElement('div');
      this.container.className = 'date-controls-content'; // Add a content class
      this.parentContainer.appendChild(this.container);

      // 2. Build the UI using the builder and store element references
      this.elements = this.builder.build(this.container);

      // 3. Bind to relevant state changes
      this.bindToState();

      // 4. Add event listeners for user interactions
      this.addEventListeners();

      console.log(`DateControls for ${this.elementId} initialized successfully.`);
      return true;
    } catch (error) {
      console.error(`Error initializing DateControls for ${this.elementId}:`, error);
      this.destroy();
      return false;
    }
  }

  // Removed createElements and helper methods (_create..., createControlGroup)
  // UI creation is now handled by DateControlsUIBuilder

  /** Binds the controls to state changes. */
  bindToState() {
    // Listen for option changes
    const optionsEventName = `state:${this.statePath}:changed`; // e.g., state:elements.date-default.options:changed
    const optionsSubscription = EventBus.subscribe(optionsEventName, (optionsState) => {
      console.log(`[DateControls ${this.elementId}] Event received: ${optionsEventName}`, optionsState);
      this._updateOptionsUI(optionsState); // Use helper
    });
    this.unsubscribers.push(optionsSubscription.unsubscribe);

    // Listen for top-level element changes (for scale)
    const elementStatePath = `elements.${this.elementId}`; // e.g., elements.date-default
    const elementEventName = `state:${elementStatePath}:changed`;
    const elementSubscription = EventBus.subscribe(elementEventName, (elementState) => {
        console.log(`[DateControls ${this.elementId}] Event received: ${elementEventName}`, elementState);
        this._updateElementUI(elementState); // Use helper
    });
    this.unsubscribers.push(elementSubscription.unsubscribe);

    // Apply initial state for options
    const initialOptionsState = StateManager.getNestedValue(StateManager.getState(), this.statePath);
    if (initialOptionsState) {
      console.log(`[DateControls ${this.elementId}] Applying initial options state:`, initialOptionsState);
      this._updateOptionsUI(initialOptionsState); // Use helper
    } else {
       console.log(`[DateControls ${this.elementId}] No initial options state found at path: ${this.statePath}`);
       this._updateOptionsUI({}); // Apply option defaults
    }

    // Apply initial state for scale
    const initialElementState = StateManager.getNestedValue(StateManager.getState(), elementStatePath);
    if (initialElementState) {
        console.log(`[DateControls ${this.elementId}] Applying initial element state:`, initialElementState);
        this._updateElementUI(initialElementState); // Use helper
    } else {
        console.log(`[DateControls ${this.elementId}] No initial element state found.`);
        this._updateElementUI({}); // Apply element defaults
    }
  }

  /** Updates UI elements based on the provided options state. */
  _updateOptionsUI(optionsState = {}) {
     console.log(`[DateControls ${this.elementId}] Updating UI from options state:`, optionsState);
     if (!this.elements) return;

     if (this.elements.visibleCheckbox) this.elements.visibleCheckbox.checked = optionsState.visible ?? true;
     if (this.elements.formatSelect) this.elements.formatSelect.value = optionsState.format || 'Day, Month DD';
     if (this.elements.fontSelect) this.elements.fontSelect.value = optionsState.fontFamily || 'Segoe UI'; // Added
     if (this.elements.boldCheckbox) this.elements.boldCheckbox.checked = (optionsState.fontWeight === 'bold'); // Added
     if (this.elements.colorPicker) this.elements.colorPicker.value = optionsState.color || '#FFFFFF';
     if (this.elements.separatorCheckbox) this.elements.separatorCheckbox.checked = optionsState.showSeparator ?? false;
  }

  /** Updates UI elements based on the provided top-level element state (scale, opacity, effect). */
  _updateElementUI(elementState = {}) {
      console.log(`[DateControls ${this.elementId}] Updating UI from element state:`, elementState);
      if (!this.elements) return;

      // Scale
      const currentScale = elementState.scale ?? 1.0;
      if (this.elements.sizeSlider) {
          this.elements.sizeSlider.value = currentScale;
          if (this.elements.sizeValue) {
              this.elements.sizeValue.textContent = parseFloat(currentScale).toFixed(2);
          }
      }

      // Opacity
      const currentOpacity = elementState.opacity ?? 1.0;
      if (this.elements.opacitySlider) {
          this.elements.opacitySlider.value = currentOpacity;
          if (this.elements.opacityValue) {
              this.elements.opacityValue.textContent = parseFloat(currentOpacity).toFixed(2);
          }
      }

      // Effect Style
      const currentStyle = elementState.effectStyle || 'flat';
      if (this.elements.effectSelect) {
          this.elements.effectSelect.value = currentStyle;
      }

      // Center
      if (this.elements.centerCheckbox) {
          this.elements.centerCheckbox.checked = elementState.centered ?? false;
      }
  }

  // Removed old updateUIFromState, updateUIScale, updateUIOpacity, updateUIEffectStyle methods

  /** Adds event listeners to the UI elements. */
  addEventListeners() {
    if (!this.elements) return;
    this._addOptionsListeners();
    this._addElementListeners();
  }

  /** Adds listeners for controls that modify the element's 'options' state */
  _addOptionsListeners() {
    this.elements.visibleCheckbox?.addEventListener('change', (e) => this.dispatchStateUpdate({ visible: e.target.checked }));
    this.elements.formatSelect?.addEventListener('change', (e) => this.dispatchStateUpdate({ format: e.target.value }));
    this.elements.fontSelect?.addEventListener('change', (e) => this.dispatchStateUpdate({ fontFamily: e.target.value })); // Added
    this.elements.boldCheckbox?.addEventListener('change', (e) => this.dispatchStateUpdate({ fontWeight: e.target.checked ? 'bold' : 'normal' })); // Added
    this.elements.colorPicker?.addEventListener('input', (e) => this.dispatchStateUpdate({ color: e.target.value }));
    this.elements.separatorCheckbox?.addEventListener('change', (e) => this.dispatchStateUpdate({ showSeparator: e.target.checked }));
  }

  /** Adds listeners for controls that modify the top-level element state */
  _addElementListeners() {
    // Size Slider Change
    this.elements.sizeSlider?.addEventListener('input', (e) => {
        const newScale = parseFloat(e.target.value);
        if (this.elements.sizeValue) {
            this.elements.sizeValue.textContent = newScale.toFixed(2);
        }
        this.dispatchElementStateUpdate({ scale: newScale });
    });

    // Opacity Slider Change
    this.elements.opacitySlider?.addEventListener('input', (e) => {
        const newOpacity = parseFloat(e.target.value);
        if (this.elements.opacityValue) {
            this.elements.opacityValue.textContent = newOpacity.toFixed(2);
        }
        this.dispatchElementStateUpdate({ opacity: newOpacity });
    });

    // Effect Style Select Change
    this.elements.effectSelect?.addEventListener('change', (e) => {
        this.dispatchElementStateUpdate({ effectStyle: e.target.value });
    });

    // Center Link Click
    this.elements.centerLink?.addEventListener('click', (e) => {
        e.preventDefault();
        this.dispatchElementStateUpdate({ position: { x: 50, y: 50 } });
    });
  }

  /** Dispatches an update to the StateManager for options. */
  dispatchStateUpdate(optionChanges) {
    console.log(`[DateControls ${this.elementId}] Dispatching options state update:`, optionChanges);
    const updatePayload = {
        elements: {
            [this.elementId]: {
                options: optionChanges
            }
        }
    };
    StateManager.update(updatePayload);
  }

  /** Dispatches an update to the StateManager for top-level element properties. */
  dispatchElementStateUpdate(elementChanges) {
      console.log(`[DateControls ${this.elementId}] Dispatching element state update:`, elementChanges);
      const updatePayload = {
          elements: {
              [this.elementId]: elementChanges
          }
      };
      StateManager.update(updatePayload);
  }

  /** Cleans up resources. */
  destroy() {
    console.log(`Destroying DateControls for ${this.elementId}...`);
    this.unsubscribers.forEach(unsubscribe => unsubscribe());
    this.unsubscribers = [];

    // Remove elements from DOM (clear the container we created)
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    this.container = null; // Nullify the container we created
    this.elements = {};
    console.log(`DateControls for ${this.elementId} destroyed.`);
  }
}
