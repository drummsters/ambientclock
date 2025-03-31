/**
 * Background Info component for the Ambient Clock application
 * Displays information about the current background image and allows favoriting
 */

import { getState, updateState, subscribe } from '../state.js';
import { getElement, showElement, hideElement, addEvent } from '../utils/dom.js';
import { VisibilityManager } from '../utils/visibility.js';
import { isCurrentImageFavorite, toggleCurrentImageFavorite } from '../services/favorites.js';
import { fetchNewBackground } from './background.js';

// DOM elements
let backgroundInfoContainer;
let favoriteToggle;
let favoriteIcon;
let favoriteText;
let nextBackgroundButton;

// Visibility manager for background info
let backgroundInfoVisibility;

// Constants
const BACKGROUND_INFO_HIDE_DELAY = 3000; // 3 seconds

/**
 * Initializes the background info component
 */
export function initBackgroundInfo() {
    // Create the background info container if it doesn't exist
    createBackgroundInfoElements();
    
    // Get DOM elements
    backgroundInfoContainer = getElement('background-info');
    favoriteToggle = getElement('favorite-toggle');
    favoriteIcon = getElement('favorite-icon');
    favoriteText = getElement('favorite-text');
    nextBackgroundButton = getElement('next-background');
    
    if (!backgroundInfoContainer) {
        console.error("Background info container not found");
        return;
    }
    
    // Initialize visibility manager
    backgroundInfoVisibility = new VisibilityManager(backgroundInfoContainer, BACKGROUND_INFO_HIDE_DELAY);
    
    // Set up event listeners
    setupEventListeners();
    
    // Subscribe to state changes
    subscribe(handleStateChange);
    
    // Add mouse move event listener to show background info
    document.addEventListener('mousemove', handleMouseMove);
    
    // Initial update based on current state
    updateBackgroundInfoFromState();
}

/**
 * Creates the background info elements and adds them to the DOM
 */
function createBackgroundInfoElements() {
    // Check if the container already exists
    if (document.getElementById('background-info')) {
        return;
    }
    
    // Create the container
    const container = document.createElement('div');
    container.id = 'background-info';
    container.className = 'background-info';
    
    // Create the HTML structure
    container.innerHTML = `
        <div class="background-actions">
            <button id="favorite-toggle" class="favorite-toggle" aria-label="Add to favorites">
                <span id="favorite-icon" class="heart-icon"></span>
                <span id="favorite-text">Add to Favorites</span>
            </button>
            <div class="navigation-buttons">
                <button id="next-background" class="nav-button" aria-label="Next background">▶</button>
            </div>
        </div>
    `;
    
    // Add to the document
    document.body.appendChild(container);
    
    // Add the CSS styles
    addBackgroundInfoStyles();
}

/**
 * Adds the CSS styles for the background info component
 */
function addBackgroundInfoStyles() {
    // Check if the styles already exist
    if (document.getElementById('background-info-styles')) {
        return;
    }
    
    // Create the style element
    const style = document.createElement('style');
    style.id = 'background-info-styles';
    
    // Add the CSS
    style.textContent = `
        .background-info {
            position: fixed;
            top: 15px;
            right: 15px;
            background-color: rgba(20, 20, 30, 0.7);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            padding: 12px 15px;
            border-radius: 8px;
            z-index: 200; /* Higher than controls and date */
            opacity: 0;
            transition: opacity 0.3s ease;
            pointer-events: none;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
            border: 1px solid rgba(255, 255, 255, 0.1);
            max-width: 400px;
            color: #FFFFFF;
            font-size: 14px;
        }
        
        .background-info.visible {
            opacity: 1;
            pointer-events: auto;
        }
        
        .background-actions {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 20px; /* Add more space between buttons */
        }
        
        .favorite-toggle {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 6px 10px;
            background-color: rgba(100, 150, 255, 0.3);
            border: none;
            border-radius: 5px;
            color: white;
            cursor: pointer;
            transition: all 0.2s ease;
            font-size: 12px;
        }
        
        .favorite-toggle:hover {
            background-color: rgba(100, 150, 255, 0.5);
            transform: translateY(-1px);
        }
        
        .favorite-toggle.favorited {
            background-color: rgba(231, 76, 60, 0.7);
        }
        
        .heart-icon {
            display: inline-block;
            width: 16px;
            height: 16px;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z'%3E%3C/path%3E%3C/svg%3E");
            background-size: contain;
            background-repeat: no-repeat;
            transform-origin: center;
        }
        
        .favorite-toggle.favorited .heart-icon {
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='white' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z'%3E%3C/path%3E%3C/svg%3E");
            animation: heartbeat 0.3s ease-in-out;
        }
        
        @keyframes heartbeat {
            0% { transform: scale(1); }
            50% { transform: scale(1.3); }
            100% { transform: scale(1); }
        }
        
        .navigation-buttons {
            display: flex;
            gap: 8px;
        }
        
        .nav-button {
            width: 30px;
            height: 30px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            background-color: rgba(255, 255, 255, 0.15);
            border: none;
            color: white;
            cursor: pointer;
            transition: all 0.2s ease;
            font-size: 12px;
        }
        
        .nav-button:hover {
            background-color: rgba(255, 255, 255, 0.25);
            transform: translateY(-1px);
        }
        
        /* Toast notification for favorite actions */
        .toast-notification {
            position: fixed;
            bottom: 20px;
            right: 20px;
            background-color: rgba(20, 20, 30, 0.9);
            color: white;
            padding: 10px 15px;
            border-radius: 5px;
            z-index: 1000;
            opacity: 0;
            transform: translateY(20px);
            transition: opacity 0.3s ease, transform 0.3s ease;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
            font-size: 14px;
        }
        
        .toast-notification.visible {
            opacity: 1;
            transform: translateY(0);
        }
    `;
    
    // Add to the document head
    document.head.appendChild(style);
}

/**
 * Sets up event listeners for the background info component
 */
function setupEventListeners() {
    // Favorite toggle button
    if (favoriteToggle) {
        addEvent(favoriteToggle, 'click', handleFavoriteToggle);
    }
    
    // Next background button
    if (nextBackgroundButton) {
        addEvent(nextBackgroundButton, 'click', handleNextBackground);
    }
    
    // Mouse enter/leave events for the container
    if (backgroundInfoContainer) {
        addEvent(backgroundInfoContainer, 'mouseenter', handleBackgroundInfoMouseEnter);
        addEvent(backgroundInfoContainer, 'mouseleave', handleBackgroundInfoMouseLeave);
    }
    
    // Keyboard shortcut for favoriting (F key)
    document.addEventListener('keydown', (event) => {
        if (event.key === 'f' || event.key === 'F') {
            // Only if not typing in an input field
            if (document.activeElement.tagName !== 'INPUT' && 
                document.activeElement.tagName !== 'TEXTAREA') {
                handleFavoriteToggle();
            }
        }
    });
}

/**
 * Handles mouse enter event on background info
 */
function handleBackgroundInfoMouseEnter() {
    // Ensure background info stays visible while mouse is over it
    if (backgroundInfoVisibility) {
        backgroundInfoVisibility.handleMouseEnter();
    }
}

/**
 * Handles mouse leave event on background info
 */
function handleBackgroundInfoMouseLeave() {
    // Start the auto-hide timer when mouse leaves
    if (backgroundInfoVisibility) {
        backgroundInfoVisibility.isHovering = false;
        backgroundInfoVisibility.startHideTimer(false);
    }
}

/**
 * Handles mouse move event to show background info
 * @param {MouseEvent} event - The mouse move event
 */
function handleMouseMove(event) {
    // Show background info when mouse moves
    showBackgroundInfo();
}

/**
 * Handles favorite toggle button click
 */
async function handleFavoriteToggle() {
    try {
        console.log("Favorite toggle button clicked");
        
        // Toggle favorite status
        const result = await toggleCurrentImageFavorite();
        console.log("Toggle result:", result);
        
        // Show toast notification
        showToast(result.message);
        
        // Update UI based on new favorite status
        updateFavoriteUI();
        
        // Render favorites in the favorites panel
        import('../components/favorites-panel.js').then(({ renderFavorites }) => {
            if (renderFavorites) {
                renderFavorites();
            }
        }).catch(err => {
            console.error("Error importing favorites-panel:", err);
        });
    } catch (error) {
        console.error("Error toggling favorite:", error);
        showToast("Error toggling favorite status");
    }
}

/**
 * Handles previous background button click
 */
function handlePrevBackground() {
    // Currently we don't have a way to go back to previous images
    // So we'll just fetch a new one
    fetchNewBackground();
    
    // Update the favorite UI after a longer delay to ensure the state is fully updated
    setTimeout(() => {
        // Force a check of the current image's favorite status
        import('../services/favorites.js').then(({ isCurrentImageFavorite }) => {
            const isFavorite = isCurrentImageFavorite();
            console.log("Prev button - checking if current image is favorite:", isFavorite);
            
            // Update the state to ensure it's in sync
            const state = getState();
            if (state.currentImageMetadata) {
                import('../state.js').then(({ updateState }) => {
                    updateState({
                        currentImageMetadata: {
                            ...state.currentImageMetadata,
                            isFavorite: isFavorite
                        }
                    }, false, true);
                    
                    // Now update the UI
                    updateFavoriteUI();
                });
            } else {
                // If no metadata, just update the UI
                updateFavoriteUI();
            }
        });
    }, 1000); // Increased delay to ensure image is loaded and state is updated
}

/**
 * Handles next background button click
 */
function handleNextBackground() {
    // Fetch a new background
    fetchNewBackground();
    
    // Update the favorite UI after a longer delay to ensure the state is fully updated
    setTimeout(() => {
        // Force a check of the current image's favorite status
        import('../services/favorites.js').then(({ isCurrentImageFavorite }) => {
            const isFavorite = isCurrentImageFavorite();
            console.log("Next button - checking if current image is favorite:", isFavorite);
            
            // Update the state to ensure it's in sync
            const state = getState();
            if (state.currentImageMetadata) {
                import('../state.js').then(({ updateState }) => {
                    updateState({
                        currentImageMetadata: {
                            ...state.currentImageMetadata,
                            isFavorite: isFavorite
                        }
                    }, false, true);
                    
                    // Now update the UI
                    updateFavoriteUI();
                });
            } else {
                // If no metadata, just update the UI
                updateFavoriteUI();
            }
        });
    }, 1000); // Increased delay to ensure image is loaded and state is updated
}

/**
 * Handles state changes
 * @param {Object} state - The current state
 */
function handleStateChange(state) {
    updateBackgroundInfoFromState();
}

/**
 * Updates the background info UI based on the current state
 */
function updateBackgroundInfoFromState() {
    const state = getState();
    const metadata = state.currentImageMetadata;
    
    if (!metadata) {
        return;
    }
    
    // Update favorite UI
    updateFavoriteUI();
}

/**
 * Updates the favorite button UI based on the current favorite status
 */
export function updateFavoriteUI() {
    if (!favoriteToggle || !favoriteIcon || !favoriteText) {
        return;
    }
    
    // Import directly to ensure we're using the latest version
    import('../services/favorites.js').then(({ isCurrentImageFavorite, getFavorites }) => {
        // Force a check of the current image's favorite status
        const isFavorite = isCurrentImageFavorite();
        console.log("Updating favorite UI, isFavorite:", isFavorite);
        
        // Get the current state
        const state = getState();
        const currentImageUrl = state.backgroundImageUrl || 
                              (state.currentImageMetadata && state.currentImageMetadata.url);
        
        // Double-check by directly comparing with favorites list
        const favorites = getFavorites();
        const isInFavorites = currentImageUrl && favorites.some(fav => fav.url === currentImageUrl);
        
        console.log("Double-check favorite status - URL:", currentImageUrl, "In favorites:", isInFavorites);
        
        // Use the most accurate status (direct check with favorites list)
        const finalIsFavorite = isInFavorites;
        
        // Update UI based on favorite status
        if (finalIsFavorite) {
            favoriteToggle.classList.add('favorited');
            favoriteText.textContent = 'Remove from Favorites';
        } else {
            favoriteToggle.classList.remove('favorited');
            favoriteText.textContent = 'Add to Favorites';
        }
        
        // If there's a mismatch between state and actual favorites, update the state
        if (state.currentImageMetadata && state.currentImageMetadata.isFavorite !== finalIsFavorite) {
            console.log("Fixing mismatch in favorite status - State:", 
                      state.currentImageMetadata.isFavorite, "Actual:", finalIsFavorite);
            
            import('../state.js').then(({ updateState }) => {
                updateState({
                    currentImageMetadata: {
                        ...state.currentImageMetadata,
                        isFavorite: finalIsFavorite
                    }
                }, false, true);
            }).catch(err => {
                console.error("Error importing state:", err);
            });
        }
    }).catch(err => {
        console.error("Error importing favorites:", err);
        
        // Fallback to direct function call if import fails
        const isFavorite = isCurrentImageFavorite();
        
        if (isFavorite) {
            favoriteToggle.classList.add('favorited');
            favoriteText.textContent = 'Remove from Favorites';
        } else {
            favoriteToggle.classList.remove('favorited');
            favoriteText.textContent = 'Add to Favorites';
        }
    });
}

/**
 * Shows the background info panel
 */
export function showBackgroundInfo() {
    if (!backgroundInfoVisibility) {
        return;
    }
    
    backgroundInfoVisibility.show();
    backgroundInfoVisibility.startHideTimer(false);
}

/**
 * Hides the background info panel
 */
export function hideBackgroundInfo() {
    if (!backgroundInfoVisibility) {
        return;
    }
    
    backgroundInfoVisibility.hide();
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
