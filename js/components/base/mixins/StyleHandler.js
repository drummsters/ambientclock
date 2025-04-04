/**
 * Mixin/Helper class for handling visual style updates (position, scale, opacity, visibility, effects) for BaseUIElement.
 */
export class StyleHandler {
    // Static scale constraints moved from BaseUIElement
    static MIN_SCALE = 0.1; // Lowered minimum scale
    static MAX_SCALE = 5.0;
    static SCALE_STEP = 0.1;

    /**
     * Creates an instance of StyleHandler.
     * @param {BaseUIElement} elementInstance - The BaseUIElement instance this handler is attached to.
     */
    constructor(elementInstance) {
        if (!elementInstance || !elementInstance.id || !elementInstance.container) {
            throw new Error("StyleHandler requires a valid element instance with id and container.");
        }
        this.element = elementInstance; // Reference to the BaseUIElement instance
        console.log(`[StyleHandler] Initialized for ${this.element.id}`);
    }

    /**
     * Updates the element's position based on percentage values.
     * @param {object} position - Object with x and y properties (percentages).
     */
    updatePosition(position) {
        if (!this.element.container || typeof position?.x !== 'number' || typeof position?.y !== 'number') return;

        this.element.container.style.left = `${position.x}%`;
        this.element.container.style.top = `${position.y}%`;
        // Use translate to center the element on its coordinates
        this.element.container.style.transform = `translate(-50%, -50%)`; // Only translate
        // Trigger render if needed (handled by updateFromState calling element.render)
    }

    /**
     * Updates the element's scale using font-size and dimensions (v1 style).
     * @param {number} scale - The scale factor (e.g., 1.0 is base size).
     */
    updateScale(scale) {
        if (!this.element.container || typeof scale !== 'number') return;

        // Clamp scale
        const clampedScale = Math.max(StyleHandler.MIN_SCALE, Math.min(StyleHandler.MAX_SCALE, scale));

        // --- V1 Style Scaling: Reverted - Adjust font-size was removed previously ---
        // const baseFontSize = this.element.responsiveConfig?.baseFontSize || 2; // Base size in 'em' units
        // const newSize = baseFontSize * clampedScale;
        // Apply to the main container or a specific 'face' element if needed
        // const targetElement = this.element.elements?.face || this.element.container;
        // if (targetElement) {
        //     // REMOVED: Do not override CSS font-size for vw scaling
        //     // targetElement.style.fontSize = `${newSize.toFixed(2)}em`;
        // }

        // --- Apply transform: scale() along with translate ---
        // Reverted back to using scale() in transform
        this.element.container.style.transform = `translate(-50%, -50%) scale(${clampedScale})`;

        // For analog clock, adjust width/height of the face container (still needed)
        if (this.element.type === 'clock' && this.element.options?.face === 'analog' && this.element.elements?.analogFace) {
            const baseDimWidth = this.element.responsiveConfig?.baseWidth || 150; // Base width/height in px
            const baseDimHeight = this.element.responsiveConfig?.baseHeight || 150;
            const newWidth = baseDimWidth * clampedScale;
            const newHeight = baseDimHeight * clampedScale;
            // Apply to the .analog-face div within the main container
            this.element.elements.analogFace.style.width = `${newWidth}px`;
            this.element.elements.analogFace.style.height = `${newHeight}px`;
        }
        // Trigger render if needed (handled by updateFromState calling element.render)
    }

    /**
     * Updates the element's opacity.
     * @param {number} opacity - The opacity value (0 to 1).
     */
    updateOpacity(opacity) {
        if (!this.element.container || typeof opacity !== 'number') return;
        this.element.container.style.opacity = Math.max(0, Math.min(1, opacity));
    }

    /**
     * Updates the element's visibility based on the 'visible' option.
     * @param {boolean} isVisible - Whether the element should be visible.
     */
    updateVisibility(isVisible) {
        if (!this.element.container) return;
        // Use 'display' none/block or add/remove a CSS class
        this.element.container.style.display = isVisible ? '' : 'none';
    }

    /**
     * Updates the element's visual effects based on its effectStyle state.
     * @param {string} style - The effect style string (e.g., 'flat', 'raised', 'reflected').
     */
    updateEffects(style = 'flat') { // Default to 'flat'
        if (!this.element.container) return;

        // console.log(`[${this.element.id} via StyleHandler] Updating effect style to: ${style}`);

        // Remove existing effect classes
        this.element.container.classList.remove('effect-flat', 'effect-raised', 'effect-reflected');

        // Add the new effect class
        if (style === 'raised') {
            this.element.container.classList.add('effect-raised');
        } else if (style === 'reflected') {
            this.element.container.classList.add('effect-reflected');
        } else {
            this.element.container.classList.add('effect-flat'); // Default to flat
        }
    }

    /**
     * Cleans up (currently no specific cleanup needed for styles).
     */
    destroy() {
        console.log(`[StyleHandler] Destroying for ${this.element.id}`);
        this.element = null; // Release reference
    }
}
