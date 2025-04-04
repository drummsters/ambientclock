import { EventBus } from '../../../core/event-bus.js';
import { StateManager } from '../../../core/state-manager.js';

/**
 * Mixin/Helper class for handling state binding and updates for BaseUIElement.
 */
export class StateBindingMixin {
    /**
     * Creates an instance of StateBindingMixin.
     * @param {BaseUIElement} elementInstance - The BaseUIElement instance this mixin is attached to.
     */
    constructor(elementInstance) {
        if (!elementInstance || !elementInstance.id || !elementInstance.statePath) {
            throw new Error("StateBindingMixin requires a valid element instance with id and statePath.");
        }
        this.element = elementInstance; // Reference to the BaseUIElement instance
        this.statePath = elementInstance.statePath;
        this.unsubscribers = []; // Keep track of subscriptions specific to this mixin
        console.log(`[StateBindingMixin] Initialized for ${this.element.id}`);
    }

    /**
     * Subscribes the element to its relevant part of the global state via EventBus.
     * Also applies the initial state immediately by calling the element's updateFromState.
     */
    bindToState() {
        // Subscribe to changes for the entire element state object
        const eventName = `state:${this.statePath}:changed`;
        const subscription = EventBus.subscribe(eventName, (state) => {
            // console.log(`[${this.element.id} via Mixin] Event received: ${eventName}`, state);
            // Call the element's updateFromState method (which should remain on the element)
            if (typeof this.element.updateFromState === 'function') {
                this.element.updateFromState(state);
            } else {
                console.error(`[StateBindingMixin] Element ${this.element.id} is missing the updateFromState method.`);
            }
        });
        this.unsubscribers.push(subscription.unsubscribe);

        // Apply initial state directly after subscribing
        const initialState = StateManager.getNestedValue(StateManager.getState(), this.statePath);
        if (initialState) {
            // console.log(`[${this.element.id} via Mixin] Applying initial state:`, initialState);
            if (typeof this.element.updateFromState === 'function') {
                this.element.updateFromState(initialState);
            }
        } else {
            // console.log(`[${this.element.id} via Mixin] No initial state found at path: ${this.statePath}`);
            // Apply default options if no state exists
            if (typeof this.element.updateFromState === 'function') {
                this.element.updateFromState({ options: this.element.options }); // Apply constructor options
            }
            // Initial effect application should be handled by updateFromState or render
        }
    }

    /**
     * Updates a specific part of this element's state in the StateManager.
     * @param {object} changes - An object containing the state changes for this element.
     */
    updateElementState(changes) {
        const updatePayload = {
            elements: {
                [this.element.id]: changes
            }
        };
        StateManager.update(updatePayload);
    }

    /**
     * Cleans up state subscriptions.
     */
    destroy() {
        console.log(`[StateBindingMixin] Destroying subscriptions for ${this.element.id}`);
        this.unsubscribers.forEach(unsubscribe => unsubscribe());
        this.unsubscribers = [];
        this.element = null; // Release reference
    }
}
