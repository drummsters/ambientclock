import { BaseUIElement } from '../base/base-ui-element.js';
// import { StateManager } from '../../core/state-manager.js'; // Not needed directly

// --- Utility Functions ---
/** Pads a number with a leading zero if it's less than 10. */
const padZero = (num) => String(num).padStart(2, '0');

/**
 * Calculates the rotation degrees for analog clock hands
 * @param {number} hours - The hours value (0-23)
 * @param {number} minutes - The minutes value (0-59)
 * @param {number} seconds - The seconds value (0-59)
 * @returns {Object} Object containing rotation degrees for hour, minute, and second hands
 */
function calculateHandDegrees(hours, minutes, seconds) {
    const secondsDeg = seconds * 6; // 6 degrees per second
    const minutesDeg = minutes * 6 + seconds * 0.1; // 6 degrees per minute + slight adjustment for seconds
    const hoursDeg = (hours % 12) * 30 + minutes * 0.5; // 30 degrees per hour + adjustment for minutes
    
    return { hoursDeg, minutesDeg, secondsDeg };
}

/**
 * Represents a Clock element, extending the BaseUIElement.
 * Handles rendering different clock faces (digital, analog, etc.).
 */
export class ClockElement extends BaseUIElement {
  constructor(config) {
    // Ensure default options are set if not provided
    const defaultConfig = {
      options: {
        face: 'led', // Default face (changed from digital)
        timeFormat: '12',
        showSeconds: true,
        fontFamily: 'Segoe UI',
        color: '#FFFFFF',
        showSeparator: false, // Default for separator line
        // Add other clock-specific defaults here
      },
      ...config // User-provided config overrides defaults
    };
    super(defaultConfig); // Pass merged config to base class

    // Clock-specific properties
    this.intervalId = null;
    this.lastRenderedTime = null;
  }

  /**
   * Creates the necessary DOM elements for the clock face.
   * This will create spans for hours, minutes, seconds, etc.,
   * depending on the potential face types.
   */
  async createElements() {
    // Main face container (already created by base class or here)
    if (!this.elements.face) {
        this.elements.face = document.createElement('div');
        this.elements.face.className = 'clock-face';
        this.container.appendChild(this.elements.face);
    }
    this.elements.face.innerHTML = ''; // Clear previous content if any

    // Create spans for clean/digital display
    this.elements.hours = document.createElement('span');
    this.elements.minutes = document.createElement('span');
    this.elements.seconds = document.createElement('span');
    this.elements.ampm = document.createElement('span'); // For 12-hour format

    // Add classes for potential styling
    this.elements.hours.className = 'clock-hours';
    this.elements.minutes.className = 'clock-minutes';
    this.elements.seconds.className = 'clock-seconds';
    this.elements.ampm.className = 'clock-ampm';

    // Add separators (spans for easier targeting/styling if needed)
    this.elements.separator1 = document.createElement('span');
    this.elements.separator1.className = 'clock-separator';
    this.elements.separator1.textContent = ':';
    this.elements.separator2 = document.createElement('span');
    this.elements.separator2.className = 'clock-separator';
    this.elements.separator2.textContent = ':';

    // Create analog clock container (matching v1 structure)
    this.elements.analogFace = document.createElement('div');
    this.elements.analogFace.className = 'analog-face';

    // Create clock hands
    this.elements.hourHand = document.createElement('div');
    this.elements.hourHand.className = 'hand hour-hand';
    this.elements.hourHand.id = 'analog-hour';
    this.elements.analogFace.appendChild(this.elements.hourHand);

    this.elements.minuteHand = document.createElement('div');
    this.elements.minuteHand.className = 'hand minute-hand';
    this.elements.minuteHand.id = 'analog-minute';
    this.elements.analogFace.appendChild(this.elements.minuteHand);

    this.elements.secondHand = document.createElement('div');
    this.elements.secondHand.className = 'hand second-hand';
    this.elements.secondHand.id = 'analog-second';
    this.elements.analogFace.appendChild(this.elements.secondHand);

    // Create center dot
    const centerDot = document.createElement('div');
    centerDot.className = 'center-dot';
    this.elements.analogFace.appendChild(centerDot);

    // Create hour markers (12, 3, 6, 9)
    const marker12 = document.createElement('div');
    marker12.className = 'marker marker-12';
    this.elements.analogFace.appendChild(marker12);

    const marker3 = document.createElement('div');
    marker3.className = 'marker marker-3';
    this.elements.analogFace.appendChild(marker3);

    const marker6 = document.createElement('div');
    marker6.className = 'marker marker-6';
    this.elements.analogFace.appendChild(marker6);

    const marker9 = document.createElement('div');
    marker9.className = 'marker marker-9';
    this.elements.analogFace.appendChild(marker9);

    // Add relative positioning and padding for separator
    this.elements.analogFace.style.position = 'relative';
    this.elements.analogFace.style.paddingBottom = '5px'; // Reduce padding for separator

    // Append digital/clean elements (will be hidden/shown via CSS)
    this.elements.digitalCleanContainer = document.createElement('div');
    this.elements.digitalCleanContainer.className = 'digital-clean-container';
    // Add relative positioning and padding for separator
    this.elements.digitalCleanContainer.style.position = 'relative';
    this.elements.digitalCleanContainer.style.paddingBottom = '5px'; // Reduce padding for separator
    this.elements.digitalCleanContainer.appendChild(this.elements.hours);
    this.elements.digitalCleanContainer.appendChild(this.elements.separator1);
    this.elements.digitalCleanContainer.appendChild(this.elements.minutes);
    this.elements.digitalCleanContainer.appendChild(this.elements.separator2);
    this.elements.digitalCleanContainer.appendChild(this.elements.seconds);
    this.elements.digitalCleanContainer.appendChild(this.elements.ampm);

    // Create the separator line element
    this.elements.separatorLine = document.createElement('div');
    this.elements.separatorLine.className = 'clock-separator-line'; // Use a specific class for clock

    // Append separator line to BOTH potential parent containers
    // CSS will hide the inactive container, so the separator in it will also be hidden.
    this.elements.analogFace.appendChild(this.elements.separatorLine.cloneNode(true)); // Clone for analog
    this.elements.digitalCleanContainer.appendChild(this.elements.separatorLine); // Original for digital/clean

    // Append both containers to the main face div
    this.elements.face.appendChild(this.elements.analogFace);
    this.elements.face.appendChild(this.elements.digitalCleanContainer);

    // Initial render based on options
    this.render();
  }

  /**
   * Renders the current time based on the selected clock face and options.
   */
  render() {
    if (!this.elements.face) return; // Don't render if face element doesn't exist

    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();

    // Prevent unnecessary re-renders if time hasn't changed (relevant for non-second displays)
    const currentTimeString = `${hours}:${minutes}:${this.options.showSeconds ? seconds : ''}`;
    if (currentTimeString === this.lastRenderedTime) {
      // return; // Skip render if time hasn't changed enough
    }
    this.lastRenderedTime = currentTimeString;

    // Set data attribute for CSS styling based on face type
    this.elements.face.dataset.faceType = this.options.face; // Will be 'led', 'clean', or 'analog'

    // First, ensure all containers are properly attached to the face
    this.ensureElementsAttached();

    // Format time values that will be used by multiple face types
    let displayHours = hours;
    let ampm = '';

    if (this.options.timeFormat === '12') {
      ampm = hours >= 12 ? 'PM' : 'AM';
      displayHours = hours % 12;
      displayHours = displayHours ? displayHours : 12; // Hour '0' should be '12'
    }

    // --- Render based on selected face ---
    // Update content within the correct container, rely on CSS for visibility

    // Update Digital/Clean content (spans)
    this.elements.hours.textContent = this.options.timeFormat === '12' ? displayHours : padZero(displayHours);
    this.elements.minutes.textContent = padZero(minutes);
    if (this.options.showSeconds) {
      this.elements.seconds.textContent = padZero(seconds);
      this.elements.seconds.style.display = ''; // Use CSS classes later if needed
      this.elements.separator2.style.display = '';
    } else {
      this.elements.seconds.textContent = '';
      this.elements.seconds.style.display = 'none';
      this.elements.separator2.style.display = 'none';
    }
    if (this.options.timeFormat === '12') {
      this.elements.ampm.textContent = ampm;
      this.elements.ampm.style.display = '';
      this.elements.ampm.style.marginLeft = '0.2em';
    } else {
      this.elements.ampm.textContent = '';
      this.elements.ampm.style.display = 'none';
    }

    // --- Explicitly Show/Hide Face Containers ---
    // We set display:none directly here instead of only relying on CSS attribute selectors ([data-face-type]).
    // This ensures the inactive face is completely removed from the layout flow,
    // preventing it from affecting getBoundingClientRect() calculations used by plugins like DragPlugin,
    // which caused issues with drag boundaries.
    if (this.options.face === 'analog') {
        this.elements.analogFace.style.display = 'block'; // Or 'flex' if it uses flexbox internally
        this.elements.digitalCleanContainer.style.display = 'none';
        this.applyAnalogStyles(); // Apply color to analog elements
    } else { // 'led' or 'clean'
        this.elements.analogFace.style.display = 'none';
        this.elements.digitalCleanContainer.style.display = 'flex'; // Assuming digital/clean uses flex
        this.applyCommonStyles(); // Apply font/color to digital/clean container
    }

    // Update Analog content (only needs calculation if visible, but harmless to always calculate)
    const { hoursDeg, minutesDeg, secondsDeg } = calculateHandDegrees(hours, minutes, seconds);
    this.elements.hourHand.style.transform = `translateX(-50%) rotate(${hoursDeg}deg)`;
    this.elements.minuteHand.style.transform = `translateX(-50%) rotate(${minutesDeg}deg)`;
    if (this.options.showSeconds) {
      this.elements.secondHand.style.transform = `translateX(-50%) rotate(${secondsDeg}deg)`;
      this.elements.secondHand.style.display = '';
    } else {
      this.elements.secondHand.style.display = 'none';
    }
    // this.applyAnalogStyles(); // Moved inside the conditional display block above

    // --- Apply Separator Visibility ---
    // Find the separator line within the currently VISIBLE container
    const activeContainer = this.options.face === 'analog' ? this.elements.analogFace : this.elements.digitalCleanContainer;
    const separatorLine = activeContainer.querySelector('.clock-separator-line');
    if (separatorLine) {
        separatorLine.style.display = this.options.showSeparator ? 'block' : 'none';
    }

    // Make sure container is visible after first render with valid state
    super.render(); // Call base render to handle visibility, position, scale etc.
  }

  /**
   * Ensures all elements are properly attached to the face element.
   * This prevents issues when switching between face types.
   */
  ensureElementsAttached() {
    // Check if the containers are attached to the face
    if (!this.elements.digitalCleanContainer.parentNode) {
      this.elements.face.appendChild(this.elements.digitalCleanContainer);
    }

    if (!this.elements.analogFace.parentNode) {
      this.elements.face.appendChild(this.elements.analogFace);
    }

    // Check if the spans are attached to the digitalCleanContainer
    if (!this.elements.hours.parentNode) {
      this.elements.digitalCleanContainer.appendChild(this.elements.hours);
      this.elements.digitalCleanContainer.appendChild(this.elements.separator1);
      this.elements.digitalCleanContainer.appendChild(this.elements.minutes);
      this.elements.digitalCleanContainer.appendChild(this.elements.separator2);
      this.elements.digitalCleanContainer.appendChild(this.elements.seconds);
      this.elements.digitalCleanContainer.appendChild(this.elements.ampm);
    }
  }

  /** Helper to apply common styles based on options (for text-based faces) */
  applyCommonStyles() {
      if (!this.elements.digitalCleanContainer) return;
      this.elements.digitalCleanContainer.style.fontFamily = this.options.fontFamily || 'Segoe UI';
      this.elements.digitalCleanContainer.style.color = this.options.color || '#FFFFFF';
      // Apply font weight
      this.elements.digitalCleanContainer.style.fontWeight = this.options.fontWeight || 'normal'; // Default to normal
  }

   /** Helper to apply styles to the analog clock face */
  applyAnalogStyles() {
      if (!this.elements.analogFace) return;
      const color = this.options.color || '#FFFFFF';

      // Apply color to analog clock elements
      this.elements.analogFace.style.borderColor = color;
      this.elements.hourHand.style.backgroundColor = color;
      this.elements.minuteHand.style.backgroundColor = color;

      // Center dot and markers
      const centerDot = this.elements.analogFace.querySelector('.center-dot');
      if (centerDot) centerDot.style.backgroundColor = color;

      // Apply color to markers
      const markers = this.elements.analogFace.querySelectorAll('.marker');
      markers.forEach(marker => {
          marker.style.backgroundColor = color;
      });

      // Visibility is handled by CSS based on data-face-type attribute
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
  }

  /**
   * Removes event listeners and cleans up resources (e.g., stopping the timer).
   */
  removeEventListeners() {
    // Stop the interval timer
    this.stopTimer();
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
   * Overrides base destroy to include stopping the timer.
   */
  destroy() {
    this.stopTimer();
    super.destroy(); // Call base class destroy for cleanup
  }
}
