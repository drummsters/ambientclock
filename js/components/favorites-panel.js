/**
 * Favorites Panel component for the Ambient Clock application
 * Manages the favorites tab in the control panel
 */

import { getElement, showElement, hideElement, addEvent } from '../utils/dom.js';
import { getFavorites, getFavoritesCount, removeFavorite, setBackgroundFromFavorite, clearAllFavorites } from '../services/favorites.js';

// DOM elements
let favoritesTab;
let favoritesContent;
let favoritesGrid;
let favoritesCount;
let clearFavoritesButton;

/**
 * Initializes the favorites panel component
 */
export function initFavoritesPanel() {
    // Create the favorites tab if it doesn't exist
    createFavoritesTab();
    
    // Get DOM elements
    favoritesTab = getElement('favorites-tab');
    favoritesContent = getElement('favorites-content');
    favoritesGrid = getElement('favorites-grid');
    favoritesCount = getElement('favorites-count');
    clearFavoritesButton = getElement('clear-favorites-button');
    
    if (!favoritesTab || !favoritesContent || !favoritesGrid) {
        console.error("Favorites panel elements not found");
        return;
    }
    
    // Set up event listeners
    setupEventListeners();
    
    // Initial render of favorites
    renderFavorites();
    
    // Add the CSS styles
    addFavoritesPanelStyles();
}

/**
 * Creates the favorites tab and adds it to the controls panel
 */
function createFavoritesTab() {
    // Check if the tab already exists
    if (document.getElementById('favorites-tab')) {
        return;
    }
    
    // Get the controls panel
    const controls = document.getElementById('controls');
    if (!controls) {
        console.error("Controls panel not found");
        return;
    }
    
    // Create the favorites tab
    const favoritesSection = document.createElement('div');
    favoritesSection.className = 'control-section';
    favoritesSection.id = 'favorites-tab';
    
    // Create the HTML structure
    favoritesSection.innerHTML = `
        <h3 class="section-title">Favorites</h3>
        <div id="favorites-content">
            <div class="favorites-header">
                <span id="favorites-count">0/20 favorites</span>
                <button id="clear-favorites-button" class="small-button">Clear All</button>
            </div>
            <div id="favorites-grid" class="favorites-grid"></div>
            <div class="favorites-empty-message">No favorites yet. Add some by clicking the heart icon when viewing a background you like.</div>
        </div>
    `;
    
    // Add to the controls panel (before the last section which is Settings)
    const settingsSection = controls.querySelector('.control-section:last-child');
    if (settingsSection) {
        controls.insertBefore(favoritesSection, settingsSection);
    } else {
        controls.appendChild(favoritesSection);
    }
}

/**
 * Adds the CSS styles for the favorites panel component
 */
function addFavoritesPanelStyles() {
    // Check if the styles already exist
    if (document.getElementById('favorites-panel-styles')) {
        return;
    }
    
    // Create the style element
    const style = document.createElement('style');
    style.id = 'favorites-panel-styles';
    
    // Add the CSS
    style.textContent = `
        .favorites-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }
        
        #favorites-count {
            font-size: 12px;
            opacity: 0.8;
        }
        
        .small-button {
            padding: 4px 8px;
            font-size: 12px;
            background-color: rgba(220, 53, 69, 0.3);
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            transition: all 0.2s ease;
        }
        
        .small-button:hover {
            background-color: rgba(220, 53, 69, 0.5);
        }
        
        .favorites-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
            margin-bottom: 10px;
            max-height: 300px;
            overflow-y: auto;
            padding-right: 5px;
        }
        
        .favorite-item {
            position: relative;
            width: 100%;
            padding-top: 75%; /* 4:3 aspect ratio */
            border-radius: 4px;
            overflow: hidden;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
            cursor: pointer;
            transition: transform 0.2s ease;
        }
        
        .favorite-item:hover {
            transform: translateY(-2px);
        }
        
        .favorite-thumbnail {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        
        .favorite-overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(to bottom, rgba(0, 0, 0, 0) 50%, rgba(0, 0, 0, 0.7) 100%);
            opacity: 0;
            transition: opacity 0.2s ease;
            padding: 8px;
        }
        
        .favorite-item:hover .favorite-overlay {
            opacity: 1;
        }
        
        .favorite-actions {
            position: absolute;
            top: 8px;
            right: 8px;
        }
        
        .favorite-action-button {
            background-color: rgba(255, 255, 255, 0.2);
            color: white;
            border: none;
            border-radius: 50%;
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: background-color 0.2s ease;
        }
        
        .favorite-action-button:hover {
            background-color: rgba(255, 255, 255, 0.4);
        }
        
        .remove-button {
            background-color: rgba(231, 76, 60, 0.7);
        }
        
        .remove-button:hover {
            background-color: rgba(231, 76, 60, 0.9);
        }
        
        .remove-icon {
            display: inline-block;
            font-size: 18px;
            font-weight: bold;
            line-height: 1;
            color: white;
        }
        
        .favorites-empty-message {
            text-align: center;
            padding: 20px 10px;
            color: rgba(255, 255, 255, 0.6);
            font-size: 13px;
            display: none;
        }
        
        /* Show empty message when there are no favorites */
        .favorites-grid:empty + .favorites-empty-message {
            display: block;
        }
    `;
    
    // Add to the document head
    document.head.appendChild(style);
}

/**
 * Sets up event listeners for the favorites panel component
 */
function setupEventListeners() {
    // Clear favorites button
    if (clearFavoritesButton) {
        addEvent(clearFavoritesButton, 'click', handleClearFavorites);
    }
}

/**
 * Handles clear favorites button click
 */
function handleClearFavorites() {
    if (confirm('Are you sure you want to clear all favorites?')) {
        clearAllFavorites();
        renderFavorites();
    }
}

/**
 * Renders the favorites grid
 */
export function renderFavorites() {
    if (!favoritesGrid || !favoritesCount) {
        return;
    }
    
    // Get all favorites
    const favorites = getFavorites();
    
    // Update favorites count
    favoritesCount.textContent = `${favorites.length}/20 favorites`;
    
    // Clear the grid
    favoritesGrid.innerHTML = '';
    
    // Add each favorite to the grid
    favorites.forEach(favorite => {
        const favoriteItem = document.createElement('div');
        favoriteItem.className = 'favorite-item';
        favoriteItem.dataset.id = favorite.id;
        
        // Create the HTML structure
        favoriteItem.innerHTML = `
            <img class="favorite-thumbnail" src="${favorite.thumbnailUrl}" alt="Favorite background">
            <div class="favorite-overlay">
                <div class="favorite-actions">
                    <button class="favorite-action-button remove-button" aria-label="Remove from favorites">
                        <span class="remove-icon">×</span>
                    </button>
                </div>
            </div>
        `;
        
        // Add event listeners
        const removeButton = favoriteItem.querySelector('.remove-button');
        
        if (removeButton) {
            addEvent(removeButton, 'click', (event) => {
                event.stopPropagation(); // Prevent item click
                handleRemoveFavorite(favorite.id);
            });
        }
        
        // Add click event to the whole item (also applies the favorite)
        addEvent(favoriteItem, 'click', () => {
            handleApplyFavorite(favorite.id);
        });
        
        // Add to the grid
        favoritesGrid.appendChild(favoriteItem);
    });
}

/**
 * Handles applying a favorite as the background
 * @param {string} id - The ID of the favorite to apply
 */
async function handleApplyFavorite(id) {
    try {
        const result = await setBackgroundFromFavorite(id);
        
        if (result.success) {
            // Show toast notification
            showToast(result.message);
        } else {
            console.error("Error applying favorite:", result.message);
            showToast("Error applying favorite");
        }
    } catch (error) {
        console.error("Error applying favorite:", error);
        showToast("Error applying favorite");
    }
}

/**
 * Handles removing a favorite
 * @param {string} id - The ID of the favorite to remove
 */
function handleRemoveFavorite(id) {
    try {
        const result = removeFavorite(id);
        
        if (result.success) {
            // Re-render the favorites grid
            renderFavorites();
            
            // Show toast notification
            showToast(result.message);
        } else {
            console.error("Error removing favorite:", result.message);
            showToast("Error removing favorite");
        }
    } catch (error) {
        console.error("Error removing favorite:", error);
        showToast("Error removing favorite");
    }
}

/**
 * Shows a toast notification with a message
 * @param {string} message - The message to show
 */
function showToast(message) {
    // Check if a toast already exists
    let toast = document.querySelector('.toast-notification');
    
    // Create a new toast if it doesn't exist
    if (!toast) {
        toast = document.createElement('div');
        toast.className = 'toast-notification';
        document.body.appendChild(toast);
    }
    
    // Set the message
    toast.textContent = message;
    
    // Show the toast
    setTimeout(() => {
        toast.classList.add('visible');
        
        // Hide the toast after 3 seconds
        setTimeout(() => {
            toast.classList.remove('visible');
        }, 3000);
    }, 10);
}
