import { StateManager } from '../../core/state-manager.js';
import { EventBus } from '../../core/event-bus.js';
import { BaseUIElement } from '../base/base-ui-element.js'; // Import for scale constants

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
      // 1. Create the container for clock controls
      this.container = document.createElement('div');
      this.container.className = 'control-section clock-controls';
      this.parentContainer.appendChild(this.container);

      // 2. Create the UI elements (inputs, labels, etc.)
      this.createElements();

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

  /**
   * Creates the DOM elements for the clock controls.
   */
  createElements() {
    if (!this.container) return;
    console.log(`Creating clock control elements for ${this.elementId}...`);

    // --- Section Title ---
    const title = document.createElement('h3');
    // Make title more specific if controlling multiple elements later
    title.textContent = `Clock Settings (${this.elementId})`;
    this.container.appendChild(title);

    // --- Clock Face Select ---
    const faceGroup = this.createControlGroup('Face:');
    this.elements.faceSelect = document.createElement('select');
    this.elements.faceSelect.id = `${this.elementId}-face-select`;
    // Include implemented faces (changed 'digital' to 'led')
    ['led', 'clean', 'analog'].forEach(face => {
        const option = document.createElement('option');
        option.value = face;
        option.textContent = face.charAt(0).toUpperCase() + face.slice(1);
        this.elements.faceSelect.appendChild(option);
    });
    faceGroup.appendChild(this.elements.faceSelect);
    this.container.appendChild(faceGroup);

    // --- Time Format Select ---
    const formatGroup = this.createControlGroup('Time Format:');
    this.elements.formatSelect = document.createElement('select');
    this.elements.formatSelect.id = `${this.elementId}-format-select`;
    ['12', '24'].forEach(format => {
        const option = document.createElement('option');
        option.value = format;
        option.textContent = `${format}-hour`;
        this.elements.formatSelect.appendChild(option);
    });
    formatGroup.appendChild(this.elements.formatSelect);
    this.container.appendChild(formatGroup);

    // --- Show Seconds Checkbox ---
    const secondsGroup = this.createControlGroup('Show Seconds:');
    this.elements.secondsCheckbox = document.createElement('input');
    this.elements.secondsCheckbox.type = 'checkbox';
    this.elements.secondsCheckbox.id = `${this.elementId}-seconds-checkbox`;
    secondsGroup.appendChild(this.elements.secondsCheckbox);
    // Adjust label positioning for checkbox
    secondsGroup.insertBefore(this.elements.secondsCheckbox, secondsGroup.firstChild);
    secondsGroup.querySelector('label').htmlFor = this.elements.secondsCheckbox.id; // Associate label
    this.container.appendChild(secondsGroup);

    // --- Font Family Select ---
    const fontGroup = this.createControlGroup('Font:');
    this.elements.fontSelect = document.createElement('select');
    this.elements.fontSelect.id = `${this.elementId}-font-select`;
    // Add some common web-safe fonts + the current default
    [
        'Segoe UI', 'Arial', 'Helvetica', 'Verdana', 'Tahoma', 'Geneva',
        'Times New Roman', 'Georgia', 'Garamond',
        'Courier New', 'Lucida Console', 'Monaco',
        'cursive', 'fantasy', 'monospace', 'sans-serif', 'serif' // Generic fallbacks
    ].forEach(font => {
        const option = document.createElement('option');
        option.value = font;
        option.textContent = font;
        this.elements.fontSelect.appendChild(option);
    });
    fontGroup.appendChild(this.elements.fontSelect);
    this.container.appendChild(fontGroup);

    // --- Color Picker ---
    const colorGroup = this.createControlGroup('Color:');
    this.elements.colorPicker = document.createElement('input');
    this.elements.colorPicker.type = 'color';
    this.elements.colorPicker.id = `${this.elementId}-color-picker`;
    colorGroup.appendChild(this.elements.colorPicker);
    this.container.appendChild(colorGroup);

    // --- Size Slider ---
    const sizeGroup = this.createControlGroup('Size:');
    this.elements.sizeSlider = document.createElement('input');
    this.elements.sizeSlider.type = 'range';
    this.elements.sizeSlider.id = `${this.elementId}-size-slider`;
    // Use centralized scale values from BaseUIElement
    this.elements.sizeSlider.min = BaseUIElement.MIN_SCALE;
    this.elements.sizeSlider.max = BaseUIElement.MAX_SCALE;
    this.elements.sizeSlider.step = BaseUIElement.SCALE_STEP.toString();
    this.elements.sizeValue = document.createElement('span');
    this.elements.sizeValue.className = 'range-value';
    sizeGroup.appendChild(this.elements.sizeSlider);
    sizeGroup.appendChild(this.elements.sizeValue);
    this.container.appendChild(sizeGroup);

    // --- Effect Style Select ---
    const effectGroup = this.createControlGroup('Effect:');
    this.elements.effectSelect = document.createElement('select');
    this.elements.effectSelect.id = `${this.elementId}-effect-select`;
    ['flat', 'raised', 'reflected'].forEach(style => {
        const option = document.createElement('option');
        option.value = style;
        option.textContent = style.charAt(0).toUpperCase() + style.slice(1);
        this.elements.effectSelect.appendChild(option);
    });
    effectGroup.appendChild(this.elements.effectSelect);
    this.container.appendChild(effectGroup);


    console.log(`Clock control elements for ${this.elementId} created.`);
  }

  /**
   * Helper to create a label and container for a control.
   * @param {string} labelText - The text for the label.
   * @returns {HTMLElement} The container div with the label.
   */
  createControlGroup(labelText) {
    const group = document.createElement('div');
    group.className = 'control-group';
    const label = document.createElement('label');
    label.textContent = labelText;
    group.appendChild(label);
    return group;
  }

  /**
   * Binds the controls to state changes for this specific clock element.
   * Listens to both options changes and top-level element changes (like scale).
   */
  bindToState() {
    // Listen for option changes
    const optionsEventName = `state:${this.statePath}:changed`; // e.g., state:elements.clock-default.options:changed
    const optionsSubscription = EventBus.subscribe(optionsEventName, (optionsState) => {
      console.log(`[ClockControls ${this.elementId}] Event received: ${optionsEventName}`, optionsState);
      this.updateUIFromState(optionsState); // Update options part of UI
    });
    this.unsubscribers.push(optionsSubscription.unsubscribe);

    // Listen for top-level element changes (for scale)
    const elementStatePath = `elements.${this.elementId}`; // e.g., elements.clock-default
    const elementEventName = `state:${elementStatePath}:changed`; 
    const elementSubscription = EventBus.subscribe(elementEventName, (elementState) => {
        console.log(`[ClockControls ${this.elementId}] Event received: ${elementEventName}`, elementState);
        // Update scale and effect style from the element state
        this.updateUIScale(elementState?.scale);
        this.updateUIEffectStyle(elementState?.effectStyle);
    });
    this.unsubscribers.push(elementSubscription.unsubscribe);


    // Apply initial state for options
    const initialOptionsState = StateManager.getNestedValue(StateManager.getState(), this.statePath);
    if (initialOptionsState) {
      console.log(`[ClockControls ${this.elementId}] Applying initial options state:`, initialOptionsState);
      this.updateUIFromState(initialOptionsState);
    } else {
       console.log(`[ClockControls ${this.elementId}] No initial options state found at path: ${this.statePath}`);
       this.updateUIFromState({}); // Apply option defaults
    }
    
    // Apply initial state for scale
    const initialElementState = StateManager.getNestedValue(StateManager.getState(), elementStatePath);
     if (initialElementState?.scale !== undefined) {
        console.log(`[ClockControls ${this.elementId}] Applying initial scale state:`, initialElementState.scale);
        this.updateUIScale(initialElementState.scale);
    } else {
        console.log(`[ClockControls ${this.elementId}] No initial scale state found at path: ${elementStatePath}`);
        this.updateUIScale(1.0); // Apply scale default
    }
    // Apply initial effect style
    if (initialElementState?.effectStyle) {
        console.log(`[ClockControls ${this.elementId}] Applying initial effect style:`, initialElementState.effectStyle);
        this.updateUIEffectStyle(initialElementState.effectStyle);
    } else {
        console.log(`[ClockControls ${this.elementId}] No initial effect style found.`);
        this.updateUIEffectStyle('flat'); // Default effect
    }
  }

  /**
   * Updates the UI elements based on the provided clock options state (excluding scale).
   * @param {object} optionsState - The clock options state object.
   */
  updateUIFromState(optionsState = {}) {
     console.log(`[ClockControls ${this.elementId}] Updating UI from options state:`, optionsState);
     if (!this.elements) return;

     // Update controls related to options
     if (this.elements.faceSelect) this.elements.faceSelect.value = optionsState.face || 'led'; // Default to 'led'
     if (this.elements.formatSelect) this.elements.formatSelect.value = optionsState.timeFormat || '12';
     if (this.elements.secondsCheckbox) this.elements.secondsCheckbox.checked = optionsState.showSeconds ?? true;
     if (this.elements.fontSelect) this.elements.fontSelect.value = optionsState.fontFamily || 'Segoe UI'; 
     if (this.elements.colorPicker) this.elements.colorPicker.value = optionsState.color || '#FFFFFF';
     
     // Scale is handled separately by updateUIScale
  }
  
  /**
   * Updates only the scale slider UI element.
   * @param {number} scale - The current scale value.
   */
   updateUIScale(scale) {
       const currentScale = scale ?? 1.0; // Default scale if undefined
       console.log(`[ClockControls ${this.elementId}] Updating scale UI to:`, currentScale);
       if (this.elements.sizeSlider) {
           this.elements.sizeSlider.value = currentScale;
           if (this.elements.sizeValue) {
               this.elements.sizeValue.textContent = parseFloat(currentScale).toFixed(2);
           }
       }
   }

   /**
    * Updates only the effect style select UI element.
    * @param {string} style - The current effect style.
    */
   updateUIEffectStyle(style) {
       const currentStyle = style || 'flat'; // Default if undefined
       console.log(`[ClockControls ${this.elementId}] Updating effect style UI to:`, currentStyle);
       if (this.elements.effectSelect) {
           this.elements.effectSelect.value = currentStyle;
       }
   }

  /**
   * Adds event listeners to the UI elements to dispatch state updates.
   */
  addEventListeners() {
    if (!this.elements) return;

    this.elements.faceSelect?.addEventListener('change', (e) => this.dispatchStateUpdate({ face: e.target.value }));
    this.elements.formatSelect?.addEventListener('change', (e) => this.dispatchStateUpdate({ timeFormat: e.target.value }));
    this.elements.secondsCheckbox?.addEventListener('change', (e) => this.dispatchStateUpdate({ showSeconds: e.target.checked }));
    this.elements.fontSelect?.addEventListener('change', (e) => this.dispatchStateUpdate({ fontFamily: e.target.value })); // Changed from fontInput
    this.elements.colorPicker?.addEventListener('input', (e) => this.dispatchStateUpdate({ color: e.target.value }));
    
    // Size Slider Change
    this.elements.sizeSlider?.addEventListener('input', (e) => {
        const newScale = parseFloat(e.target.value);
        if (this.elements.sizeValue) {
            this.elements.sizeValue.textContent = newScale.toFixed(2);
        }
        // Debounce this later if needed
        // Dispatch scale update to the element level, not options
        this.dispatchElementStateUpdate({ scale: newScale });
    });

    // Effect Style Select Change
    this.elements.effectSelect?.addEventListener('change', (e) => {
        this.dispatchElementStateUpdate({ effectStyle: e.target.value });
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
   * Cleans up resources used by the clock controls.
   */
  destroy() {
    console.log(`Destroying ClockControls for ${this.elementId}...`);
    // Unsubscribe from EventBus
    this.unsubscribers.forEach(unsubscribe => unsubscribe());
    this.unsubscribers = [];

    // Remove elements from DOM
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    this.container = null;
    this.elements = {}; // Clear references
    console.log(`ClockControls for ${this.elementId} destroyed.`);
  }
}
