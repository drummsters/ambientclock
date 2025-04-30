import { BaseUIElement } from '../base/base-ui-element.js';
import { EventBus } from '../../core/event-bus.js';
import { StateManager } from '../../core/state-manager.js';
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

        if (!config.favoritesService) {
            throw new Error("FavoriteToggleElement requires a FavoritesService instance.");
        }
        this.favoritesService = config.favoritesService;

        this.toggleButton = null;
        this.iconSpan = null;
        
        // Define method references before binding
        this.handleFavoriteToggle = this.handleFavoriteToggle.bind(this);
        this.boundHandleClick = this.handleFavoriteToggle; // Store reference after binding
        this.boundUpdateUI = this.updateFavoriteUI.bind(this);
        this.boundLogEvent = this.logEvent ? this.logEvent.bind(this) : null;
        this.unsubscribeState = null;
        this.unsubscribeKeyboard = null; // For 'F' key
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
        // Also subscribe to background type changes
        this.unsubscribeBackground = EventBus.subscribe(
            'state:settings.background:changed',
            this.boundUpdateUI
        );

    }

    /**
     * Handles the click event on the favorite toggle button or 'F' key press.
     */
    async handleFavoriteToggle() {
        try {
            // Use the unified toggleFavorite method from FavoritesService
            const result = await this.favoritesService.toggleFavorite();
            
            if (result && result.message) {
                EventBus.publish('ui:showToast', { message: result.message });
            }
            
            // Update UI immediately based on the result
            if (result && typeof result.isFavorite === 'boolean') {
                // Update button class and attributes
                if (result.isFavorite) {
                    this.toggleButton.classList.add('favorited');
                } else {
                    this.toggleButton.classList.remove('favorited');
                }
                
                // Update aria-label and title
                const newLabel = result.isFavorite ? 'Remove from Favorites' : 'Add to Favorites';
                this.toggleButton.setAttribute('aria-label', newLabel);
                this.toggleButton.setAttribute('title', newLabel);
                
                // Log the result for debugging
                console.log(`[FavoriteToggleElement] Toggle result: isFavorite=${result.isFavorite}`);
            } else {
                // If result doesn't include isFavorite, fall back to updateFavoriteUI
                this.updateFavoriteUI();
            }
        } catch (error) {
            console.error(`[FavoriteToggleElement ${this.id}] Error toggling favorite:`, error);
            EventBus.publish('ui:showToast', { message: 'Error toggling favorite status' });
        }
    }

    /**
     * Updates the visual state (CSS class) of the toggle button based on favorite status.
     */
    updateFavoriteUI() {
        if (!this.toggleButton || !this.container) return;
        const state = window.StateManager?.getNestedValue(window.StateManager.getState(), 'settings.background') || {};
        const currentMetadata = StateManager.getState().currentImageMetadata;
        const type = state.type || 'image';
        let isFavorite = false;
        let newLabel = 'Add to Favorites';
        let canFavorite = false;

        console.debug(`[FavoriteToggleElement ${this.id}] updateFavoriteUI called. Background type: ${type}`);

        // Generic approach to check if the current item is a favorite
        if (type === 'youtube') {
            const videoId = state.youtubeVideoId;
            if (videoId) {
                // Create a URL that we can check against
                const itemUrl = `https://www.youtube.com/watch?v=${videoId}`;
                
                // Use a consistent approach to check if it's a favorite
                const favorites = this.favoritesService.getFavorites();
                const existingFavorite = favorites.find(fav => 
                    fav.type === 'youtube' && fav.url && fav.url.includes(videoId)
                );
                
                isFavorite = existingFavorite !== undefined;
                newLabel = isFavorite ? 'Remove from Favorites' : 'Add to Favorites';
                canFavorite = true;
                
                console.log(`[FavoriteToggleElement] YouTube video ${videoId} favorite status: ${isFavorite ? 'IS favorite' : 'NOT favorite'}`);
            } else {
                newLabel = 'No background to favorite';
                canFavorite = false;
            }
        } else if (type === 'image') {
            if (currentMetadata?.url) {
                // Use the same approach as for YouTube videos
                const favorites = this.favoritesService.getFavorites();
                const existingFavorite = favorites.find(fav => 
                    fav.type !== 'youtube' && fav.url === currentMetadata.url
                );
                
                isFavorite = existingFavorite !== undefined;
                newLabel = isFavorite ? 'Remove from Favorites' : 'Add to Favorites';
                canFavorite = true;
            } else {
                newLabel = 'No background to favorite';
                canFavorite = false;
            }
        } else {
            newLabel = 'No background to favorite';
            canFavorite = false;
        }

        // Update button class and attributes
        if (isFavorite) {
            this.toggleButton.classList.add('favorited');
        } else {
            this.toggleButton.classList.remove('favorited');
        }
        this.toggleButton.setAttribute('aria-label', newLabel);
        this.toggleButton.setAttribute('title', newLabel);

        // Make sure the element is visible when a background can be favorited
        if (canFavorite) {
            this.container.classList.add('visible');
        } else {
            this.container.classList.remove('visible');
        }
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
        if (typeof this.unsubscribeBackground === 'function') {
            this.unsubscribeBackground();
        }
        if (typeof this.unsubscribeKeyboard === 'function') {
            this.unsubscribeKeyboard();
        }
        this.unsubscribeState = null;
        this.unsubscribeBackground = null;
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
