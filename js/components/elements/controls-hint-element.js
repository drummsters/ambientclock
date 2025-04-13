import { BaseUIElement } from '../base/base-ui-element.js';
import { EventBus } from '../../core/event-bus.js';

/**
 * @class ControlsHintElement
 * @description Displays a hint for accessing the controls panel, mimicking V1 behavior.
 * @extends BaseUIElement
 */
export class ControlsHintElement extends BaseUIElement {
    constructor(config) { // Accept the whole config object
        super(config); // Pass the whole config object to the base constructor
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
         // Use text from options provided by StateManager/BaseUIElement
         this.container.innerHTML = `<p>${this.options.text}</p>`;

        // REMOVED: Click listener and handler

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

    // REMOVED: handleHintClick() method

    destroy() {
        // REMOVED: Click listener removal

        // Call base destroy
        super.destroy();
    }

    // Removed _onStateUpdate as it's no longer needed for visibility or text updates here
    // Text updates should be handled by the standard BaseUIElement logic if options change
}
