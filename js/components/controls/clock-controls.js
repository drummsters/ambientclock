import { StateManager } from '../../core/state-manager.js';
import { EventBus } from '../../core/event-bus.js';
import { StyleHandler } from '../base/mixins/StyleHandler.js';
import { ClockControlsUIBuilder } from './ui/ClockControlsUIBuilder.js'; // Import the new UI Builder

/**
 * Manages the UI controls for a specific Clock element within the control panel.
 */
export class ClockControls {
  /**
   * Creates a ClockControls instance.
   * @param {HTMLElement} parentContainer - The DOM element to append the controls to.
   * @param {string} elementId - The ID of the clock element being controlled (e.g., 'clock-default').
   */
  constructor(parentContainer, elementId) {
    if (!parentContainer) {
      throw new Error('ClockControls requires a parent container element.');
    }
    if (!elementId) {
        throw new Error('ClockControls requires the ID of the element to control.');
    }
    this.parentContainer = parentContainer;
    this.elementId = elementId;
    this.container = null; // The main container for these controls
    this.elements = {}; // To store references to input elements
    // Path to the specific element's options in the state
    this.statePath = `elements.${this.elementId}.options`;
    this.builder = new ClockControlsUIBuilder(this.elementId); // Instantiate the builder
    this.unsubscribers = []; // To store event bus unsubscribe functions

    console.log(`ClockControls constructor called for element ID: ${this.elementId}`);
  }

  /**
   * Initializes the clock controls: creates DOM, binds state, adds listeners.
   * @returns {Promise<boolean>} True if initialization was successful.
   */
  async init() {
    console.log(`Initializing ClockControls for ${this.elementId}...`);
    try {
      // 1. Create a container *within* the parent (ControlPanel)
      // ControlPanel handles the main section structure
      this.container = document.createElement('div');
      this.container.className = 'clock-controls-content';
      this.parentContainer.appendChild(this.container);

      // 2. Build the UI using the builder and store element references
      this.elements = this.builder.build(this.container);

      // 3. Bind to relevant state changes
      this.bindToState();

      // 4. Add event listeners for user interactions
      this.addEventListeners();

      console.log(`ClockControls for ${this.elementId} initialized successfully.`);
      return true;
    } catch (error) {
      console.error(`Error initializing ClockControls for ${this.elementId}:`, error);
      this.destroy(); // Clean up if init fails
      return false;
    }
  }

  // Removed createElements and helper methods (_create..., createControlGroup)
  // UI creation is now handled by ClockControlsUIBuilder

  /**
   * Binds the controls to state changes for this specific clock element.
   * Listens to both options changes and top-level element changes (like scale).
   */
  bindToState() {
    // Listen for option changes
    const optionsEventName = `state:${this.statePath}:changed`; // e.g., state:elements.clock-default.options:changed
    const optionsSubscription = EventBus.subscribe(optionsEventName, (optionsState) => {
      console.log(`[ClockControls ${this.elementId}] Event received: ${optionsEventName}`, optionsState);
      this._updateOptionsUI(optionsState); // FIX: Call the renamed helper method
    });
    this.unsubscribers.push(optionsSubscription.unsubscribe);

    // Listen for top-level element changes (for scale)
    const elementStatePath = `elements.${this.elementId}`; // e.g., elements.clock-default
    const elementEventName = `state:${elementStatePath}:changed`;
    const elementSubscription = EventBus.subscribe(elementEventName, (elementState) => {
        console.log(`[ClockControls ${this.elementId}] Event received: ${elementEventName}`, elementState);
        this._updateElementUI(elementState); // Use helper
    });
    this.unsubscribers.push(elementSubscription.unsubscribe);


    // Apply initial state for options
    const initialOptionsState = StateManager.getNestedValue(StateManager.getState(), this.statePath);
    if (initialOptionsState) {
      console.log(`[ClockControls ${this.elementId}] Applying initial options state:`, initialOptionsState);
      this._updateOptionsUI(initialOptionsState); // Use helper
    } else {
       console.log(`[ClockControls ${this.elementId}] No initial options state found at path: ${this.statePath}`);
       this._updateOptionsUI({}); // Apply option defaults
    }

    // Apply initial state for element properties
    const initialElementState = StateManager.getNestedValue(StateManager.getState(), elementStatePath);
    if (initialElementState) {
        console.log(`[ClockControls ${this.elementId}] Applying initial element state:`, initialElementState);
        this._updateElementUI(initialElementState); // Use helper
    } else {
        console.log(`[ClockControls ${this.elementId}] No initial element state found.`);
        this._updateElementUI({}); // Apply element defaults
    }
  }

  /**
   * Updates UI elements based on the provided clock options state.
   * @param {object} optionsState - The clock options state object.
   */
  _updateOptionsUI(optionsState = {}) {
     console.log(`[ClockControls ${this.elementId}] Updating UI from options state:`, optionsState);
     if (!this.elements) return;

     if (this.elements.faceSelect) this.elements.faceSelect.value = optionsState.face || 'led';
     if (this.elements.formatSelect) this.elements.formatSelect.value = optionsState.timeFormat || '12';
     if (this.elements.secondsCheckbox) this.elements.secondsCheckbox.checked = optionsState.showSeconds ?? true;
     if (this.elements.fontSelect) this.elements.fontSelect.value = optionsState.fontFamily || 'Segoe UI';
     if (this.elements.boldCheckbox) this.elements.boldCheckbox.checked = (optionsState.fontWeight === 'bold');
     if (this.elements.colorPicker) this.elements.colorPicker.value = optionsState.color || '#FFFFFF';
     if (this.elements.separatorCheckbox) this.elements.separatorCheckbox.checked = optionsState.showSeparator ?? false;
  }

  /**
   * Updates UI elements based on the provided top-level element state (scale, opacity, effect).
   * @param {object} elementState - The element state object.
   */
  _updateElementUI(elementState = {}) {
      console.log(`[ClockControls ${this.elementId}] Updating UI from element state:`, elementState);
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

  // Removed old updateUIScale, updateUIOpacity, updateUIEffectStyle methods
  // Removed old updateUIFromState (replaced by _updateOptionsUI)

  /**
   * Adds event listeners to the UI elements to dispatch state updates.
   */
  addEventListeners() {
    if (!this.elements) return;
    this._addOptionsListeners();
    this._addElementListeners();
  }

  /** Adds listeners for controls that modify the element's 'options' state */
  _addOptionsListeners() {
    this.elements.faceSelect?.addEventListener('change', (e) => this.dispatchStateUpdate({ face: e.target.value }));
    this.elements.formatSelect?.addEventListener('change', (e) => this.dispatchStateUpdate({ timeFormat: e.target.value }));
    this.elements.secondsCheckbox?.addEventListener('change', (e) => this.dispatchStateUpdate({ showSeconds: e.target.checked }));
    this.elements.fontSelect?.addEventListener('change', (e) => {
      this.dispatchStateUpdate({ fontFamily: e.target.value });
      this._updateFontCSSVariable(e.target.value);
    });
    this.elements.boldCheckbox?.addEventListener('change', (e) => this.dispatchStateUpdate({ fontWeight: e.target.checked ? 'bold' : 'normal' }));
    this.elements.colorPicker?.addEventListener('input', (e) => this.dispatchStateUpdate({ color: e.target.value }));
    this.elements.separatorCheckbox?.addEventListener('change', (e) => this.dispatchStateUpdate({ showSeparator: e.target.checked }));
  }

  /** Adds listeners for controls that modify the top-level element state (scale, opacity, effect) */
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

  /**
   * Dispatches an update to the StateManager for this clock element's options.
   * @param {object} optionChanges - An object containing the specific changes to the clock options.
   */
  dispatchStateUpdate(optionChanges) {
    console.log(`[ClockControls ${this.elementId}] Dispatching options state update:`, optionChanges);
    // Construct the nested update payload for StateManager under options
    const updatePayload = {
        elements: {
            [this.elementId]: {
                options: optionChanges
            }
        }
    };
    StateManager.update(updatePayload);
  }
  
  /**
   * Dispatches an update to the StateManager for the top-level element properties (like scale).
   * @param {object} elementChanges - An object containing the specific changes to the element state.
   */
  dispatchElementStateUpdate(elementChanges) {
      console.log(`[ClockControls ${this.elementId}] Dispatching element state update:`, elementChanges);
      const updatePayload = {
          elements: {
              [this.elementId]: elementChanges
          }
      };
      StateManager.update(updatePayload);
  }

  /**
   * Updates the CSS variable for the font family.
   * @param {string} fontFamily - The selected font family.
   */
  _updateFontCSSVariable(fontFamily) {
    const clockFace = document.querySelector(`#${this.elementId} .clock-face`);
    if (clockFace) {
      clockFace.style.setProperty('--font-family-futuristic', fontFamily);
      clockFace.style.setProperty('--font-family-technical', fontFamily);
    }
  }

  /**
   * Cleans up resources used by the clock controls.
   */
  destroy() {
    console.log(`Destroying ClockControls for ${this.elementId}...`);
    // Unsubscribe from EventBus
    this.unsubscribers.forEach(unsubscribe => unsubscribe());
    this.unsubscribers = [];

    // Remove elements from DOM (clear the container we created)
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    this.container = null; // Nullify the container we created
    this.elements = {}; // Clear references
    console.log(`ClockControls for ${this.elementId} destroyed.`);
  }
}
