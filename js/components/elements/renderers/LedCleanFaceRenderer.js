/**
 * Pads a number with a leading zero if it's less than 10.
 * @param {number} num - The number to pad.
 * @returns {string} The padded string.
 */
const padZero = (num) => String(num).padStart(2, '0');

/**
 * Handles rendering the 'LED' and 'Clean' clock faces.
 */
export class LedCleanFaceRenderer {
    /**
     * Creates an instance of LedCleanFaceRenderer.
     */
    constructor() {
        // Container will be set later via setContainer
        this.parentContainer = null;
        this.elements = {}; // To store references to spans, separators, etc.
        this.rootElement = null; // The main container for this face type
        console.log('LedCleanFaceRenderer constructor called.');
    }

    /**
     * Sets the parent container where the renderer should attach its elements.
     * @param {HTMLElement} container - The container element.
     */
    setContainer(container) {
        if (!container) {
            console.error('LedCleanFaceRenderer: Invalid container provided.');
            return;
        }
        this.parentContainer = container;
        console.log('LedCleanFaceRenderer container set.');
    }

    /**
     * Creates the DOM elements required for the LED/Clean face and appends them
     * to the parent container.
     * @returns {HTMLElement|null} The root container element for this face, or null if container not set.
     */
    createElements() {
        if (!this.parentContainer) {
            console.error('LedCleanFaceRenderer: Cannot create elements without a parent container. Call setContainer first.');
            return null;
        }

        // Create the main container for the digital/clean face
        this.rootElement = document.createElement('div');
        this.rootElement.className = 'digital-clean-container';

        // Initially hide the root element, ClockElement will manage visibility
        this.rootElement.style.display = 'none';

        // Append the created root to the designated parent container
        this.parentContainer.appendChild(this.rootElement);

        console.log('LedCleanFaceRenderer container created and appended.');
        return this.rootElement;
    }

    /**
     * Updates the text content of the time elements.
     * @param {object} timeData - Object containing current time parts.
     * @param {number} timeData.hours - Current hours (0-23).
     * @param {number} timeData.minutes - Current minutes (0-59).
     * @param {number} timeData.seconds - Current seconds (0-59).
     * @param {object} options - The clock element's current options.
     * @param {string} options.timeFormat - '12' or '24'.
     * @param {boolean} options.showSeconds - Whether to display seconds.
     */
    render(timeData, options) {
        if (!this.rootElement) {
            console.warn('LedCleanFaceRenderer cannot render - root element not created.');
            return;
        }

        const { hours, minutes, seconds } = timeData;
        let displayHours = hours;
        let ampm = '';

        if (options.timeFormat === '12') {
            ampm = hours >= 12 ? ' PM' : ' AM'; // Add space before AM/PM
            displayHours = hours % 12;
            displayHours = displayHours ? displayHours : 12; // Hour '0' should be '12'
        }

        // Format the time string
        let timeString = options.timeFormat === '12'
            ? String(displayHours) // No padding for 12hr format hours
            : padZero(displayHours);
        timeString += `:${padZero(minutes)}`;
        if (options.showSeconds) {
            timeString += `:${padZero(seconds)}`;
        }
        timeString += ampm; // Append AM/PM (with leading space if applicable)

        // Clear previous characters
        this.rootElement.innerHTML = '';

        // Wrap each character in a span
        for (const char of timeString) {
            const charSpan = document.createElement('span');
            charSpan.className = 'time-char';
            // Add specific classes for narrow characters
            if (char === ' ') {
                charSpan.classList.add('time-char-space'); // Class for spaces
            } else if (char === ':') {
                charSpan.classList.add('time-char-narrow'); // Class for colons
            }
            // Use non-breaking space for spaces to ensure they take up width
            charSpan.textContent = char === ' ' ? '\u00A0' : char;
            this.rootElement.appendChild(charSpan);
        }
    }

    /**
     * Applies styles based on the provided options.
     * @param {object} options - The clock element's current options.
     * @param {string} options.fontFamily - Font family string.
     * @param {string} options.color - Color string.
     * @param {string} options.fontWeight - Font weight string ('bold' or 'normal').
     * @param {number} options.charSpacing - Character spacing in ch units.
     * @param {number} options.colonAdjustX - Horizontal adjustment for colons in %. (Renamed)
     * @param {number} options.colonAdjustY - Vertical adjustment for colons in %.
     */
    applyStyles(options) {
        if (!this.rootElement) return;
        this.rootElement.style.fontFamily = options.fontFamily || 'Segoe UI';
        this.rootElement.style.color = options.color || '#FFFFFF';
        this.rootElement.style.fontWeight = options.fontWeight || 'normal';

        // Apply character spacing using a CSS variable
        const spacing = options.charSpacing ?? 0.65; // Use default from state
        this.rootElement.style.setProperty('--time-char-width', `${spacing}ch`);

        // Apply colon X adjustment using a CSS variable
        const colonAdjustX = options.colonAdjustX ?? 0; // Renamed state property
        this.rootElement.style.setProperty('--time-colon-adjust-x', `${colonAdjustX}%`); // Renamed CSS variable

        // Apply colon vertical adjustment using a CSS variable
        const colonAdjustY = options.colonAdjustY ?? 0; // Default to 0%
        this.rootElement.style.setProperty('--time-colon-adjust-y', `${colonAdjustY}%`);
    }

    /**
     * Returns the root container element for this face.
     * @returns {HTMLElement|null} The root element or null if not created.
     */
    getRootElement() {
        return this.rootElement;
    }

    /**
     * Cleans up DOM elements created by this renderer.
     */
    destroy() {
        if (this.rootElement && this.rootElement.parentNode) {
            this.rootElement.parentNode.removeChild(this.rootElement);
        }
        this.rootElement = null;
        // No longer need this.elements for individual time parts
        // this.elements = {};
        console.log('LedCleanFaceRenderer destroyed.');
    }
}
