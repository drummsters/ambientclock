// Removed VisibilityManager import as it's handled globally now
import { BaseUIElement } from '../base/base-ui-element.js';
import { EventBus } from '../../core/event-bus.js';
import { StateManager } from '../../core/state-manager.js';

/**
 * A dedicated button element to trigger the next background image.
 * Positioned fixed on the right side of the screen.
 * Uses VisibilityManager for hide/show behavior.
 * A dedicated button element to trigger the next background image.
 * Positioned fixed on the right side of the screen.
 * Visibility (opacity) is controlled by the global VisibilityManager.
 * Fundamental presence (.provider-active class) is controlled by state.
 */
export class NextBackgroundButtonElement extends BaseUIElement {
    constructor(config) {
        // Ensure a unique ID and the correct type
        super({ ...config, id: config.id || 'next-background-button', type: 'next-background-button' });
        // Removed visibilityManager and VISIBILITY_DELAY properties
        this.stateSubscription = null; // To store the unsubscribe function
        console.log(`[${this.constructor.name}] Initialized with ID: ${this.id}`);
    }

    /**
     * Binds the element to relevant state changes.
     * Specifically watches the background provider state.
     */
    bindToState() {
        // Unsubscribe from previous subscription if it exists
        this.stateSubscription?.unsubscribe();

        // Subscribe to changes in the background type
        const eventName = 'state:settings.background.type:changed';
        this.stateSubscription = EventBus.subscribe(eventName, (newType) => {
            console.log(`[${this.constructor.name} ${this.id}] Event received: ${eventName}. New type =`, newType);
            this.updateVisibilityBasedOnState(newType); // Pass the new type value
        });

        // Initial check based on current state type
        const initialType = StateManager.getNestedValue(StateManager.getState(), 'settings.background.type');
        console.log(`[${this.constructor.name} ${this.id}] Initial background type =`, initialType);
        this.updateVisibilityBasedOnState(initialType);
    }

    /**
     * Updates the button's fundamental visibility based on the background type state.
     * Adds/removes the '.provider-active' class. VisibilityManager controls '.visible' for opacity.
     * @param {string|null} type - The current background type ('image', 'color', etc.).
     */
    updateVisibilityBasedOnState(type) {
        if (!this.container) return;

        // Button should be active only if the type is 'image'
        const shouldBeActive = type === 'image';
        console.log(`[${this.constructor.name} ${this.id}] Background type is '${type}'. Should be active: ${shouldBeActive}`);

        if (shouldBeActive) {
            this.container.classList.add('provider-active');
            // VisibilityManager will handle adding/removing '.visible' for opacity changes
            console.log(`[${this.constructor.name} ${this.id}] Added 'provider-active' class. Current classes:`, this.container.className); // Added log
        } else {
            this.container.classList.remove('provider-active');
            // VisibilityManager handles removing '.visible'. Removing '.provider-active'
            // is enough to hide the element via CSS (visibility: hidden).
            console.log(`[${this.constructor.name} ${this.id}] Removed 'provider-active' class. Current classes:`, this.container.className); // Added log
        }
    }

    /**
     * Initializes the element. VisibilityManager is handled globally.
     * @returns {Promise<boolean>} True if initialization was successful.
     */
    async init() {
        const baseInitSuccess = await super.init(); // Call base init first
        if (!baseInitSuccess || !this.container) {
            console.error(`[${this.constructor.name} ${this.id}] Base init failed or container not found.`);
            return false;
        }

        // Removed VisibilityManager initialization - handled globally

        // Bind to state changes
        this.bindToState();

        console.log(`[${this.constructor.name} ${this.id}] Initialized. Visibility handled globally.`);
        return true;
    }

    /**
     * Overrides BaseUIElement.createContainer to create a <button> directly.
     * @returns {HTMLButtonElement} The created button element.
     */
    createContainer() {
        const button = document.createElement('button');
        button.id = this.id; // Use the instance ID assigned by ElementManager/State
        // Add base class and type-specific class
        button.className = `base-element next-background-button-element`;
        button.setAttribute('aria-label', 'Next Background Image');
        console.log(`[${this.constructor.name}] Container (<button>) created with ID: ${this.id}`);
        return button;
    }

    /**
     * Creates the specific child DOM elements (the SVG icon) inside the container.
     * This is called by BaseUIElement.init() after createContainer().
     * @returns {Promise<void>}
     */
    async createElements() {
        // Container is already the <button> created by createContainer()
        if (!this.container) return;

        // Use an embedded SVG icon - Removed stroke="currentColor" to rely solely on CSS
        this.container.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="feather feather-chevron-right">
                <polyline points="9 6 15 12 9 18"></polyline> <!-- Corrected points for right chevron -->
            </svg>
        `;
        console.log(`[${this.constructor.name}] Inner SVG added to container.`);
        // Store reference if needed, though not strictly necessary here
        this.elements.svgIcon = this.container.querySelector('svg');
    }

    /**
     * Adds the click listener to the button.
     */
    addEventListeners() {
        if (!this.container) return;

        this.container.addEventListener('click', this.handleClick.bind(this));
        console.log(`[${this.constructor.name}] Event listeners added.`);
    }

    /**
     * Handles the button click event.
     */
    handleClick() {
        console.log(`[${this.constructor.name}] Button clicked. Publishing background:refresh event.`);
        EventBus.publish('background:refresh');
    }

    /**
     * Cleans up event listeners.
     */
    destroy() {
        if (this.container) {
            this.container.removeEventListener('click', this.handleClick);
        }
        // Removed VisibilityManager cleanup

        // Unsubscribe from state changes
        this.stateSubscription?.unsubscribe();
        this.stateSubscription = null;

        console.log(`[${this.constructor.name}] Destroyed.`);
        super.destroy(); // Call base destroy
    }

    // Render method is not needed as the button content is static SVG
    render() {}
}
