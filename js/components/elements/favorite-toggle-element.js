import { BaseUIElement } from '../base/base-ui-element.js';
import { EventBus } from '../../core/event-bus.js';
// FavoritesService will be injected

/**
 * @class FavoriteToggleElement
 * @description UI element containing a heart icon button to toggle the favorite status of the current background image.
 * @extends BaseUIElement
 */
export class FavoriteToggleElement extends BaseUIElement {
    /**
     * Creates an instance of FavoriteToggleElement.
     * @param {object} params - Parameters object.
     * @param {string} params.id - The unique ID for this element.
     * @param {string} params.type - The type of the element ('FavoriteToggleElement').
     * @param {object} params.options - Configuration options (currently none specific).
     * @param {object} config - The configuration object passed from ComponentRegistry.
     * @param {FavoritesService} config.favoritesService - Instance of the FavoritesService (now a direct property).
     */
    constructor(config) { 
        super(config); // Pass full config to base

        // Check for the directly passed service on the config object
        if (!config.favoritesService) {
            // console.error("FavoriteToggleElement constructor config:", config); // Removed log
            throw new Error("FavoriteToggleElement requires a FavoritesService instance.");
        }
        this.favoritesService = config.favoritesService;

        this.toggleButton = null;
        this.iconSpan = null;
        this.boundHandleClick = this.handleFavoriteToggle.bind(this);
        this.boundUpdateUI = this.updateFavoriteUI.bind(this);
        this.unsubscribeState = null;
        this.unsubscribeKeyboard = null; // For 'F' key
        // console.log(`[FavoriteToggleElement ${this.id}] Initialized`); // Removed log
    }

    /**
     * @override
     * Initializes the element, creates DOM, sets up listeners.
     */
    async init() {
        // Use BaseUIElement's init which creates the container
        const success = await super.init();
        if (!success || !this.container) {
            console.error(`[FavoriteToggleElement ${this.id}] Base init failed or container missing.`);
            return false;
        }

        this.container.classList.add('favorite-toggle-element-container'); // Add a specific container class if needed for positioning/styling

        // Create the DOM elements
        this.createElements();

        // Add event listeners
        this.setupEventListeners();

        // Initial UI update
        this.updateFavoriteUI();

        return true;
    }

    /**
     * @override
     * Creates the DOM structure for the favorite toggle button.
     */
    async createElements() {
        if (!this.container) return;

        // Set initial aria-label and title
        const initialLabel = "Add to Favorites";
        this.container.innerHTML = `
            <button id="${this.id}-button" class="favorite-toggle" aria-label="${initialLabel}" title="${initialLabel}">
                <span id="${this.id}-icon" class="heart-icon"></span>
            </button>
        `;
        this.toggleButton = this.container.querySelector(`#${this.id}-button`);
        this.iconSpan = this.container.querySelector(`#${this.id}-icon`); // Though we style the button, might need the span later

        if (!this.toggleButton) {
            console.error(`[FavoriteToggleElement ${this.id}] Failed to create toggle button.`);
        }
    }

    /**
     * Sets up event listeners for button clicks and state changes.
     */
    setupEventListeners() {
        if (this.toggleButton) {
            this.toggleButton.addEventListener('click', this.boundHandleClick);
        }

        // Subscribe to state changes for the current image metadata
        this.unsubscribeState = EventBus.subscribe(
            'state:currentImageMetadata:changed',
            this.boundUpdateUI
        );

        // Subscribe to keyboard event for 'F' key (optional enhancement)
        this.unsubscribeKeyboard = EventBus.subscribe(
            'keyboard:favoriteTogglePressed',
             this.boundHandleClick // Reuse the same handler
        );

        // console.log(`[FavoriteToggleElement ${this.id}] Event listeners set up.`); // Removed log
    }

    /**
     * Handles the click event on the favorite toggle button or 'F' key press.
     */
    async handleFavoriteToggle() {
        // console.log(`[FavoriteToggleElement ${this.id}] handleFavoriteToggle called.`); // Removed log
        if (!this.favoritesService) return;

        try {
            const result = await this.favoritesService.toggleCurrentImageFavorite();
            // console.log(`[FavoriteToggleElement ${this.id}] Toggle result:`, result); // Removed log

            // Publish event for toast notification
            EventBus.publish('ui:showToast', { message: result.message });

            // Update UI immediately after toggle action
            this.updateFavoriteUI();

        } catch (error) {
            console.error(`[FavoriteToggleElement ${this.id}] Error toggling favorite:`, error);
            EventBus.publish('ui:showToast', { message: 'Error toggling favorite status' });
        }
    }

    /**
     * Updates the visual state (CSS class) of the toggle button based on favorite status.
     */
    updateFavoriteUI() {
        // console.log(`[FavoriteToggleElement ${this.id}] updateFavoriteUI called.`);
        if (!this.toggleButton || !this.favoritesService) {
            // console.log(`[FavoriteToggleElement ${this.id}] updateFavoriteUI skipped: Button or service missing.`);
            return;
        }

        const isFavorite = this.favoritesService.isCurrentImageFavorite();
        // console.log(`[FavoriteToggleElement ${this.id}] Current favorite status: ${isFavorite}`);

        const newLabel = isFavorite ? 'Remove from Favorites' : 'Add to Favorites';
        if (isFavorite) {
            this.toggleButton.classList.add('favorited');
        } else {
            this.toggleButton.classList.remove('favorited');
        }
        this.toggleButton.setAttribute('aria-label', newLabel);
        this.toggleButton.setAttribute('title', newLabel); // Also update title attribute
    }

    /**
     * @override
     * Cleans up event listeners and subscriptions.
     */
    destroy() {
        // console.log(`[FavoriteToggleElement ${this.id}] Destroying...`); // Removed log
        if (this.toggleButton) {
            this.toggleButton.removeEventListener('click', this.boundHandleClick);
        }

        if (typeof this.unsubscribeState === 'function') {
            this.unsubscribeState();
        }
        if (typeof this.unsubscribeKeyboard === 'function') {
            this.unsubscribeKeyboard();
        }
        this.unsubscribeState = null;
        this.unsubscribeKeyboard = null;

        // Call base destroy which removes the container
        super.destroy();

        this.toggleButton = null;
        this.iconSpan = null;
        this.favoritesService = null; // Release service reference
        // console.log(`[FavoriteToggleElement ${this.id}] Destroyed.`); // Removed log
    }
}

// Define the custom element for the browser
customElements.define('favorite-toggle-element', FavoriteToggleElement);
