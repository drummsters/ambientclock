import { StateManager } from '../../core/state-manager.js';
import { EventBus } from '../../core/event-bus.js';
import { BackgroundService } from '../../services/background-service.js';
import { ConfigManager } from '../../core/config-manager.js';
import { BackgroundUIBuilder } from './ui/BackgroundUIBuilder.js'; // Import the builder

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
      this.container.classList.add('background-controls-content');

      // 2. Use the builder to create UI elements
      const builder = new BackgroundUIBuilder(
        this.container,
        this.peapixCountries,
        this.backgroundService.imageProviders
      );
      const builderResult = builder.build(); // Get the result object
      this.elements = builderResult; // Store references (includes contentWrapper now)
      this.contentWrapper = builderResult.contentWrapper; // Store specific reference

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
    const currentType = state.type || 'color'; // Default to color
    const currentSource = state.source || 'unsplash'; // Default source

    this._updateTypeControls(currentType);
    this._updateSourceControls(currentSource);
    this._updatePeapixControls(state, currentType, currentSource);
    this._updateCategoryControls(state, currentType, currentSource);
    this._updateCommonControls(state);
    this._updateCycleControls(state); // Added call
    this._updateControlVisibilityAndState(state, currentType, currentSource);
  }

  /** Updates the Type select control */
  _updateTypeControls(currentType) {
    if (this.elements.typeSelect) {
      this.elements.typeSelect.value = currentType;
    }
  }

  /** Updates the Image Source select control */
  _updateSourceControls(currentSource) {
    if (this.elements.sourceSelect && !this.elements.sourceSelect.disabled) {
      const sourceExists = Array.from(this.elements.sourceSelect.options).some(opt => opt.value === currentSource);
      if (sourceExists) {
        this.elements.sourceSelect.value = currentSource;
      } else if (this.elements.sourceSelect.options.length > 0) {
        this.elements.sourceSelect.value = this.elements.sourceSelect.options[0].value;
        // Consider dispatching state update if source changed due to unavailability
      }
    }
  }

  /** Updates the Peapix Country select control */
  _updatePeapixControls(state, currentType, currentSource) {
    const showPeapixControls = currentType === 'image' && currentSource === 'peapix';
    if (this.elements.peapixCountryGroup) {
      this.elements.peapixCountryGroup.style.display = showPeapixControls ? 'flex' : 'none';
    }
    if (this.elements.peapixCountrySelect && showPeapixControls) {
      this.elements.peapixCountrySelect.value = state.peapixCountry || 'us'; // Default 'us'
    }
  }

  /** Updates the Category select and Custom Category input controls */
  _updateCategoryControls(state, currentType, currentSource) {
    const showCategoryControls = currentType === 'image' && currentSource !== 'peapix';
    if (this.elements.categorySelectGroup) {
      this.elements.categorySelectGroup.style.display = showCategoryControls ? 'flex' : 'none';
    }
    if (this.elements.customCategoryGroup) {
      const showCustom = showCategoryControls && state.category === 'Other';
      this.elements.customCategoryGroup.style.display = showCustom ? 'flex' : 'none';
      if (this.elements.customCategoryInput && showCustom) {
        this.elements.customCategoryInput.value = state.customCategory || '';
      }
    }
    if (this.elements.categorySelect && showCategoryControls) {
      this.elements.categorySelect.value = state.category || 'Nature';
    }
  }

  /** Updates common controls like Opacity, Zoom, Info */
  _updateCommonControls(state) {
    // Opacity
    if (this.elements.opacitySlider) {
      const opacity = state.overlayOpacity ?? 0.5;
      this.elements.opacitySlider.value = opacity;
      if (this.elements.opacityValue) {
        this.elements.opacityValue.textContent = parseFloat(opacity).toFixed(2);
      }
    }
    // Zoom
    if (this.elements.zoomCheckbox) {
      this.elements.zoomCheckbox.checked = state.zoomEnabled ?? true;
    }
    // Info
    if (this.elements.infoCheckbox) {
      this.elements.infoCheckbox.checked = state.showInfo ?? true;
    }
    // Color Picker
    if (this.elements.colorPicker) {
        this.elements.colorPicker.value = state.color || '#000000'; // Default black
    }
  }

  /** Updates cycle controls */
  _updateCycleControls(state) {
    if (this.elements.cycleEnableCheckbox) {
        this.elements.cycleEnableCheckbox.checked = state.cycleEnabled ?? false;
    }
    // Update slider and value display
    if (this.elements.cycleIntervalSlider) {
        // Convert milliseconds from state to minutes for the slider
        const intervalMinutes = Math.round((state.cycleInterval ?? 300000) / 60000); // Default 5 min
        const clampedMinutes = Math.max(1, Math.min(60, intervalMinutes)); // Ensure value is within 1-60 range
        this.elements.cycleIntervalSlider.value = clampedMinutes;
        if (this.elements.cycleIntervalValue) {
            this.elements.cycleIntervalValue.textContent = clampedMinutes;
        }
    }
  }

  /** Updates the visibility and disabled state of controls based on type and source */
  _updateControlVisibilityAndState(state, currentType, currentSource) {
    const isImageType = currentType === 'image';
    const isPeapixSource = currentSource === 'peapix';
    const isCycleEnabled = state.cycleEnabled ?? false;

    // --- Visibility ---
    const setGroupDisplay = (element, condition) => {
        // Use the stored group reference if available, otherwise find closest
        const group = this.elements[`${element?.id?.replace(/-/g, '_').replace('_checkbox', '').replace('_input', '')}Group`] || element?.closest('.control-group');
        if (group) group.style.display = condition ? 'flex' : 'none';
    };

    setGroupDisplay(this.elements.sourceSelect, isImageType);
    // Peapix visibility handled in _updatePeapixControls
    // Category visibility handled in _updateCategoryControls
    // Custom Category visibility handled in _updateCategoryControls
    setGroupDisplay(this.elements.zoomCheckbox, isImageType);
    setGroupDisplay(this.elements.infoCheckbox, isImageType);
    setGroupDisplay(this.elements.cycleEnableCheckbox, isImageType); // Show cycle enable only for images
    setGroupDisplay(this.elements.cycleIntervalSlider, isImageType && isCycleEnabled); // Show interval slider only if image type and cycle enabled
    setGroupDisplay(this.elements.colorPicker, !isImageType); // Show color picker only if type is 'color'

    // --- Disabled State ---
    const imageControlsDisabled = !isImageType;
    if (this.elements.colorPicker) this.elements.colorPicker.disabled = isImageType; // Disable color picker if type is 'image'
    if (this.elements.sourceSelect) this.elements.sourceSelect.disabled = imageControlsDisabled;
    if (this.elements.categorySelect) this.elements.categorySelect.disabled = imageControlsDisabled || isPeapixSource;
    if (this.elements.customCategoryInput) this.elements.customCategoryInput.disabled = imageControlsDisabled || isPeapixSource;
    if (this.elements.peapixCountrySelect) this.elements.peapixCountrySelect.disabled = imageControlsDisabled || !isPeapixSource;
    if (this.elements.zoomCheckbox) this.elements.zoomCheckbox.disabled = imageControlsDisabled;
    if (this.elements.infoCheckbox) this.elements.infoCheckbox.disabled = imageControlsDisabled;
    if (this.elements.cycleEnableCheckbox) this.elements.cycleEnableCheckbox.disabled = imageControlsDisabled;
    if (this.elements.cycleIntervalSlider) this.elements.cycleIntervalSlider.disabled = imageControlsDisabled || !isCycleEnabled;
  }


  /**
   * Adds event listeners to the UI elements to dispatch state updates.
   */
  addEventListeners() {
    if (!this.elements) return;

    // Background Type Change
    if (this.elements.typeSelect) {
        this.elements.typeSelect.addEventListener('change', (event) => {
            const newType = event.target.value;
            this.dispatchStateUpdate({ type: newType });
            // Immediately update UI visibility based on the new type
            const currentState = StateManager.getNestedValue(StateManager.getState(), this.statePath) || {};
            this.updateUIFromState({ ...currentState, type: newType });
        });
    }

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
             // Immediately update UI visibility
             this.updateUIFromState({ ...StateManager.getNestedValue(StateManager.getState(), this.statePath), category: newCategory });
         });
     }

    // Custom Image Category Input Change
    if (this.elements.customCategoryInput) {
        // Create a debounced version of the update function
        let debounceTimeout;
        const debouncedUpdate = (value) => {
            clearTimeout(debounceTimeout);
            debounceTimeout = setTimeout(() => {
                if (this.elements.categorySelect?.value === 'Other') {
                    this.dispatchStateUpdate({ customCategory: value });
                }
            }, 500); // 500ms delay
        };

        // Handle input updates with debounce
        this.elements.customCategoryInput.addEventListener('input', (event) => {
            debouncedUpdate(event.target.value);
        });

        // Immediate update on blur (when input loses focus)
        this.elements.customCategoryInput.addEventListener('blur', (event) => {
            clearTimeout(debounceTimeout); // Clear any pending debounce
            if (this.elements.categorySelect?.value === 'Other') {
                this.dispatchStateUpdate({ customCategory: event.target.value });
            }
        });

        // Clean up debounce timeout on destroy
        this.unsubscribers.push(() => clearTimeout(debounceTimeout));
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

    // Cycle Enable Checkbox Change
    if (this.elements.cycleEnableCheckbox) {
        this.elements.cycleEnableCheckbox.addEventListener('change', (event) => {
            const isEnabled = event.target.checked;
            this.dispatchStateUpdate({ cycleEnabled: isEnabled });
            // Immediately update UI visibility
            this.updateUIFromState({ ...StateManager.getNestedValue(StateManager.getState(), this.statePath), cycleEnabled: isEnabled });
        });
    }

    // Cycle Interval Slider Change (use 'input' for live update)
    if (this.elements.cycleIntervalSlider) {
        this.elements.cycleIntervalSlider.addEventListener('input', (event) => {
            const intervalMinutes = parseInt(event.target.value, 10);
            if (this.elements.cycleIntervalValue) {
                this.elements.cycleIntervalValue.textContent = intervalMinutes;
            }
            // Debounce this later if needed for performance
            if (!isNaN(intervalMinutes) && intervalMinutes >= 1 && intervalMinutes <= 60) {
                const intervalMs = intervalMinutes * 60000; // Convert minutes to milliseconds
                this.dispatchStateUpdate({ cycleInterval: intervalMs });
            }
        });
    }

    // Background Color Picker Change (Use 'input' for live updates)
    if (this.elements.colorPicker) {
        this.elements.colorPicker.addEventListener('input', (event) => {
            // Dispatch update for color AND ensure type is 'color'
            this.dispatchStateUpdate({ type: 'color', color: event.target.value });
            // Immediately update UI visibility based on the new type (might not be strictly necessary on 'input', but harmless)
            this.updateUIFromState({ ...StateManager.getNestedValue(StateManager.getState(), this.statePath), type: 'color', color: event.target.value });
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

    // Remove only the wrapper we created, leaving the parent container intact
    if (this.contentWrapper && this.contentWrapper.parentNode === this.container) {
        this.container.removeChild(this.contentWrapper);
    }
    this.contentWrapper = null; // Clear reference
    // Don't nullify this.container as it belongs to ControlPanel
    this.elements = {}; // Clear references
    console.log('BackgroundControls destroyed.');
  }
}
