import { StateManager } from '../../core/state-manager.js';
import { EventBus } from '../../core/event-bus.js';
import { BackgroundService } from '../../services/background-service.js'; // Import BackgroundService
// ConfigManager might still be needed for other things, keep import for now
import { ConfigManager } from '../../core/config-manager.js';

/**
 * Manages the UI controls for background settings within the control panel.
 */
export class BackgroundControls {
  /**
   * Creates a BackgroundControls instance.
   * @param {HTMLElement} parentContainer - The DOM element to append the controls to.
   * @param {ConfigManager} configManager - The application's ConfigManager instance.
   * @param {BackgroundService} backgroundService - The application's BackgroundService instance.
   */
  constructor(parentContainer, configManager, backgroundService) { // Added backgroundService
    if (!parentContainer) {
      throw new Error('BackgroundControls requires a parent container element.');
    }
    if (!configManager) {
      throw new Error('BackgroundControls requires a ConfigManager instance.');
    }
    if (!backgroundService) { // Added check for backgroundService
      throw new Error('BackgroundControls requires a BackgroundService instance.');
    }
    this.parentContainer = parentContainer;
    this.configManager = configManager; // Keep for potential future use
    this.backgroundService = backgroundService; // Store reference
    this.container = null; // The main container for these controls
    this.elements = {}; // To store references to input elements
    this.statePath = 'settings.background'; // Path to background settings in state
    this.unsubscribers = []; // To store event bus unsubscribe functions
    this.peapixCountries = { // Define country codes and names
        au: 'Australia', br: 'Brazil', ca: 'Canada', cn: 'China', de: 'Germany',
        fr: 'France', in: 'India', it: 'Italy', jp: 'Japan', es: 'Spain',
        gb: 'United Kingdom', us: 'United States'
    };

    console.log('BackgroundControls constructor called.');
  }

  /**
   * Initializes the background controls: creates DOM, binds state, adds listeners.
   * @returns {Promise<boolean>} True if initialization was successful.
   */
  async init() {
    console.log('Initializing BackgroundControls...');
    try {
      // 1. Use the parent container directly (ControlPanel creates the section)
      this.container = this.parentContainer;
      // Ensure the container has a class for potential specific styling if needed
      this.container.classList.add('background-controls-content'); // Add a content class

      // 2. Create the UI elements (inputs, labels, etc.) directly in the parent
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
   * Creates the DOM elements for the background controls in V1 order.
   */
  createElements() {
    if (!this.container) return;
    console.log('Creating background control elements in V1 order...');

    // --- Controls in V1 Order ---

    // --- Image Source Select ---
    const sourceGroup = this.createControlGroup('Image Source:'); // V1 Label
    this.elements.sourceSelect = document.createElement('select');
    this.elements.sourceSelect.id = 'background-source-select'; // Keep ID simple for potential direct targeting

    // Dynamically populate based on registered providers in BackgroundService
    this.elements.sourceSelect.innerHTML = ''; // Clear existing options
    const availableProviders = this.backgroundService.imageProviders; // Get the map

    if (availableProviders.size > 0) {
        availableProviders.forEach((providerInstance, providerName) => {
            const option = document.createElement('option');
            option.value = providerName;
            // Capitalize the first letter for display
            option.textContent = providerName.charAt(0).toUpperCase() + providerName.slice(1);
            this.elements.sourceSelect.appendChild(option);
        });
        this.elements.sourceSelect.disabled = false;
    } else {
        // If no image providers are registered, disable the select
        this.elements.sourceSelect.disabled = true;
        const option = document.createElement('option');
        option.textContent = 'No Image Providers Available';
        this.elements.sourceSelect.appendChild(option);
    }
    sourceGroup.appendChild(this.elements.sourceSelect);
    this.container.appendChild(sourceGroup);

    // --- Peapix Country Select (Dynamically shown/hidden) ---
    this.elements.peapixCountryGroup = this.createControlGroup('Country:');
    this.elements.peapixCountrySelect = document.createElement('select');
    this.elements.peapixCountrySelect.id = 'background-peapix-country-select';
    Object.entries(this.peapixCountries).forEach(([code, name]) => {
        const option = document.createElement('option');
        option.value = code;
        option.textContent = name;
        this.elements.peapixCountrySelect.appendChild(option);
    });
    this.elements.peapixCountryGroup.appendChild(this.elements.peapixCountrySelect);
    this.elements.peapixCountryGroup.style.display = 'none'; // Hide initially
    this.container.appendChild(this.elements.peapixCountryGroup);

    // --- Image Category Select (Dynamically shown/hidden) ---
    this.elements.categorySelectGroup = this.createControlGroup('Category:'); // V1 Label
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
    this.elements.categorySelectGroup.appendChild(this.elements.categorySelect);
    this.elements.categorySelectGroup.style.display = 'none'; // Hide initially
    this.container.appendChild(this.elements.categorySelectGroup);

    // --- Custom Category Input (Dynamically shown/hidden) ---
    this.elements.customCategoryGroup = this.createControlGroup('Custom:');
    this.elements.customCategoryInput = document.createElement('input');
    this.elements.customCategoryInput.type = 'text';
    this.elements.customCategoryInput.id = 'background-custom-category-input';
    this.elements.customCategoryInput.placeholder = 'Enter custom category';
    this.elements.customCategoryGroup.appendChild(this.elements.customCategoryInput);
    this.elements.customCategoryGroup.style.display = 'none'; // Hide initially
    this.container.appendChild(this.elements.customCategoryGroup);

    // --- Opacity Slider ---
    const opacityGroup = this.createControlGroup('Opacity:'); // V1 Label (Simpler than "Overlay Opacity")
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
    this.container.appendChild(opacityGroup);

    // --- Zoom Effect Checkbox ---
    const zoomGroup = this.createControlGroup('Zoom Effect:'); // V1 Label
    this.elements.zoomCheckbox = document.createElement('input');
    this.elements.zoomCheckbox.type = 'checkbox';
    this.elements.zoomCheckbox.id = 'background-zoom-checkbox';
    zoomGroup.appendChild(this.elements.zoomCheckbox); // Append after label
    zoomGroup.querySelector('label').htmlFor = this.elements.zoomCheckbox.id;
    this.container.appendChild(zoomGroup);

    // --- Show Info Checkbox ---
    const infoGroup = this.createControlGroup('Show Info:');
    this.elements.infoCheckbox = document.createElement('input');
    this.elements.infoCheckbox.type = 'checkbox';
    this.elements.infoCheckbox.id = 'background-info-checkbox';
    infoGroup.appendChild(this.elements.infoCheckbox);
    infoGroup.querySelector('label').htmlFor = this.elements.infoCheckbox.id;
    this.container.appendChild(infoGroup);

    // --- Next Background Button ---
    const refreshGroup = this.createControlGroup(''); // No label needed
    this.elements.refreshButton = document.createElement('button');
    this.elements.refreshButton.textContent = 'Next Background'; // V1 Text
    this.elements.refreshButton.id = 'background-refresh-button'; // Keep ID
    this.elements.refreshButton.style.width = '100%'; // Make button full width like V1
    refreshGroup.appendChild(this.elements.refreshButton);
    this.container.appendChild(refreshGroup);

    // --- Removed Type Radio Buttons and Color Picker ---

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
    // label.style.marginRight = '10px'; // Use CSS gap instead
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
     // Determine current type (image or color) - needed for conditional display
     const currentType = state.type || 'color'; // Default to color

    // Update Image Source Select, ensuring the selected value is available
    const currentSource = state.source || 'unsplash'; // Default source attempt
    if (this.elements.sourceSelect && !this.elements.sourceSelect.disabled) {
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

    // Show/Hide Peapix Country Select based on source AND if type is 'image'
    const showPeapixControls = currentType === 'image' && currentSource === 'peapix';
    if (this.elements.peapixCountryGroup) {
        this.elements.peapixCountryGroup.style.display = showPeapixControls ? 'flex' : 'none';
    }
    // Update Peapix Country Select value
    if (this.elements.peapixCountrySelect && showPeapixControls) {
        this.elements.peapixCountrySelect.value = state.peapixCountry || 'us'; // Default 'us'
    }

    // Show/Hide Category controls based on source (hide for Peapix) AND if type is 'image'
    const showCategoryControls = currentType === 'image' && currentSource !== 'peapix';
    if (this.elements.categorySelectGroup) {
        this.elements.categorySelectGroup.style.display = showCategoryControls ? 'flex' : 'none';
    }
    if (this.elements.customCategoryGroup) {
        // Custom group visibility depends on both category being 'Other' AND category controls being visible
        this.elements.customCategoryGroup.style.display = (showCategoryControls && state.category === 'Other') ? 'flex' : 'none';
    }

    // Update Image Category Select (only if visible)
    if (this.elements.categorySelect && showCategoryControls) {
        this.elements.categorySelect.value = state.category || 'Nature';
    }

    // Update Custom Category Input (only if visible)
    if (this.elements.customCategoryInput && this.elements.customCategoryGroup?.style.display !== 'none') {
        this.elements.customCategoryInput.value = state.customCategory || '';
    }

    // Update Opacity Slider
    if (this.elements.opacitySlider) {
      const opacity = state.overlayOpacity ?? 0.5; // Default 0.5
      this.elements.opacitySlider.value = opacity;
      if (this.elements.opacityValue) {
      this.elements.opacityValue.textContent = parseFloat(opacity).toFixed(2);
      }
    }

    // Update Zoom Checkbox (only relevant if type is 'image')
    if (this.elements.zoomCheckbox) {
        this.elements.zoomCheckbox.checked = state.zoomEnabled ?? true; // Default to true if missing
        // Optionally hide/disable zoom checkbox if type is 'color'
        const zoomGroup = this.elements.zoomCheckbox.closest('.control-group');
        if (zoomGroup) {
            zoomGroup.style.display = currentType === 'image' ? 'flex' : 'none';
        }
    }

    // Update Show Info Checkbox (only relevant if type is 'image')
    if (this.elements.infoCheckbox) {
        this.elements.infoCheckbox.checked = state.showInfo ?? true; // Default to true
        const infoGroup = this.elements.infoCheckbox.closest('.control-group');
        if (infoGroup) {
            infoGroup.style.display = currentType === 'image' ? 'flex' : 'none';
        }
    }

    // Update visibility/disabled state of image-related controls based on type
    const imageControlsDisabled = currentType !== 'image';
    if (this.elements.sourceSelect) this.elements.sourceSelect.disabled = imageControlsDisabled;
    if (this.elements.categorySelect) this.elements.categorySelect.disabled = imageControlsDisabled || currentSource === 'peapix';
    if (this.elements.customCategoryInput) this.elements.customCategoryInput.disabled = imageControlsDisabled || currentSource === 'peapix';
    if (this.elements.peapixCountrySelect) this.elements.peapixCountrySelect.disabled = imageControlsDisabled || currentSource !== 'peapix';
    if (this.elements.refreshButton) this.elements.refreshButton.disabled = imageControlsDisabled;
    // Zoom checkbox visibility handled above

  }

  /**
   * Adds event listeners to the UI elements to dispatch state updates.
   */
  addEventListeners() {
    if (!this.elements) return;

    // --- Removed Type Radio Listener ---

    // --- Removed Color Picker Listener ---

    // Image Source Change
    if (this.elements.sourceSelect) {
        this.elements.sourceSelect.addEventListener('change', (event) => {
            const newSource = event.target.value;
            // Dispatch update for source AND ensure type is 'image'
            this.dispatchStateUpdate({ type: 'image', source: newSource });
            // Immediately update UI visibility based on the new source/type
            this.updateUIFromState({ ...StateManager.getNestedValue(StateManager.getState(), this.statePath), type: 'image', source: newSource });
        });
    }

    // Peapix Country Select Change
    if (this.elements.peapixCountrySelect) {
        this.elements.peapixCountrySelect.addEventListener('change', (event) => {
            this.dispatchStateUpdate({ peapixCountry: event.target.value });
        });
    }


    // Image Category Select Change
    if (this.elements.categorySelect) {
        this.elements.categorySelect.addEventListener('change', (event) => {
            const newCategory = event.target.value;
            this.dispatchStateUpdate({ category: newCategory });
            // If 'Other' is not selected, clear custom category
            if (newCategory !== 'Other') {
                this.dispatchStateUpdate({ customCategory: '' });
             }
         });
     }

    // Custom Image Category Input Change
    if (this.elements.customCategoryInput) {
        // Use 'change' or 'blur' to trigger update after user finishes typing
        this.elements.customCategoryInput.addEventListener('change', (event) => {
            // Only update if 'Other' is the selected category type
            if (this.elements.categorySelect?.value === 'Other') {
                this.dispatchStateUpdate({ customCategory: event.target.value });
            }
        });
    }

    // Manual Refresh Button Click
    if (this.elements.refreshButton) {
        this.elements.refreshButton.addEventListener('click', () => {
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

    // Show Info Checkbox Change
    if (this.elements.infoCheckbox) {
        this.elements.infoCheckbox.addEventListener('change', (event) => {
            this.dispatchStateUpdate({ showInfo: event.target.checked });
        });
    }

    // Opacity Slider Change
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

    // Remove elements from DOM (clear the container provided by ControlPanel)
    if (this.container) {
        this.container.innerHTML = ''; // Clear the content we added
    }
    // Don't nullify this.container as it belongs to ControlPanel
    this.elements = {}; // Clear references
    console.log('BackgroundControls destroyed.');
  }
}
