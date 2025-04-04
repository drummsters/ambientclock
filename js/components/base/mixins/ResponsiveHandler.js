import { StateManager } from '../../../core/state-manager.js'; // Needed for ensureElementInViewport

/**
 * Mixin/Helper class for handling responsive behavior for BaseUIElement.
 */
export class ResponsiveHandler {
    /**
     * Creates an instance of ResponsiveHandler.
     * @param {BaseUIElement} elementInstance - The BaseUIElement instance this handler is attached to.
     */
    constructor(elementInstance) {
        if (!elementInstance || !elementInstance.id || !elementInstance.container) {
            throw new Error("ResponsiveHandler requires a valid element instance with id and container.");
        }
        this.element = elementInstance; // Reference to the BaseUIElement instance
        this.responsiveConfig = elementInstance.responsiveConfig || {}; // Get config from element
        this.resizeObserver = null;
        this.viewportChangeHandler = this._handleViewportChange.bind(this); // Debounced handler
        this._resizeTimeout = null; // For debouncing
        console.log(`[ResponsiveHandler] Initialized for ${this.element.id}`);
    }

    /**
     * Initializes responsive features like resize observers.
     * Should be called from the element's init method.
     */
    init() {
        console.log(`[ResponsiveHandler ${this.element.id}] Initializing responsive features...`);
        // Use ResizeObserver if available for better performance
        if (window.ResizeObserver) {
            this.resizeObserver = new ResizeObserver(entries => {
                // We only observe one element (the container)
                if (entries[0]) {
                    this.viewportChangeHandler(); // Call debounced handler
                }
            });
            if (this.element.container) {
                this.resizeObserver.observe(this.element.container);
            } else {
                 console.warn(`[ResponsiveHandler ${this.element.id}] Container not available for ResizeObserver.`);
            }
        } else {
            // Fallback to window resize listener
            window.addEventListener('resize', this.viewportChangeHandler);
        }
        window.addEventListener('orientationchange', this.viewportChangeHandler);

        // Initial check
        this._handleViewportChange();
    }

    /**
     * Debounced handler for viewport size changes.
     * @private
     */
    _handleViewportChange() {
        // Simple debounce implementation
        if (this._resizeTimeout) {
            clearTimeout(this._resizeTimeout);
        }
        this._resizeTimeout = setTimeout(() => {
            this.applyResponsiveAdjustments();
            this._resizeTimeout = null;
        }, 100); // 100ms debounce
    }

    /**
     * Applies responsive adjustments based on current viewport and config.
     * This implementation is basic; subclasses or specific handlers might override.
     */
    applyResponsiveAdjustments() {
        if (!this.element.container) return;

        const viewportWidth = window.innerWidth;
        // const viewportHeight = window.innerHeight; // If needed

        // Example: Adjust scale based on viewport width (can be more complex)
        if (this.responsiveConfig.scalingMethod === 'viewport') {
            const baseWidth = 1920; // Design base width
            let scaleMultiplier = Math.min(1.5, Math.max(0.5, viewportWidth / baseWidth)); // Basic scaling

            // Apply min/max scale limits from config
            scaleMultiplier = Math.max(this.responsiveConfig.minScale || 0.5, Math.min(this.responsiveConfig.maxScale || 3.0, scaleMultiplier));

            // TODO: How to integrate this with the element's actual scale state?
            // Avoid directly setting style here as it conflicts with StyleHandler.
            // Maybe set a CSS variable or publish an event?
            // For now, just log the calculated multiplier.
            // console.log(`[ResponsiveHandler ${this.element.id}] Calculated responsive scale multiplier: ${scaleMultiplier}`);
        }

        // Ensure element stays within viewport bounds
        this.ensureElementInViewport();
    }

    /**
     * Adjusts the element's position if it goes outside the viewport boundaries.
     */
    ensureElementInViewport() {
        if (!this.element.container) return;

        const rect = this.element.container.getBoundingClientRect();
        // Need access to StateManager or element's state update method
        const state = StateManager.getNestedValue(StateManager.getState(), this.element.statePath);
        if (!state || !state.position) return;

        let { x, y } = state.position; // Current percentage position
        let needsUpdate = false;

        // Rough check based on percentages
        const halfWidthPercent = (rect.width / 2 / window.innerWidth) * 100;
        const halfHeightPercent = (rect.height / 2 / window.innerHeight) * 100;

        if (x - halfWidthPercent < 0) { x = halfWidthPercent; needsUpdate = true; }
        if (x + halfWidthPercent > 100) { x = 100 - halfWidthPercent; needsUpdate = true; }
        if (y - halfHeightPercent < 0) { y = halfHeightPercent; needsUpdate = true; }
        if (y + halfHeightPercent > 100) { y = 100 - halfHeightPercent; needsUpdate = true; }

        // Clamp to avoid extreme edge cases
        x = Math.max(0, Math.min(100, x));
        y = Math.max(0, Math.min(100, y));

        if (needsUpdate) {
            console.log(`[ResponsiveHandler ${this.element.id}] Adjusting position to stay in viewport: (${x.toFixed(1)}%, ${y.toFixed(1)}%)`);
            // Call updateElementState via the stateBinding handler
            if (this.element.stateBinding && typeof this.element.stateBinding.updateElementState === 'function') {
                this.element.stateBinding.updateElementState({ position: { x, y } });
            } else {
                console.error(`[ResponsiveHandler ${this.element.id}] Cannot update state, element missing stateBinding or updateElementState method.`);
            }
        }
    }

    /**
     * Cleans up observers and listeners.
     */
    destroy() {
        console.log(`[ResponsiveHandler] Destroying for ${this.element.id}`);
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }
        window.removeEventListener('resize', this.viewportChangeHandler);
        window.removeEventListener('orientationchange', this.viewportChangeHandler);
        clearTimeout(this._resizeTimeout); // Clear debounce timer
        this.element = null; // Release reference
    }
}
