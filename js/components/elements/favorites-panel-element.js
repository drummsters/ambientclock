import { BaseUIElement } from '../base/base-ui-element.js';
import { StateManager } from '../../core/state-manager.js';
import { EventBus } from '../../core/event-bus.js';
// Import FavoritesService later when needed for interaction
// import { FavoritesService } from '../../services/favorites-service.js';

/**
 * @class FavoritesPanelElement
 * @description Displays and manages saved favorite configurations.
 * @extends BaseUIElement
 */
export class FavoritesPanelElement extends BaseUIElement {
    constructor(config) { // Accept the whole config object
        super(config); // Pass the whole config object to the base constructor
        this.isOpen = false; // Internal state for panel visibility
        // Inject FavoritesService later if needed: constructor(config, favoritesService)
        // this.favoritesService = favoritesService;
    }

    /**
     * @override
     * Initializes the element, creates the DOM structure.
     */
    async init() {
        // Manual container creation for fixed element
        this.container = document.createElement('div');
        this.container.id = this.id;
        this.container.classList.add('favorites-panel-element');

        // Append to a designated area or body
        const targetContainer = document.getElementById('elements-container') || document.body;
        targetContainer.appendChild(this.container);

        this.container.innerHTML = `
            <button class="favorites-toggle-button">Favorites</button>
            <div class="favorites-content" style="display: none;">
                <h4>Saved Favorites</h4>
                <ul class="favorites-list">
                    <!-- Favorites will be listed here -->
                    <li>(No favorites saved yet)</li>
                </ul>
                <div class="favorites-actions">
                    <input type="text" class="favorite-name-input" placeholder="Favorite Name">
                    <button class="add-favorite-button">Save Current</button>
                </div>
            </div>
        `;

        // Add event listeners
        this.container.querySelector('.favorites-toggle-button').addEventListener('click', this.togglePanel.bind(this));
        this.container.querySelector('.add-favorite-button').addEventListener('click', this.addFavorite.bind(this));
        // Add listener for list clicks (delete/apply) later

        // Subscribe to favorite updates (implement later)
        // EventBus.subscribe('favorites:updated', this.renderFavoritesList.bind(this));

        // Initial render (placeholder)
        this.renderFavoritesList([]); // Pass empty array initially

        console.log(`[FavoritesPanelElement ${this.id}] Initialized.`);
        return true; // Signal success
    }

    /**
     * Toggles the visibility of the favorites panel content.
     */
    togglePanel() {
        this.isOpen = !this.isOpen;
        const content = this.container?.querySelector('.favorites-content');
        if (content) {
            content.style.display = this.isOpen ? 'block' : 'none';
        }
        console.log(`Favorites panel toggled: ${this.isOpen ? 'Open' : 'Closed'}`);
    }

    /**
     * Renders the list of favorites. (Placeholder)
     * @param {Array} favorites - The list of favorite objects.
     */
    renderFavoritesList(favorites) {
        const listElement = this.container?.querySelector('.favorites-list');
        if (!listElement) return;

        listElement.innerHTML = ''; // Clear existing list

        if (favorites.length === 0) {
            listElement.innerHTML = '<li>(No favorites saved yet)</li>';
            return;
        }

        // favorites.forEach(fav => {
        //     const item = document.createElement('li');
        //     item.innerHTML = `
        //         <span>${fav.name}</span>
        //         <button class="apply-favorite-button" data-id="${fav.id}">Apply</button>
        //         <button class="delete-favorite-button" data-id="${fav.id}">Delete</button>
        //     `;
        //     listElement.appendChild(item);
        // });

        // Add event listeners for apply/delete buttons later
    }

    /**
     * Handles adding the current state as a favorite. (Placeholder)
     */
    addFavorite() {
        const nameInput = this.container?.querySelector('.favorite-name-input');
        const name = nameInput ? nameInput.value.trim() : '';
        console.log(`Placeholder: Add favorite requested with name: "${name}"`);
        // Call favoritesService.addFavorite(name) later
        if (nameInput) nameInput.value = ''; // Clear input
    }

    /**
     * @override
     * Handles state updates (if needed for this element).
     */
    _onStateUpdate(changedPaths) {
        // This element might not directly react to general state changes,
        // but rather to specific 'favorites:updated' events.
    }

    /**
     * @override
     * Cleans up resources.
     */
    destroy() {
        // Remove event listeners
        const toggleButton = this.container?.querySelector('.favorites-toggle-button');
        if (toggleButton) toggleButton.removeEventListener('click', this.togglePanel);
        const addButton = this.container?.querySelector('.add-favorite-button');
        if (addButton) addButton.removeEventListener('click', this.addFavorite);
        // Remove list listeners later

        // Unsubscribe from events later

        // Remove element from DOM
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
        this.container = null;

        console.log(`[FavoritesPanelElement ${this.id}] Destroyed.`);
    }
}
