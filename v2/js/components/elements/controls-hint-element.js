import { BaseUIElement } from '../base/base-ui-element.js';
import { EventBus } from '../../core/event-bus.js';

/**
 * @class ControlsHintElement
 * @description Displays a hint for accessing the controls panel, mimicking V1 behavior.
 * @extends BaseUIElement
 */
export class ControlsHintElement extends BaseUIElement {
    constructor({ id, type, options }) { // Removed stateManager dependency
        super({ id, type, options });
        // Removed visibility state, timers, listeners array, and subscription property
    }

    /**
     * @override
     * Initializes the element, creates the DOM structure, and sets up initial state.
     */
    async init() {
        // Use BaseUIElement's init which creates the container
        const success = await super.init();
        if (!success || !this.container) {
            console.error(`[ControlsHintElement ${this.id}] Base init failed or container missing.`);
             return false;
         }

         this.container.classList.add('controls-hint-element');
         this.container.innerHTML = `<p>${this.options.text || "Press 'Space' or 'c' to toggle controls"}</p>`;

        // Add click listener to toggle controls
        this.hintClickHandler = this.handleHintClick.bind(this);
        this.container.addEventListener('click', this.hintClickHandler);

        // Removed all visibility logic, timers, state subscriptions, and mouse listeners

        return true;
    }

    /**
     * @override
     * Satisfies BaseUIElement requirement, but content is set in init.
     */
    async createElements() {
        // No dynamic elements needed, content set in init
    }

    // --- Event Handlers ---

    handleHintClick() {
        EventBus.publish('controls:toggle'); // Still use EventBus to request toggle
        // No need to hide hint here, visibility is managed externally
    }

    destroy() {
        // Remove the click listener
        if (this.container && this.hintClickHandler) {
            this.container.removeEventListener('click', this.hintClickHandler);
        }
        this.hintClickHandler = null;

        // Call base destroy
        super.destroy();
    }

    // Removed _onStateUpdate as it's no longer needed for visibility or text updates here
    // Text updates should be handled by the standard BaseUIElement logic if options change
}
