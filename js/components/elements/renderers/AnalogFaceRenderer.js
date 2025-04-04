/**
 * Calculates the rotation degrees for analog clock hands.
 * @param {number} hours - The hours value (0-23).
 * @param {number} minutes - The minutes value (0-59).
 * @param {number} seconds - The seconds value (0-59).
 * @returns {object} Object containing rotation degrees for hour, minute, and second hands.
 */
function calculateHandDegrees(hours, minutes, seconds) {
    const secondsDeg = seconds * 6; // 6 degrees per second
    const minutesDeg = minutes * 6 + seconds * 0.1; // 6 degrees per minute + slight adjustment for seconds
    const hoursDeg = (hours % 12) * 30 + minutes * 0.5; // 30 degrees per hour + adjustment for minutes
    return { hoursDeg, minutesDeg, secondsDeg };
}

/**
 * Handles rendering the 'Analog' clock face using SVG.
 */
export class AnalogFaceRenderer {
    /**
     * Creates an instance of AnalogFaceRenderer.
     */
    constructor() {
        this.parentContainer = null;
        this.svgElement = null; // Root SVG element
        this.elements = {}; // References to SVG elements (hands, etc.)
        this.svgNS = "http://www.w3.org/2000/svg"; // SVG namespace
        console.log('AnalogFaceRenderer (SVG) constructor called.');
    }

    /**
     * Sets the parent container where the renderer should attach its elements.
     * @param {HTMLElement} container - The container element.
     */
    setContainer(container) {
        if (!container) {
            console.error('AnalogFaceRenderer: Invalid container provided.');
            return;
        }
        this.parentContainer = container;
        console.log('AnalogFaceRenderer container set.');
    }

    /**
     * Creates the SVG elements required for the Analog face.
     * @returns {SVGElement|null} The root SVG element, or null if container not set.
     */
    createElements() {
        if (!this.parentContainer) {
            console.error('AnalogFaceRenderer (SVG): Cannot create elements without a parent container.');
            return null;
        }

        // Create SVG element
        this.svgElement = document.createElementNS(this.svgNS, 'svg');
        this.svgElement.setAttribute('viewBox', '0 0 100 100'); // Use viewBox for scaling
        this.svgElement.setAttribute('width', '100%');
        this.svgElement.setAttribute('height', '100%');
        this.svgElement.style.display = 'none'; // Initially hidden, managed by ClockElement

        // Create clock face circle (border/background)
        const faceCircle = document.createElementNS(this.svgNS, 'circle');
        faceCircle.setAttribute('cx', '50');
        faceCircle.setAttribute('cy', '50');
        faceCircle.setAttribute('r', '48'); // Radius leaving space for stroke
        faceCircle.classList.add('clock-face-circle'); // For CSS styling
        this.svgElement.appendChild(faceCircle);

        // Create hour markers (lines)
        for (let i = 0; i < 12; i++) {
            const angle = i * 30; // 30 degrees per hour
            const marker = document.createElementNS(this.svgNS, 'line');
            const isHourMarker = i % 3 === 0; // Major markers at 12, 3, 6, 9
            const length = isHourMarker ? 8 : 4; // Length of marker
            const y1 = 5; // Start near edge
            const y2 = 5 + length; // End point
            marker.setAttribute('x1', '50');
            marker.setAttribute('y1', y1.toString());
            marker.setAttribute('x2', '50');
            marker.setAttribute('y2', y2.toString());
            marker.setAttribute('transform', `rotate(${angle} 50 50)`);
            marker.classList.add('marker', isHourMarker ? 'marker-hour' : 'marker-minute');
            this.svgElement.appendChild(marker);
        }

        // Create clock hands (lines)
        this.elements.hourHand = document.createElementNS(this.svgNS, 'line');
        this.elements.hourHand.setAttribute('x1', '50');
        this.elements.hourHand.setAttribute('y1', '50');
        this.elements.hourHand.setAttribute('x2', '50');
        this.elements.hourHand.setAttribute('y2', '25'); // Length towards 12 o'clock
        this.elements.hourHand.classList.add('hand', 'hour-hand');
        this.svgElement.appendChild(this.elements.hourHand);

        this.elements.minuteHand = document.createElementNS(this.svgNS, 'line');
        this.elements.minuteHand.setAttribute('x1', '50');
        this.elements.minuteHand.setAttribute('y1', '50');
        this.elements.minuteHand.setAttribute('x2', '50');
        this.elements.minuteHand.setAttribute('y2', '15'); // Length towards 12 o'clock
        this.elements.minuteHand.classList.add('hand', 'minute-hand');
        this.svgElement.appendChild(this.elements.minuteHand);

        this.elements.secondHand = document.createElementNS(this.svgNS, 'line');
        this.elements.secondHand.setAttribute('x1', '50');
        this.elements.secondHand.setAttribute('y1', '50');
        this.elements.secondHand.setAttribute('x2', '50');
        this.elements.secondHand.setAttribute('y2', '10'); // Length towards 12 o'clock
        this.elements.secondHand.classList.add('hand', 'second-hand');
        this.svgElement.appendChild(this.elements.secondHand);

        // Create center dot (circle)
        this.elements.centerDot = document.createElementNS(this.svgNS, 'circle');
        this.elements.centerDot.setAttribute('cx', '50');
        this.elements.centerDot.setAttribute('cy', '50');
        this.elements.centerDot.setAttribute('r', '2'); // Radius of center dot
        this.elements.centerDot.classList.add('center-dot');
        this.svgElement.appendChild(this.elements.centerDot);

        // Append SVG to the parent container
        this.parentContainer.appendChild(this.svgElement);

        console.log('AnalogFaceRenderer (SVG) elements created.');
        return this.svgElement; // Return the root SVG element
    }

    /**
     * Updates the rotation of the clock hands.
     * @param {object} timeData - Object containing current time parts.
     * @param {number} timeData.hours - Current hours (0-23).
     * @param {number} timeData.minutes - Current minutes (0-59).
     * @param {number} timeData.seconds - Current seconds (0-59).
     * @param {object} options - The clock element's current options.
     * @param {boolean} options.showSeconds - Whether to display the second hand.
     */
    render(timeData, options) {
        if (!this.svgElement || !this.elements.hourHand) {
            console.warn('AnalogFaceRenderer (SVG) cannot render - elements not created.');
            return;
        }

        const { hours, minutes, seconds } = timeData;
        const { hoursDeg, minutesDeg, secondsDeg } = calculateHandDegrees(hours, minutes, seconds);

        // Apply rotation using SVG transform attribute
        this.elements.hourHand.setAttribute('transform', `rotate(${hoursDeg} 50 50)`);
        this.elements.minuteHand.setAttribute('transform', `rotate(${minutesDeg} 50 50)`);

        if (options.showSeconds) {
            this.elements.secondHand.setAttribute('transform', `rotate(${secondsDeg} 50 50)`);
            this.elements.secondHand.style.display = ''; // Show SVG element
        } else {
            this.elements.secondHand.style.display = 'none'; // Hide SVG element
        }
    }

    /**
     * Applies styles based on the provided options (primarily color).
     * @param {object} options - The clock element's current options.
     * @param {string} options.color - Color string.
     */
    applyStyles(options) {
        // Styling is now primarily handled by CSS targeting SVG elements/classes.
        // This method might be used for dynamic color changes if needed later,
        // but currently CSS variables are preferred.
        if (!this.svgElement) return;
    }

    /**
     * Returns the root SVG element for this face.
     * @returns {SVGElement|null} The root SVG element or null if not created.
     */
    getRootElement() {
        return this.svgElement;
    }

    /**
     * Cleans up the SVG element created by this renderer.
     */
    destroy() {
        if (this.svgElement && this.svgElement.parentNode) {
            this.svgElement.parentNode.removeChild(this.svgElement);
        }
        this.svgElement = null;
        this.elements = {};
        console.log('AnalogFaceRenderer (SVG) destroyed.');
    }
}
