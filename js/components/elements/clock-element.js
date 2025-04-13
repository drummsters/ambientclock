import { BaseUIElement } from '../base/base-ui-element.js';
import { LedCleanFaceRenderer } from './renderers/LedCleanFaceRenderer.js';
import { AnalogFaceRenderer } from './renderers/AnalogFaceRenderer.js';
import { EventBus } from '../../core/event-bus.js'; // Import EventBus

// Utility functions (padZero, calculateHandDegrees) moved to renderers

/**
 * Represents a Clock element, extending the BaseUIElement.
 * Delegates rendering of different clock faces to specific renderer classes.
 */
export class ClockElement extends BaseUIElement {
  constructor(config) {
    // Ensure default options are set if not provided
    const defaultConfig = {
      options: {
        face: 'clean', // Default face type changed from 'led'
        timeFormat: '12',
        showSeconds: true,
        fontFamily: 'Segoe UI', // Still needed for LedClean renderer
        fontWeight: 'normal', // Still needed for LedClean renderer
        color: '#FFFFFF',      // Still needed for both renderers
        showSeparator: false, // Default for separator line
      },
      ...config // User-provided config overrides defaults
    };
    super(defaultConfig); // Pass merged config to base class

    // Clock-specific properties
    this.intervalId = null;
    this.lastRenderedTime = null; // Keep for potential optimization

    // Instantiate Renderers - container will be set in createElements
    this.ledCleanRenderer = new LedCleanFaceRenderer();
    this.analogRenderer = new AnalogFaceRenderer();
  }

  /**
   * Creates the necessary DOM elements for the clock face.
   * Creates the necessary DOM elements for the clock face.
   * This will create spans for hours, minutes, seconds, etc.,
   * Instantiates face renderers and creates shared elements.
   */
  async createElements() {
    // 1. Create the main face container if it doesn't exist
    if (!this.elements.face) {
        this.elements.face = document.createElement('div');
        this.elements.face.className = 'clock-face';
        // Apply common positioning styles needed by renderers/separator
        this.elements.face.style.position = 'relative';
        this.elements.face.style.paddingBottom = '5px'; // For separator positioning
        this.container.appendChild(this.elements.face);
    }
    this.elements.face.innerHTML = ''; // Clear previous content before adding new elements

    // 2. Set the container for the renderers *before* creating their elements
    this.ledCleanRenderer.setContainer(this.elements.face);
    this.analogRenderer.setContainer(this.elements.face);

    // 3. Create elements for each renderer (they will append themselves to the container)
    const ledCleanRoot = this.ledCleanRenderer.createElements();
    const analogRoot = this.analogRenderer.createElements();
    // Roots are now already appended by the renderers themselves

    // 4. Create the shared separator line element
    this.elements.separatorLine = document.createElement('div');
    this.elements.separatorLine.className = 'clock-separator-line';
    this.elements.separatorLine.style.display = 'none'; // Initially hidden

    // 5. Append separator line to the *face container*, not the renderer roots.
    // Visibility will be controlled based on the active face type.
    this.elements.face.appendChild(this.elements.separatorLine);

    console.log('ClockElement: Renderers initialized and elements created.');

    // Initial render based on options
    this.render();
  }

  /**
   * Renders the current time by delegating to the appropriate face renderer.
   */
  render() {
    if (!this.elements.face || !this.ledCleanRenderer || !this.analogRenderer) {
        console.warn('ClockElement cannot render - face container or renderers not initialized.');
        return;
    }

    const now = new Date();
    const timeData = {
        hours: now.getHours(),
        minutes: now.getMinutes(),
        seconds: now.getSeconds()
    };

    // Basic optimization: check if seconds changed if seconds are shown,
    // or if minutes changed if seconds are hidden.
    const checkTime = this.options.showSeconds ? timeData.seconds : timeData.minutes;
    const lastCheckTime = this.options.showSeconds ? this.lastRenderedTime?.seconds : this.lastRenderedTime?.minutes;
    if (checkTime === lastCheckTime && this.lastRenderedTime) {
        // return; // Skip if relevant time part hasn't changed
    }
    this.lastRenderedTime = { ...timeData }; // Store full time data

    // Set data attribute for CSS styling based on face type
    this.elements.face.dataset.faceType = this.options.face;

    // Delegate face-specific rendering and visibility management
    this._updateActiveFace(timeData);

    // Call base render AFTER updating face content and visibility
    // This ensures base class handles position, scale, opacity etc. correctly
    // based on the final size/state of the active face.
    super.render();
  }

  /**
   * Ensures all elements are properly attached to the face element.
   * This prevents issues when switching between face types.
   */
  // ensureElementsAttached() { ... } // No longer needed

  /** Helper to apply common styles based on options (for text-based faces) */
  // applyCommonStyles() { ... } // Moved to LedCleanFaceRenderer

   /** Helper to apply styles to the analog clock face */
  // applyAnalogStyles() { ... } // Moved to AnalogFaceRenderer

  /**
   * Private helper to manage active face rendering and visibility.
   * @param {object} timeData - Object containing hours, minutes, seconds.
   */
  _updateActiveFace(timeData) {
    // Render the appropriate face
    if (this.options.face === 'analog') {
        this.analogRenderer.render(timeData, this.options);
    } else { // Treat any non-analog as 'clean'
        this.ledCleanRenderer.applyStyles(this.options); // Apply clean styles
        this.ledCleanRenderer.render(timeData, this.options); // Render using LedClean renderer
    }

    // Manage visibility of the digital and analog root elements
    const digitalRoot = this.ledCleanRenderer?.getRootElement();
    const analogRoot = this.analogRenderer?.getRootElement(); // This is now the <svg> element

    // Define the size for the analog clock
    const analogSize = '30vmin';

    if (this.options.face === 'analog') {
        if (analogRoot) analogRoot.style.display = ''; // Show SVG
        if (digitalRoot) digitalRoot.style.display = 'none'; // Hide digital container
        this.elements.face.classList.remove('analog-face-active'); // Ensure class is removed
    } else { // 'clean' face
        if (analogRoot) analogRoot.style.display = 'none'; // Hide SVG
        if (digitalRoot) digitalRoot.style.display = ''; // Show digital container
        this.container.style.width = '';
        this.container.style.height = '';
        // Remove potentially conflicting class if it was used before
        this.elements.face.classList.remove('analog-face-active');
    }

    // Manage visibility of the shared separator line (now directly in face container)
    if (this.elements.separatorLine) {
        this.elements.separatorLine.style.display = this.options.showSeparator ? 'block' : 'none';
        // Ensure separator is positioned correctly relative to the face container
        // (CSS should handle absolute positioning at the bottom)
    }
  }

  /**
   * Updates the clock element based on new options received from state.
   * @param {object} options - The new options object.
   */
  updateOptions(options) {
    const oldOptions = { ...this.options };
    super.updateOptions(options); // Merge options in base class

    // Check if relevant options changed and trigger re-render if needed
    if (oldOptions.face !== this.options.face ||
        oldOptions.timeFormat !== this.options.timeFormat ||
        oldOptions.showSeconds !== this.options.showSeconds ||
        oldOptions.fontFamily !== this.options.fontFamily ||
        oldOptions.fontWeight !== this.options.fontWeight || // Add fontWeight check
        oldOptions.color !== this.options.color ||
        oldOptions.showSeparator !== this.options.showSeparator) { // Check separator option
      this.render(); // Re-render if display options changed
    }
  }

  /**
   * Adds event listeners specific to the clock element (e.g., starting the timer).
   */
  addEventListeners() {
    // Start the interval timer to update the clock
    this.startTimer();

    // Add click listener to show controls
    this.boundHandleClick = this.handleClick.bind(this);
    this.container.addEventListener('click', this.boundHandleClick);
  }

  /**
   * Removes event listeners and cleans up resources (e.g., stopping the timer).
   */
  removeEventListeners() {
    // Stop the interval timer
    this.stopTimer();

    // Remove click listener
    if (this.container && this.boundHandleClick) {
        this.container.removeEventListener('click', this.boundHandleClick);
    }
  }

  /**
   * Starts the interval timer to update the clock display periodically.
   */
  startTimer() {
    this.stopTimer(); // Ensure no duplicate timers
    this.render(); // Initial render immediately
    this.intervalId = setInterval(() => {
      this.render();
    }, 1000); // Update every second
  }

  /**
   * Stops the interval timer.
   */
  stopTimer() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Handles clicks on the clock element to show the control panel.
   */
  handleClick() {
      console.log(`[ClockElement ${this.id}] Clicked. Publishing controls:showRequest.`);
      EventBus.publish('controls:showRequest');
  }

  /**
   * Overrides base destroy to include stopping the timer.
   */
  destroy() {
    this.stopTimer();

    // Destroy renderers
    this.ledCleanRenderer?.destroy();
    this.analogRenderer?.destroy();
    this.ledCleanRenderer = null;
    this.analogRenderer = null;

    super.destroy(); // Call base class destroy for cleanup
    console.log(`ClockElement ${this.id} destroyed.`);
  }
}
