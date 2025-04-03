import { StateManager } from '../../core/state-manager.js';
import { EventBus } from '../../core/event-bus.js';
import { BaseUIElement } from '../base/base-ui-element.js'; // Import for scale constants

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

      // 2. Create the UI elements within this new container
      this.createElements();
      this.bindToState();
      this.addEventListeners();

      console.log(`DateControls for ${this.elementId} initialized successfully.`);
      return true;
    } catch (error) {
      console.error(`Error initializing DateControls for ${this.elementId}:`, error);
      this.destroy();
      return false;
    }
  }

  /**
   * Creates the DOM elements for the date controls in V1 order.
   */
  createElements() {
    if (!this.container) return;
    console.log(`Creating date control elements for ${this.elementId} in V1 order...`);

    // --- Controls in V1 Order ---

    // 1. Visibility Checkbox
    const visibilityGroup = this.createControlGroup('Display Date:'); // V1 Label
    this.elements.visibleCheckbox = document.createElement('input');
    this.elements.visibleCheckbox.type = 'checkbox';
    this.elements.visibleCheckbox.id = `${this.elementId}-visible-checkbox`;
    visibilityGroup.appendChild(this.elements.visibleCheckbox); // Append after label
    visibilityGroup.querySelector('label').htmlFor = this.elements.visibleCheckbox.id;
    this.container.appendChild(visibilityGroup);

    // 2. Date Format Select
    const formatGroup = this.createControlGroup('Date Format:'); // V1 Label
    this.elements.formatSelect = document.createElement('select');
    this.elements.formatSelect.id = `${this.elementId}-format-select`;
    [
        'MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD',
        'Day', 'Day, Month DD', 'Month DD, YYYY'
    ].forEach(format => {
        const option = document.createElement('option');
        option.value = format;
        option.textContent = format;
        this.elements.formatSelect.appendChild(option);
    });
    formatGroup.appendChild(this.elements.formatSelect);
    this.container.appendChild(formatGroup);

    // 3. Color Picker
    const colorGroup = this.createControlGroup('Date Color:'); // V1 Label
    this.elements.colorPicker = document.createElement('input');
    this.elements.colorPicker.type = 'color';
    this.elements.colorPicker.id = `${this.elementId}-color-picker`;
    colorGroup.appendChild(this.elements.colorPicker);
    this.container.appendChild(colorGroup);

    // 4. Size Slider
    const sizeGroup = this.createControlGroup('Date Size:'); // V1 Label
    this.elements.sizeSlider = document.createElement('input');
    this.elements.sizeSlider.type = 'range';
    this.elements.sizeSlider.id = `${this.elementId}-size-slider`;
    this.elements.sizeSlider.min = BaseUIElement.MIN_SCALE;
    this.elements.sizeSlider.max = BaseUIElement.MAX_SCALE;
    this.elements.sizeSlider.step = BaseUIElement.SCALE_STEP.toString();
    this.elements.sizeValue = document.createElement('span');
    this.elements.sizeValue.className = 'range-value';
    sizeGroup.appendChild(this.elements.sizeSlider);
    sizeGroup.appendChild(this.elements.sizeValue);
    this.container.appendChild(sizeGroup);

    // 5. Opacity Slider
    const opacityGroup = this.createControlGroup('Date Opacity:'); // V1 Label
    this.elements.opacitySlider = document.createElement('input');
    this.elements.opacitySlider.type = 'range';
    this.elements.opacitySlider.id = `${this.elementId}-opacity-slider`;
    this.elements.opacitySlider.min = '0';
    this.elements.opacitySlider.max = '1';
    this.elements.opacitySlider.step = '0.05';
    this.elements.opacityValue = document.createElement('span');
    this.elements.opacityValue.className = 'range-value';
    opacityGroup.appendChild(this.elements.opacitySlider);
    opacityGroup.appendChild(this.elements.opacityValue);
    this.container.appendChild(opacityGroup);

    // 6. Separator Checkbox (New)
    const separatorGroup = this.createControlGroup('Show Separator:');
    this.elements.separatorCheckbox = document.createElement('input');
    this.elements.separatorCheckbox.type = 'checkbox';
    this.elements.separatorCheckbox.id = `${this.elementId}-separator-checkbox`;
    separatorGroup.appendChild(this.elements.separatorCheckbox);
    separatorGroup.querySelector('label').htmlFor = this.elements.separatorCheckbox.id;
    this.container.appendChild(separatorGroup);

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

    console.log(`Date control elements for ${this.elementId} created.`);
  }

  /** Helper to create a label and container for a control. */
  createControlGroup(labelText) {
    const group = document.createElement('div');
    group.className = 'control-group';
    const label = document.createElement('label');
    label.textContent = labelText;
    group.appendChild(label);
    return group;
  }

  /** Binds the controls to state changes. */
  bindToState() {
    // Listen for option changes
    const optionsEventName = `state:${this.statePath}:changed`; // e.g., state:elements.date-default.options:changed
    const optionsSubscription = EventBus.subscribe(optionsEventName, (optionsState) => {
      console.log(`[DateControls ${this.elementId}] Event received: ${optionsEventName}`, optionsState);
      this.updateUIFromState(optionsState); // Update options part of UI
    });
    this.unsubscribers.push(optionsSubscription.unsubscribe);

    // Listen for top-level element changes (for scale)
    const elementStatePath = `elements.${this.elementId}`; // e.g., elements.date-default
    const elementEventName = `state:${elementStatePath}:changed`;
    const elementSubscription = EventBus.subscribe(elementEventName, (elementState) => {
        console.log(`[DateControls ${this.elementId}] Event received: ${elementEventName}`, elementState);
        // Update scale, opacity, and effect style from the element state
        this.updateUIScale(elementState?.scale);
        this.updateUIOpacity(elementState?.opacity);
        this.updateUIEffectStyle(elementState?.effectStyle); // Add effect style update
    });
    this.unsubscribers.push(elementSubscription.unsubscribe);

    // Apply initial state for options
    const initialOptionsState = StateManager.getNestedValue(StateManager.getState(), this.statePath);
    if (initialOptionsState) {
      console.log(`[DateControls ${this.elementId}] Applying initial options state:`, initialOptionsState);
      this.updateUIFromState(initialOptionsState);
    } else {
       console.log(`[DateControls ${this.elementId}] No initial options state found at path: ${this.statePath}`);
       this.updateUIFromState({}); // Apply option defaults
    }

    // Apply initial state for scale
    const initialElementState = StateManager.getNestedValue(StateManager.getState(), elementStatePath);
     if (initialElementState?.scale !== undefined) {
        console.log(`[DateControls ${this.elementId}] Applying initial scale state:`, initialElementState.scale);
        this.updateUIScale(initialElementState.scale);
    } else {
        console.log(`[DateControls ${this.elementId}] No initial scale state found at path: ${elementStatePath}`);
        this.updateUIScale(1.0); // Apply scale default
    }
    // Apply initial opacity state
    if (initialElementState?.opacity !== undefined) {
        console.log(`[DateControls ${this.elementId}] Applying initial opacity state:`, initialElementState.opacity);
        this.updateUIOpacity(initialElementState.opacity);
    } else {
        console.log(`[DateControls ${this.elementId}] No initial opacity state found.`);
        this.updateUIOpacity(1.0); // Apply opacity default
    }
    // Apply initial effect style
    if (initialElementState?.effectStyle) {
        console.log(`[DateControls ${this.elementId}] Applying initial effect style:`, initialElementState.effectStyle);
        this.updateUIEffectStyle(initialElementState.effectStyle);
    } else {
        console.log(`[DateControls ${this.elementId}] No initial effect style found.`);
        this.updateUIEffectStyle('flat'); // Default effect
    }
  }

  /** Updates the UI elements based on the provided options state. */
  updateUIFromState(optionsState = {}) {
     console.log(`[DateControls ${this.elementId}] Updating UI from options state:`, optionsState);
     if (!this.elements) return;

     if (this.elements.visibleCheckbox) this.elements.visibleCheckbox.checked = optionsState.visible ?? true;
     if (this.elements.formatSelect) this.elements.formatSelect.value = optionsState.format || 'Day, Month DD';
     if (this.elements.colorPicker) this.elements.colorPicker.value = optionsState.color || '#FFFFFF';
     if (this.elements.separatorCheckbox) this.elements.separatorCheckbox.checked = optionsState.showSeparator ?? false; // Update separator checkbox

     // Scale and Opacity are handled separately
  }

  /**
   * Updates only the scale slider UI element.
   * @param {number} scale - The current scale value.
   */
   updateUIScale(scale) {
       const currentScale = scale ?? 1.0; // Default scale if undefined
       console.log(`[DateControls ${this.elementId}] Updating scale UI to:`, currentScale);
       if (this.elements.sizeSlider) {
           this.elements.sizeSlider.value = currentScale;
           if (this.elements.sizeValue) {
               this.elements.sizeValue.textContent = parseFloat(currentScale).toFixed(2);
           }
       }
   }

   /**
    * Updates only the opacity slider UI element.
    * @param {number} opacity - The current opacity value.
    */
   updateUIOpacity(opacity) {
       const currentOpacity = opacity ?? 1.0; // Default opacity if undefined
       console.log(`[DateControls ${this.elementId}] Updating opacity UI to:`, currentOpacity);
       if (this.elements.opacitySlider) {
           this.elements.opacitySlider.value = currentOpacity;
           if (this.elements.opacityValue) {
               this.elements.opacityValue.textContent = parseFloat(currentOpacity).toFixed(2);
           }
       }
    }

   /**
    * Updates only the effect style select UI element.
    * @param {string} style - The current effect style.
    */
   updateUIEffectStyle(style) {
       const currentStyle = style || 'flat'; // Default if undefined
       console.log(`[DateControls ${this.elementId}] Updating effect style UI to:`, currentStyle);
       if (this.elements.effectSelect) {
           this.elements.effectSelect.value = currentStyle;
       }
   }

  /** Adds event listeners to the UI elements. */
  addEventListeners() {
    if (!this.elements) return;

    this.elements.visibleCheckbox?.addEventListener('change', (e) => this.dispatchStateUpdate({ visible: e.target.checked }));
    this.elements.formatSelect?.addEventListener('change', (e) => this.dispatchStateUpdate({ format: e.target.value }));
    // Font select listener removed
    // Bold checkbox listener removed
    this.elements.colorPicker?.addEventListener('input', (e) => this.dispatchStateUpdate({ color: e.target.value }));

    // Size Slider Change
    this.elements.sizeSlider?.addEventListener('input', (e) => {
        const newScale = parseFloat(e.target.value);
        if (this.elements.sizeValue) {
            this.elements.sizeValue.textContent = newScale.toFixed(2);
        }
        // Dispatch scale update to the element level, not options
        this.dispatchElementStateUpdate({ scale: newScale });
    });

    // Opacity Slider Change
    this.elements.opacitySlider?.addEventListener('input', (e) => {
        const newOpacity = parseFloat(e.target.value);
        if (this.elements.opacityValue) {
            this.elements.opacityValue.textContent = newOpacity.toFixed(2);
        }
        // Dispatch opacity update to the element level
        this.dispatchElementStateUpdate({ opacity: newOpacity });
    });

    // Effect Style Select Change
    this.elements.effectSelect?.addEventListener('change', (e) => {
        this.dispatchElementStateUpdate({ effectStyle: e.target.value });
    });

    // Separator Checkbox Change (New)
    this.elements.separatorCheckbox?.addEventListener('change', (e) => this.dispatchStateUpdate({ showSeparator: e.target.checked }));
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
