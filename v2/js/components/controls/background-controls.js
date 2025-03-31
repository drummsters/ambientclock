import { StateManager } from '../../core/state-manager.js';
import { EventBus } from '../../core/event-bus.js';
import { ConfigManager } from '../../core/config-manager.js'; // Import ConfigManager

/**
 * Manages the UI controls for background settings within the control panel.
 */
export class BackgroundControls {
  /**
   * Creates a BackgroundControls instance.
   * @param {HTMLElement} parentContainer - The DOM element to append the controls to.
   * @param {ConfigManager} configManager - The application's ConfigManager instance.
   */
  constructor(parentContainer, configManager) { // Add configManager parameter
    if (!parentContainer) {
      throw new Error('BackgroundControls requires a parent container element.');
    }
     if (!configManager) { // Add check for configManager
      throw new Error('BackgroundControls requires a ConfigManager instance.');
    }
    this.parentContainer = parentContainer;
    this.configManager = configManager; // Store reference
    this.container = null; // The main container for these controls
    this.elements = {}; // To store references to input elements
    this.statePath = 'settings.background'; // Path to background settings in state
    this.unsubscribers = []; // To store event bus unsubscribe functions

    console.log('BackgroundControls constructor called.');
  }

  /**
   * Initializes the background controls: creates DOM, binds state, adds listeners.
   * @returns {Promise<boolean>} True if initialization was successful.
   */
  async init() {
    console.log('Initializing BackgroundControls...');
    try {
      // 1. Create the container for background controls
      this.container = document.createElement('div');
      this.container.className = 'control-section background-controls';
      this.parentContainer.appendChild(this.container);

      // 2. Create the UI elements (inputs, labels, etc.)
      this.createElements();

      // 3. Bind to relevant state changes
      this.bindToState();

      // 4. Add event listeners for user interactions
      this.addEventListeners();

      console.log('BackgroundControls initialized successfully.');
      return true;
    } catch (error) {
      console.error('Error initializing BackgroundControls:', error);
      this.destroy(); // Clean up if init fails
      return false;
    }
  }

  /**
   * Creates the DOM elements for the background controls.
   */
  createElements() {
    if (!this.container) return;
    console.log('Creating background control elements...');

    // --- Section Title ---
    const title = document.createElement('h3');
    title.textContent = 'Background';
    this.container.appendChild(title);

    // --- Type Selector (Radio Buttons) ---
    const typeGroup = this.createControlGroup('Type:');
    this.elements.typeColorRadio = this.createRadioButton('background-type', 'color', 'Color');
    this.elements.typeImageRadio = this.createRadioButton('background-type', 'image', 'Image');
    typeGroup.appendChild(this.elements.typeColorRadio);
    typeGroup.appendChild(this.elements.typeImageRadio);
    // Add labels for radios
    const colorLabel = document.createElement('label');
    colorLabel.htmlFor = this.elements.typeColorRadio.id;
    colorLabel.textContent = 'Color';
    colorLabel.style.marginLeft = '5px';
    colorLabel.style.marginRight = '15px';
    const imageLabel = document.createElement('label');
    imageLabel.htmlFor = this.elements.typeImageRadio.id;
    imageLabel.textContent = 'Image';
    imageLabel.style.marginLeft = '5px';
    typeGroup.appendChild(colorLabel);
    typeGroup.appendChild(imageLabel);
    this.container.appendChild(typeGroup);


    // --- Color Settings (Visible when type is 'color') ---
    this.elements.colorSettingsContainer = document.createElement('div');
    this.elements.colorSettingsContainer.className = 'background-settings-color';
    const colorGroup = this.createControlGroup('Color:');
    this.elements.colorPicker = document.createElement('input');
    this.elements.colorPicker.type = 'color';
    this.elements.colorPicker.id = 'background-color-picker'; // Keep ID simple
    colorGroup.appendChild(this.elements.colorPicker);
    this.elements.colorSettingsContainer.appendChild(colorGroup);
    this.container.appendChild(this.elements.colorSettingsContainer);


    // --- Image Settings (Visible when type is 'image') ---
    this.elements.imageSettingsContainer = document.createElement('div');
    this.elements.imageSettingsContainer.className = 'background-settings-image';
    this.elements.imageSettingsContainer.style.display = 'none'; // Hidden by default

    // --- Image Source Select ---
    const sourceGroup = this.createControlGroup('Source:');
    this.elements.sourceSelect = document.createElement('select');
    this.elements.sourceSelect.id = 'background-source-select';
    
    // Dynamically populate based on configured API keys
    this.elements.sourceSelect.innerHTML = ''; // Clear existing options
    const availableSources = [];
    
    // Check if services are configured using the correct method
    if (this.configManager.isServiceConfigured('unsplash')) { 
        const option = document.createElement('option');
        option.value = 'unsplash';
        option.textContent = 'Unsplash';
        this.elements.sourceSelect.appendChild(option);
        availableSources.push('unsplash');
    }
    // Check if services are configured using the correct method
    if (this.configManager.isServiceConfigured('pexels')) { 
        const option = document.createElement('option');
        option.value = 'pexels';
        option.textContent = 'Pexels';
        this.elements.sourceSelect.appendChild(option);
        availableSources.push('pexels');
    }
    
    // If no image sources are available, maybe hide the image option?
    // For now, just disable the select if empty.
    if (availableSources.length === 0) {
        this.elements.sourceSelect.disabled = true;
        const option = document.createElement('option');
        option.textContent = 'No API Keys Configured';
        this.elements.sourceSelect.appendChild(option);
        // Also potentially disable the 'Image' radio button
        if (this.elements.typeImageRadio) {
            this.elements.typeImageRadio.disabled = true;
        }
    } else {
         this.elements.sourceSelect.disabled = false;
         if (this.elements.typeImageRadio) {
            this.elements.typeImageRadio.disabled = false;
        }
    }

    sourceGroup.appendChild(this.elements.sourceSelect);
    this.elements.imageSettingsContainer.appendChild(sourceGroup);

    // --- Image Category Select ---
    const categorySelectGroup = this.createControlGroup('Category:');
    this.elements.categorySelect = document.createElement('select');
    this.elements.categorySelect.id = 'background-category-select';
    // Predefined categories + Other
    ['Nature', 'Technology', 'Architecture', 'People', 'Animals', 'Travel', 'Food', 'Abstract', 'Other']
    .forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat;
        this.elements.categorySelect.appendChild(option);
    });
    categorySelectGroup.appendChild(this.elements.categorySelect);
    this.elements.imageSettingsContainer.appendChild(categorySelectGroup);

    // --- Custom Category Input (Initially hidden) ---
    this.elements.customCategoryGroup = this.createControlGroup('Custom:');
    this.elements.customCategoryInput = document.createElement('input');
    this.elements.customCategoryInput.type = 'text';
    this.elements.customCategoryInput.id = 'background-custom-category-input';
    this.elements.customCategoryInput.placeholder = 'Enter custom category';
    this.elements.customCategoryGroup.appendChild(this.elements.customCategoryInput);
    this.elements.customCategoryGroup.style.display = 'none'; // Hide initially
    this.elements.imageSettingsContainer.appendChild(this.elements.customCategoryGroup);

    // --- Manual Refresh Button ---
    const refreshGroup = this.createControlGroup(''); // No label needed? Or "Actions:"?
    this.elements.refreshButton = document.createElement('button');
    this.elements.refreshButton.textContent = 'New Image';
    this.elements.refreshButton.id = 'background-refresh-button';
    refreshGroup.appendChild(this.elements.refreshButton);
    this.elements.imageSettingsContainer.appendChild(refreshGroup);

    // --- Zoom Effect Checkbox ---
    const zoomGroup = this.createControlGroup('Zoom Effect:');
    this.elements.zoomCheckbox = document.createElement('input');
    this.elements.zoomCheckbox.type = 'checkbox';
    this.elements.zoomCheckbox.id = 'background-zoom-checkbox';
    zoomGroup.insertBefore(this.elements.zoomCheckbox, zoomGroup.firstChild);
    zoomGroup.querySelector('label').htmlFor = this.elements.zoomCheckbox.id;
    this.elements.imageSettingsContainer.appendChild(zoomGroup);


    // TODO: Add controls for image refresh interval later

    this.container.appendChild(this.elements.imageSettingsContainer);


    // --- Overlay Opacity Slider (Common to both types) ---
    const opacityGroup = this.createControlGroup('Overlay Opacity:');
    this.elements.opacitySlider = document.createElement('input');
    this.elements.opacitySlider.type = 'range';
    this.elements.opacitySlider.id = 'background-opacity-slider'; // Keep ID simple
    this.elements.opacitySlider.min = '0';
    this.elements.opacitySlider.max = '1';
    this.elements.opacitySlider.step = '0.05';
    this.elements.opacityValue = document.createElement('span'); // To display the value
    this.elements.opacityValue.className = 'range-value';
    opacityGroup.appendChild(this.elements.opacitySlider);
    opacityGroup.appendChild(this.elements.opacityValue);
    this.container.appendChild(opacityGroup); // Opacity applies to both

    console.log('Background control elements created.');
  }

  /** Helper to create radio buttons */
  createRadioButton(name, value, idSuffix) {
      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = name;
      radio.value = value;
      radio.id = `${name}-${idSuffix}`; // e.g., background-type-color
      return radio;
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
    label.style.marginRight = '10px'; // Basic spacing
    group.appendChild(label);
    return group;
  }

  /**
   * Binds the controls to state changes from the EventBus.
   */
  bindToState() {
    const eventName = `state:${this.statePath}:changed`;
    const subscription = EventBus.subscribe(eventName, (backgroundState) => {
      console.log(`[BackgroundControls] Event received: ${eventName}`, backgroundState);
      this.updateUIFromState(backgroundState);
    });
    this.unsubscribers.push(subscription.unsubscribe);

    // Apply initial state
    const initialState = StateManager.getNestedValue(StateManager.getState(), this.statePath);
    if (initialState) {
      console.log('[BackgroundControls] Applying initial state:', initialState);
      this.updateUIFromState(initialState);
    } else {
       console.log(`[BackgroundControls] No initial state found at path: ${this.statePath}`);
       // Set default values in UI if needed
       this.updateUIFromState({}); // Pass empty object to apply defaults
    }
  }

  /**
   * Updates the UI elements based on the provided state.
   * @param {object} state - The background state object.
   */
  updateUIFromState(state = {}) {
     console.log('[BackgroundControls] Updating UI from state:', state);
    // Update Color Picker
    // Update Type Radio Buttons
    const currentType = state.type || 'color'; // Default to color
    if (this.elements.typeColorRadio) this.elements.typeColorRadio.checked = (currentType === 'color');
    if (this.elements.typeImageRadio) this.elements.typeImageRadio.checked = (currentType === 'image');

    // Show/Hide specific settings containers
    if (this.elements.colorSettingsContainer) {
        this.elements.colorSettingsContainer.style.display = (currentType === 'color') ? 'block' : 'none';
    }
    if (this.elements.imageSettingsContainer) {
        this.elements.imageSettingsContainer.style.display = (currentType === 'image') ? 'block' : 'none';
    }

    // Update Color Picker (only needs update if visible, but harmless to update always)
    if (this.elements.colorPicker) {
      this.elements.colorPicker.value = state.color || '#000000'; // Default black
    }

    // Update Image Source Select, ensuring the selected value is available
    if (this.elements.sourceSelect && !this.elements.sourceSelect.disabled) {
        const currentSource = state.source || 'unsplash'; // Default source attempt
        const sourceExists = Array.from(this.elements.sourceSelect.options).some(opt => opt.value === currentSource);
        
        if (sourceExists) {
            this.elements.sourceSelect.value = currentSource;
        } else if (this.elements.sourceSelect.options.length > 0) {
            // If saved source isn't available, select the first available one
            this.elements.sourceSelect.value = this.elements.sourceSelect.options[0].value;
            // Optionally dispatch an update to correct the state?
            // this.dispatchStateUpdate({ source: this.elements.sourceSelect.value });
        }
    }

    // Update Image Category Select
    const currentCategory = state.category || 'Nature';
    if (this.elements.categorySelect) {
        this.elements.categorySelect.value = currentCategory;
    }

    // Update Custom Category Input
    if (this.elements.customCategoryInput) {
        this.elements.customCategoryInput.value = state.customCategory || '';
    }

    // Show/Hide Custom Category Input Group
    if (this.elements.customCategoryGroup) {
        this.elements.customCategoryGroup.style.display = (currentCategory === 'Other') ? 'flex' : 'none';
    }

    // Update Opacity Slider (Common)
    if (this.elements.opacitySlider) {
      const opacity = state.overlayOpacity ?? 0.5; // Default 0.5
      this.elements.opacitySlider.value = opacity;
      if (this.elements.opacityValue) {
      this.elements.opacityValue.textContent = parseFloat(opacity).toFixed(2);
      }
    }

    // Update Zoom Checkbox
    if (this.elements.zoomCheckbox) {
        this.elements.zoomCheckbox.checked = state.zoomEnabled ?? true; // Default to true if missing
    }
  }

  /**
   * Adds event listeners to the UI elements to dispatch state updates.
   */
  addEventListeners() {
    if (!this.elements) return;

    // Type Radio Change
    const typeRadios = [this.elements.typeColorRadio, this.elements.typeImageRadio];
    typeRadios.forEach(radio => {
        if (radio) {
            radio.addEventListener('change', (event) => {
                if (event.target.checked) {
                    this.dispatchStateUpdate({ type: event.target.value });
                    // Immediately update visibility of sections based on new type
                    this.updateUIFromState({ type: event.target.value });
                }
            });
        }
    });

    // Color Picker Change
    if (this.elements.colorPicker) {
      this.elements.colorPicker.addEventListener('input', (event) => {
        this.dispatchStateUpdate({ color: event.target.value });
      });
    }

    // Image Source Change
    if (this.elements.sourceSelect) {
        this.elements.sourceSelect.addEventListener('change', (event) => {
            this.dispatchStateUpdate({ source: event.target.value });
        });
    }

    // Image Category Select Change
    if (this.elements.categorySelect) {
        this.elements.categorySelect.addEventListener('change', (event) => {
            const newCategory = event.target.value;
            this.dispatchStateUpdate({ category: newCategory });
            // If 'Other' is not selected, clear custom category and trigger load
            if (newCategory !== 'Other') {
                this.dispatchStateUpdate({ customCategory: '' });
                 // Trigger image load immediately? Or let BackgroundService handle it?
                 // For now, let BackgroundService handle it via state change.
             }
             // No need to call updateUIFromState here, the state change listener will handle it.
             // this.updateUIFromState({ category: newCategory }); // REMOVED
         });
     }

    // Custom Image Category Input Change
    if (this.elements.customCategoryInput) {
        // Use 'change' or 'blur' to trigger update after user finishes typing
        this.elements.customCategoryInput.addEventListener('change', (event) => {
            // Only update if 'Other' is the selected category type
            if (this.elements.categorySelect?.value === 'Other') {
                this.dispatchStateUpdate({ customCategory: event.target.value });
                // Trigger image load immediately? Or let BackgroundService handle it?
            }
        });
    }

    // Manual Refresh Button Click
    if (this.elements.refreshButton) {
        this.elements.refreshButton.addEventListener('click', () => {
            // We don't dispatch a state update, instead we directly call the service method
            // Need access to the BackgroundService instance. How to get it?
            // Option 1: Pass BackgroundService instance to constructor (complex dependency)
            // Option 2: Use EventBus to publish a command event
            console.log('[BackgroundControls] Refresh button clicked. Publishing background:refresh event.');
            EventBus.publish('background:refresh');
        });
    }

    // Zoom Checkbox Change
    if (this.elements.zoomCheckbox) {
        this.elements.zoomCheckbox.addEventListener('change', (event) => {
            this.dispatchStateUpdate({ zoomEnabled: event.target.checked });
        });
    }


    // Opacity Slider Change (Common)
    if (this.elements.opacitySlider) {
      this.elements.opacitySlider.addEventListener('input', (event) => {
        const newOpacity = parseFloat(event.target.value);
        if (this.elements.opacityValue) {
          this.elements.opacityValue.textContent = newOpacity.toFixed(2);
        }
        // Debounce this later if needed
        this.dispatchStateUpdate({ overlayOpacity: newOpacity });
      });
    }

    // TODO: Add listeners for other controls when added
  }

  /**
   * Dispatches an update to the StateManager for the background settings.
   * @param {object} changes - An object containing the specific changes to the background state.
   */
  dispatchStateUpdate(changes) {
    console.log('[BackgroundControls] Dispatching state update:', changes);
    StateManager.update({
      settings: {
        background: changes
      }
    });
  }

  /**
   * Cleans up resources used by the background controls.
   */
  destroy() {
    console.log('Destroying BackgroundControls...');
    // Unsubscribe from EventBus
    this.unsubscribers.forEach(unsubscribe => unsubscribe());
    this.unsubscribers = [];

    // Remove elements from DOM
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    this.container = null;
    this.elements = {}; // Clear references
    console.log('BackgroundControls destroyed.');
  }
}
