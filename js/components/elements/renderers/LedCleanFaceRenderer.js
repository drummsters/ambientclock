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
        // Clear existing content in case of re-creation (though ClockElement usually handles this)
        // this.parentContainer.innerHTML = ''; // Let ClockElement manage clearing

        this.rootElement = document.createElement('div');
        this.rootElement.className = 'digital-clean-container';
        // Add relative positioning and padding for separator line (handled in ClockElement's face container)
        // this.rootElement.style.position = 'relative';
        // this.rootElement.style.paddingBottom = '5px'; // Adjust as needed

        // Create spans
        this.elements.hours = document.createElement('span');
        this.elements.minutes = document.createElement('span');
        this.elements.seconds = document.createElement('span');
        this.elements.ampm = document.createElement('span');

        // Add classes
        this.elements.hours.className = 'clock-hours';
        this.elements.minutes.className = 'clock-minutes';
        this.elements.seconds.className = 'clock-seconds';
        this.elements.ampm.className = 'clock-ampm';

        // Create separators
        this.elements.separator1 = document.createElement('span');
        this.elements.separator1.className = 'clock-separator';
        this.elements.separator1.textContent = ':';
        this.elements.separator2 = document.createElement('span');
        this.elements.separator2.className = 'clock-separator';
        this.elements.separator2.textContent = ':';

        // Append elements in order
        this.rootElement.appendChild(this.elements.hours);
        this.rootElement.appendChild(this.elements.separator1);
        this.rootElement.appendChild(this.elements.minutes);
        this.rootElement.appendChild(this.elements.separator2);
        this.rootElement.appendChild(this.elements.seconds);
        this.rootElement.appendChild(this.elements.ampm);

        // Initially hide the root element, ClockElement will manage visibility
        this.rootElement.style.display = 'none';

        // Append the created root to the designated parent container
        this.parentContainer.appendChild(this.rootElement);

        console.log('LedCleanFaceRenderer elements created and appended.');
        return this.rootElement; // Still return the root for potential direct manipulation
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
        if (!this.rootElement || !this.elements.hours) {
            console.warn('LedCleanFaceRenderer cannot render - elements not created.');
            return;
        }

        const { hours, minutes, seconds } = timeData;
        let displayHours = hours;
        let ampm = '';

        if (options.timeFormat === '12') {
            ampm = hours >= 12 ? 'PM' : 'AM';
            displayHours = hours % 12;
            displayHours = displayHours ? displayHours : 12; // Hour '0' should be '12'
        }

        // Update content
        this.elements.hours.textContent = options.timeFormat === '12' ? displayHours : padZero(displayHours);
        this.elements.minutes.textContent = padZero(minutes);

        if (options.showSeconds) {
            this.elements.seconds.textContent = padZero(seconds);
            this.elements.seconds.style.display = '';
            this.elements.separator2.style.display = '';
        } else {
            this.elements.seconds.textContent = '';
            this.elements.seconds.style.display = 'none';
            this.elements.separator2.style.display = 'none';
        }

        if (options.timeFormat === '12') {
            this.elements.ampm.textContent = ampm;
            this.elements.ampm.style.display = '';
            this.elements.ampm.style.marginLeft = '0.2em'; // Keep style for spacing
        } else {
            this.elements.ampm.textContent = '';
            this.elements.ampm.style.display = 'none';
        }
    }

    /**
     * Applies styles based on the provided options.
     * @param {object} options - The clock element's current options.
     * @param {string} options.fontFamily - Font family string.
     * @param {string} options.color - Color string.
     * @param {string} options.fontWeight - Font weight string ('bold' or 'normal').
     */
    applyStyles(options) {
        if (!this.rootElement) return;
        this.rootElement.style.fontFamily = options.fontFamily || 'Segoe UI';
        this.rootElement.style.color = options.color || '#FFFFFF';
        this.rootElement.style.fontWeight = options.fontWeight || 'normal';
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
        this.elements = {};
        console.log('LedCleanFaceRenderer destroyed.');
    }
}
