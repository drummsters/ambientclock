import { BaseUIElement } from '../base/base-ui-element.js';
import { StateManager } from '../../core/state-manager.js';
import { EventBus } from '../../core/event-bus.js';

// --- Utility Functions ---
/** Pads a number with leading zeros (e.g., 9 -> "09") */
const padZero = (num) => String(num).padStart(2, '0');

/** Formats a date according to the specified format */
function formatDate(date, format) {
    const day = date.getDate();
    const month = date.getMonth() + 1; // getMonth() returns 0-11
    const year = date.getFullYear();
    const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' }); // e.g., "Monday"
    const monthName = date.toLocaleDateString('en-US', { month: 'long' }); // e.g., "January"

    switch (format) {
        case 'MM/DD/YYYY':
            return `${padZero(month)}/${padZero(day)}/${year}`;
        case 'DD/MM/YYYY':
            return `${padZero(day)}/${padZero(month)}/${year}`;
        case 'YYYY-MM-DD':
            return `${year}-${padZero(month)}-${padZero(day)}`;
        case 'Day':
            return dayOfWeek;
        case 'Day, Month DD':
            return `${dayOfWeek}, ${monthName} ${day}`;
        case 'Month DD, YYYY':
            return `${monthName} ${day}, ${year}`;
        default: // Default to US format
            return `${padZero(month)}/${padZero(day)}/${year}`;
    }
}


/**
 * Represents a Date display element.
 */
export class DateElement extends BaseUIElement {
  constructor(config) {
    const defaultConfig = {
      options: {
        format: 'Day, Month DD', // Default format
        fontFamily: 'Segoe UI',
        color: '#FFFFFF',
        visible: true, // Default to visible
        showSeparator: false, // Default for separator
      },
      ...config
    };
    super(defaultConfig);
    this.lastRenderedDate = null;
    this.needsRender = true; // Force initial render
  }

  async createElements() {
    // Create face element for the text
    if (!this.elements.face) {
      this.elements.face = document.createElement('div');
      this.elements.face.className = 'date-face'; // Use a specific class
      this.container.appendChild(this.elements.face);
    }

    // Create separator line element
    this.elements.separatorLine = document.createElement('div');
    this.elements.separatorLine.className = 'date-separator-line';
    this.container.appendChild(this.elements.separatorLine); // Append to main container

    this.render(); // Initial render
  }

  render() {
    if (!this.elements.face) return;

    const now = new Date();
    const currentDateString = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;

    // Only re-render if the date has changed or options affecting display changed
    if (currentDateString === this.lastRenderedDate && !this.needsRender) {
       // return; // Skip if date hasn't changed (unless options forced a render)
    }
    this.lastRenderedDate = currentDateString;
    this.needsRender = false; // Reset render flag

    // Format the date based on options
    const formattedDate = formatDate(now, this.options.format);
    this.elements.face.textContent = formattedDate;

    // Apply styles (including separator visibility)
    this.applyStyles();

    // Call base render for visibility and positioning
    super.render();
  }

  applyStyles() {
    if (!this.elements.face || !this.elements.separatorLine) return;

    // Apply styles to face
    this.elements.face.style.fontFamily = this.options.fontFamily || 'Segoe UI';
    this.elements.face.style.color = this.options.color || '#FFFFFF';

    // Apply styles and visibility to separator
    const showSeparator = this.options.showSeparator ?? false;
    this.elements.separatorLine.style.display = showSeparator ? 'block' : 'none';
    if (showSeparator) {
        // Set the CSS variable for the gradient color
        const color = this.options.color || '#FFFFFF';
        // Convert hex to rgba for the gradient which includes alpha
        const hexToRgba = (hex, alpha = 1) => {
            hex = hex.replace('#', '');
            const r = parseInt(hex.substring(0, 2), 16);
            const g = parseInt(hex.substring(2, 4), 16);
            const b = parseInt(hex.substring(4, 6), 16);
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        };
        // Use alpha 0.7 to match the previous opacity setting
        this.elements.separatorLine.style.setProperty('--separator-color', hexToRgba(color, 0.7));
    }
  }

  updateOptions(options) {
    const oldOptions = { ...this.options };
    super.updateOptions(options);

    // Check if relevant options changed
    if (oldOptions.format !== this.options.format ||
        oldOptions.fontFamily !== this.options.fontFamily ||
        oldOptions.color !== this.options.color ||
        oldOptions.visible !== this.options.visible ||
        oldOptions.showSeparator !== this.options.showSeparator) { // Check separator option
      this.needsRender = true; // Mark that a re-render is needed
      this.render();
    }
  }

  // No interval needed for date, it updates when options change or potentially on a longer timer if needed
  addEventListeners() {
    // No specific listeners needed for date element itself, relies on state updates
  }

  removeEventListeners() {
    // No specific listeners to remove
  }

  destroy() {
    super.destroy();
  }
}
