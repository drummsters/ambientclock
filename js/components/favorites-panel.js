/**
 * Favorites Panel component for the Ambient Clock application
 * Manages the favorites tab in the control panel
 */

import { getElement, showElement, hideElement, addEvent } from '../utils/dom.js';
import { getFavorites, getFavoritesCount, removeFavorite, setBackgroundFromFavorite, clearAllFavorites } from '../services/favorites.js';
import { getState } from '../state.js';

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
        
        .favorite-action-button.remove-button {
            background-color: rgba(255, 0, 0, 0.8) !important;
        }
        
        .favorite-action-button.remove-button:hover {
            background-color: rgba(255, 0, 0, 1) !important;
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
        // Get the current state
        const state = getState();
        const currentImageUrl = state.backgroundImageUrl || 
                              (state.currentImageMetadata && state.currentImageMetadata.url);
        
        // Check if the current background is a favorite before clearing
        import('../services/favorites.js').then(({ isCurrentImageFavorite, getFavorites }) => {
            const currentIsFavorite = isCurrentImageFavorite();
            console.log("Clearing favorites - Current image is favorite:", currentIsFavorite);
            
            // Double-check by directly comparing with favorites list
            const favorites = getFavorites();
            const isInFavorites = currentImageUrl && favorites.some(fav => fav.url === currentImageUrl);
            console.log("Double-check - Current image in favorites:", isInFavorites);
            
            // Store whether the current image was a favorite
            const wasAFavorite = currentIsFavorite || isInFavorites;
            
            // Clear all favorites
            clearAllFavorites();
            renderFavorites();
            
            // ALWAYS update the favorite UI after clearing favorites
            console.log("Updating favorite UI after clearing favorites");
            
            // Get the favorite toggle button directly
            const favoriteToggle = document.getElementById('favorite-toggle');
            const favoriteText = document.getElementById('favorite-text');
            
            if (favoriteToggle && favoriteText) {
                // If the current image was a favorite, update the UI directly
                if (wasAFavorite) {
                    console.log("DIRECT UPDATE: Current image was a favorite, updating UI");
                    favoriteToggle.classList.remove('favorited');
                    favoriteText.textContent = 'Add to Favorites';
                    
                    // Also update the state
                    if (state.currentImageMetadata) {
                        import('../state.js').then(({ updateState }) => {
                            updateState({
                                currentImageMetadata: {
                                    ...state.currentImageMetadata,
                                    isFavorite: false
                                }
                            }, false, true);
                        }).catch(err => {
                            console.error("Error importing state:", err);
                        });
                    }
                }
            }
            
            // Also use the standard updateFavoriteUI as a backup
            import('../components/background-info.js').then(({ updateFavoriteUI }) => {
                if (updateFavoriteUI) {
                    // Call updateFavoriteUI multiple times with delays to ensure it updates
                    updateFavoriteUI();
                    
                    // Call again after a short delay
                    setTimeout(() => {
                        updateFavoriteUI();
                    }, 100);
                    
                    // And again after a longer delay
                    setTimeout(() => {
                        updateFavoriteUI();
                    }, 500);
                }
            }).catch(err => {
                console.error("Error importing background-info:", err);
            });
        }).catch(err => {
            console.error("Error importing favorites:", err);
            
            // If import fails, still clear favorites and update UI
            clearAllFavorites();
            renderFavorites();
            
            // Get the favorite toggle button directly
            const favoriteToggle = document.getElementById('favorite-toggle');
            const favoriteText = document.getElementById('favorite-text');
            
            if (favoriteToggle && favoriteText) {
                // Force UI update to "Add to Favorites" since all favorites are cleared
                favoriteToggle.classList.remove('favorited');
                favoriteText.textContent = 'Add to Favorites';
            }
        });
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
            
            // Force update of the state to ensure isFavorite is set correctly
            import('../services/favorites.js').then(({ isCurrentImageFavorite }) => {
                const state = getState();
                if (state.currentImageMetadata) {
                    import('../state.js').then(({ updateState }) => {
                        // Always set isFavorite to true when applying a favorite
                        updateState({
                            currentImageMetadata: {
                                ...state.currentImageMetadata,
                                isFavorite: true
                            }
                        }, false, true);
                        
                        // Update the favorite UI in the background-info component
                        import('../components/background-info.js').then(({ updateFavoriteUI }) => {
                            if (updateFavoriteUI) {
                                updateFavoriteUI();
                            }
                        }).catch(err => {
                            console.error("Error importing background-info:", err);
                        });
                    }).catch(err => {
                        console.error("Error importing state:", err);
                    });
                } else {
                    // If no metadata, just update the UI
                    import('../components/background-info.js').then(({ updateFavoriteUI }) => {
                        if (updateFavoriteUI) {
                            updateFavoriteUI();
                        }
                    }).catch(err => {
                        console.error("Error importing background-info:", err);
                    });
                }
            }).catch(err => {
                console.error("Error importing favorites:", err);
                
                // If import fails, still update the UI
                import('../components/background-info.js').then(({ updateFavoriteUI }) => {
                    if (updateFavoriteUI) {
                        updateFavoriteUI();
                    }
                }).catch(err => {
                    console.error("Error importing background-info:", err);
                });
            });
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
        // Get the current state to check if the removed favorite is the current background
        const state = getState();
        const currentImageUrl = state.backgroundImageUrl || 
                              (state.currentImageMetadata && state.currentImageMetadata.url);
        
        // Get the favorite to be removed to check if it's the current background
        const favorites = getFavorites();
        const favoriteToRemove = favorites.find(fav => fav.id === id);
        
        if (!favoriteToRemove) {
            console.error("Favorite not found:", id);
            showToast("Error removing favorite");
            return;
        }
        
        // Check if the favorite being removed is the current background
        const isCurrentBackground = favoriteToRemove && currentImageUrl === favoriteToRemove.url;
        console.log("Removing favorite - Is current background:", isCurrentBackground);
        
        // Store the URL before removing (for direct comparison later)
        const removedUrl = favoriteToRemove.url;
        
        // Remove the favorite
        const result = removeFavorite(id);
        
        if (result.success) {
            // Re-render the favorites grid
            renderFavorites();
            
            // Show toast notification
            showToast(result.message);
            
            // ALWAYS update the favorite UI after removing a favorite
            // This ensures the UI is updated even if our detection logic fails
            console.log("Updating favorite UI after removing a favorite");
            
            // Get the favorite toggle button directly
            const favoriteToggle = document.getElementById('favorite-toggle');
            const favoriteText = document.getElementById('favorite-text');
            
            if (favoriteToggle && favoriteText) {
                // Direct check if the current background URL matches the removed favorite URL
                if (currentImageUrl === removedUrl) {
                    console.log("DIRECT MATCH: Current image was the removed favorite");
                    favoriteToggle.classList.remove('favorited');
                    favoriteText.textContent = 'Add to Favorites';
                    
                    // Also update the state
                    if (state.currentImageMetadata) {
                        import('../state.js').then(({ updateState }) => {
                            updateState({
                                currentImageMetadata: {
                                    ...state.currentImageMetadata,
                                    isFavorite: false
                                }
                            }, false, true);
                        }).catch(err => {
                            console.error("Error importing state:", err);
                        });
                    }
                }
            }
            
            // Also use the standard updateFavoriteUI as a backup
            import('../components/background-info.js').then(({ updateFavoriteUI }) => {
                if (updateFavoriteUI) {
                    // Call updateFavoriteUI multiple times with delays to ensure it updates
                    updateFavoriteUI();
                    
                    // Call again after a short delay
                    setTimeout(() => {
                        updateFavoriteUI();
                    }, 100);
                    
                    // And again after a longer delay
                    setTimeout(() => {
                        updateFavoriteUI();
                    }, 500);
                }
            }).catch(err => {
                console.error("Error importing background-info:", err);
            });
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
