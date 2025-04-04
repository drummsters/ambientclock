import { EventBus } from '../../core/event-bus.js';
import { MAX_FAVORITES } from '../../services/favorites-service.js'; // Import MAX_FAVORITES
// FavoritesService will be injected

/**
 * @class FavoritesControls
 * @description Manages the "Favorites" section within the main Control Panel UI.
 *              Displays saved favorites, allows applying/removing them, and clearing all.
 */
export class FavoritesControls {
    /**
     * Creates an instance of FavoritesControls.
     * @param {HTMLElement} container - The container element for these controls.
     * @param {FavoritesService} favoritesService - Instance of the FavoritesService.
     * @param {object} options - Configuration options (currently none specific).
     */
    constructor(container, favoritesService, options = {}) {
        if (!container) {
            throw new Error("FavoritesControls requires a container element.");
        }
        if (!favoritesService) {
            throw new Error("FavoritesControls requires a FavoritesService instance.");
        }
        this.container = container;
        this.favoritesService = favoritesService;
        this.options = options;

        // DOM element references
        this.favoritesGrid = null;
        this.favoritesCountSpan = null;
        this.clearFavoritesButton = null;
        this.emptyMessageDiv = null;

        // Bound event handlers
        this.boundRenderGrid = this.renderFavoritesGrid.bind(this);
        this.boundHandleGridClick = this.handleGridClick.bind(this);
        this.boundHandleClearClick = this.handleClearClick.bind(this);

        // EventBus subscription
        this.unsubscribeFavoritesChanged = null;

        console.log('[FavoritesControls] Initialized');
    }

    /**
     * Sets up the DOM structure and event listeners for the favorites controls.
     */
    init() {
        this.createDOM();
        this.setupEventListeners();
        this.renderFavoritesGrid(); // Initial render
        console.log('[FavoritesControls] DOM created and initial grid rendered.');
    }

    /**
     * Creates the necessary DOM elements within the container, preserving existing content (like the title).
     */
    createDOM() {
        // Create elements to append, don't overwrite container's innerHTML
        const header = document.createElement('div');
        header.className = 'favorites-header';
        header.innerHTML = `
            <span class="favorites-count">0/20 favorites</span>
            <button class="clear-favorites-button small-button">Clear All</button>
        `;

        const grid = document.createElement('div');
        grid.className = 'favorites-grid';
        // Add placeholder comment for clarity
        grid.innerHTML = '<!-- Favorite items will be added here -->';

        const emptyMessage = document.createElement('div');
        emptyMessage.className = 'favorites-empty-message';
        emptyMessage.innerHTML = 'No favorites yet. Add some using the ♡ icon.';

        // Append new elements to the container
        this.container.appendChild(header);
        this.container.appendChild(grid);
        this.container.appendChild(emptyMessage);
        // Get references to the appended elements
        this.favoritesCountSpan = header.querySelector('.favorites-count');
        this.clearFavoritesButton = header.querySelector('.clear-favorites-button');
        this.favoritesGrid = grid; // Direct reference
        this.emptyMessageDiv = emptyMessage; // Direct reference

        if (!this.favoritesCountSpan || !this.clearFavoritesButton || !this.favoritesGrid || !this.emptyMessageDiv) {
            console.error('[FavoritesControls] Failed to create all necessary DOM elements.');
        }
    }

    /**
     * Sets up event listeners for the controls.
     */
    setupEventListeners() {
        if (this.favoritesGrid) {
            this.favoritesGrid.addEventListener('click', this.boundHandleGridClick);
        }
        if (this.clearFavoritesButton) {
            this.clearFavoritesButton.addEventListener('click', this.boundHandleClearClick);
        }

        // Listen for changes triggered by the service (e.g., adding/removing via toggle element)
        this.unsubscribeFavoritesChanged = EventBus.subscribe(
            'favorites:changed',
            this.boundRenderGrid // Re-render the grid when favorites change
        );
        console.log('[FavoritesControls] Event listeners set up.');
    }

    /**
     * Handles clicks within the favorites grid (applying or removing).
     * @param {Event} event - The click event.
     */
    handleGridClick(event) {
        const target = event.target;
        const favoriteItem = target.closest('.favorite-item');

        if (!favoriteItem) return; // Clicked outside an item

        const favoriteId = favoriteItem.dataset.id;
        if (!favoriteId) return;

        // Check if the remove button was clicked
        if (target.closest('.remove-button')) {
            console.log(`[FavoritesControls] Remove button clicked for ID: ${favoriteId}`);
            this.handleRemoveFavorite(favoriteId);
        } else {
            // Otherwise, assume the item itself was clicked to apply it
            console.log(`[FavoritesControls] Favorite item clicked for ID: ${favoriteId}`);
            this.handleApplyFavorite(favoriteId);
        }
    }

    /**
     * Handles the click on the "Clear All" button.
     */
    handleClearClick() {
        console.log('[FavoritesControls] Clear All button clicked.');
        if (confirm('Are you sure you want to clear all favorites? This cannot be undone.')) {
            const result = this.favoritesService.clearAllFavorites();
            EventBus.publish('ui:showToast', { message: result.message });
            // The 'favorites:changed' event published by clearAllFavorites will trigger re-render
        }
    }

    /**
     * Handles applying a favorite background.
     * @param {string} id - The ID of the favorite to apply.
     */
    async handleApplyFavorite(id) {
        try {
            const result = await this.favoritesService.setBackgroundFromFavorite(id);
            EventBus.publish('ui:showToast', { message: result.message });
            // Optionally close controls panel after applying?
            // EventBus.publish('controls:close');
        } catch (error) {
            console.error(`[FavoritesControls] Error applying favorite ID ${id}:`, error);
            EventBus.publish('ui:showToast', { message: 'Error applying favorite.' });
        }
    }

    /**
     * Handles removing a favorite from the grid.
     * @param {string} id - The ID of the favorite to remove.
     */
    handleRemoveFavorite(id) {
        try {
            // Use removeFavoriteById for precision
            const result = this.favoritesService.removeFavoriteById(id);
            EventBus.publish('ui:showToast', { message: result.message });
            // The 'favorites:changed' event published by removeFavoriteById will trigger re-render
        } catch (error) {
            console.error(`[FavoritesControls] Error removing favorite ID ${id}:`, error);
            EventBus.publish('ui:showToast', { message: 'Error removing favorite.' });
        }
    }

    /**
     * Fetches favorites from the service and renders them in the grid.
     */
    renderFavoritesGrid() {
        console.log('[FavoritesControls] Rendering favorites grid...');
        if (!this.favoritesGrid || !this.favoritesCountSpan || !this.emptyMessageDiv) {
            console.error('[FavoritesControls] Cannot render grid, elements missing.');
            return;
        }

        const favorites = this.favoritesService.getFavorites();
        const count = favorites.length;

        // Update count display
        this.favoritesCountSpan.textContent = `${count}/${MAX_FAVORITES} favorites`;

        // Clear previous grid content
        this.favoritesGrid.innerHTML = '';

        // Populate grid or show empty message
        if (count === 0) {
            this.emptyMessageDiv.style.display = 'block';
            this.favoritesGrid.style.display = 'none';
        } else {
            this.emptyMessageDiv.style.display = 'none';
            this.favoritesGrid.style.display = 'grid'; // Ensure grid is visible

            favorites.forEach(fav => {
                const item = document.createElement('div');
                item.className = 'favorite-item';
                item.dataset.id = fav.id;
                // Use thumbnailUrl if available, otherwise fall back to full url
                const thumb = fav.thumbnailUrl || fav.url;
                item.innerHTML = `
                    <img class="favorite-thumbnail" src="${thumb}" alt="Favorite background" loading="lazy">
                    <div class="favorite-overlay">
                        <div class="favorite-actions">
                            <button class="favorite-action-button remove-button" aria-label="Remove from favorites">
                                <span class="remove-icon">×</span>
                            </button>
                        </div>
                    </div>
                `;
                this.favoritesGrid.appendChild(item);
            });
        }
        console.log(`[FavoritesControls] Grid rendered with ${count} items.`);
    }

    /**
     * Cleans up event listeners and subscriptions.
     */
    destroy() {
        console.log('[FavoritesControls] Destroying...');
        if (this.favoritesGrid) {
            this.favoritesGrid.removeEventListener('click', this.boundHandleGridClick);
        }
        if (this.clearFavoritesButton) {
            this.clearFavoritesButton.removeEventListener('click', this.boundHandleClearClick);
        }

        if (typeof this.unsubscribeFavoritesChanged === 'function') {
            this.unsubscribeFavoritesChanged();
        }
        this.unsubscribeFavoritesChanged = null;

        // Clear DOM references
        this.container.innerHTML = ''; // Clear container content
        this.favoritesGrid = null;
        this.favoritesCountSpan = null;
        this.clearFavoritesButton = null;
        this.emptyMessageDiv = null;
        this.favoritesService = null; // Release service reference

        console.log('[FavoritesControls] Destroyed.');
    }
}
