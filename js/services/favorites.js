/**
 * Favorites service for the Ambient Clock application
 * Manages saving, retrieving, and applying favorite background images
 */

import { getState, updateState } from '../state.js';
import { setBackgroundImage } from '../components/background.js';
import { preloadImage } from './unsplash.js';

// Maximum number of favorites allowed
const MAX_FAVORITES = 20;

// LocalStorage key for favorites
const FAVORITES_STORAGE_KEY = 'ambientClock_favorites';

/**
 * Gets all saved favorites from localStorage
 * @returns {Array} Array of favorite objects
 */
export function getFavorites() {
    try {
        const favoritesJson = localStorage.getItem(FAVORITES_STORAGE_KEY);
        return favoritesJson ? JSON.parse(favoritesJson) : [];
    } catch (error) {
        console.error('Error loading favorites:', error);
        return [];
    }
}

/**
 * Saves the favorites array to localStorage
 * @param {Array} favorites - Array of favorite objects to save
 */
function saveFavorites(favorites) {
    try {
        localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
    } catch (error) {
        console.error('Error saving favorites:', error);
    }
}

/**
 * Adds the current background image to favorites
 * @param {Object} imageData - Object containing image data (url, provider, category, etc.)
 * @returns {Object} Result object with success status and message
 */
export function addFavorite(imageData) {
    console.log("addFavorite called with data:", imageData);
    
    const favorites = getFavorites();
    console.log("Current favorites count:", favorites.length);
    
    // Check if we've reached the maximum number of favorites
    if (favorites.length >= MAX_FAVORITES) {
        console.warn(`Maximum of ${MAX_FAVORITES} favorites reached`);
        return {
            success: false,
            message: `Maximum of ${MAX_FAVORITES} favorites reached. Please remove some before adding more.`
        };
    }
    
    // Check if this image is already a favorite
    const isAlreadyFavorite = favorites.some(fav => fav.url === imageData.url);
    console.log("Is already a favorite:", isAlreadyFavorite);
    
    if (isAlreadyFavorite) {
        return {
            success: false,
            message: 'This image is already in your favorites.'
        };
    }
    
    // Create a new favorite object with all necessary data
    const newFavorite = {
        id: generateUniqueId(),
        url: imageData.url,
        thumbnailUrl: generateThumbnailUrl(imageData.url, imageData.provider),
        provider: imageData.provider || 'unknown',
        category: imageData.category || 'unknown',
        photographer: imageData.photographer || 'Unknown',
        photographerUrl: imageData.photographerUrl || '#',
        addedAt: Date.now()
    };
    
    console.log("New favorite object:", newFavorite);
    
    // Add to favorites array and save
    favorites.push(newFavorite);
    saveFavorites(favorites);
    
    return {
        success: true,
        message: 'Added to favorites successfully.',
        favorite: newFavorite
    };
}

/**
 * Removes a favorite by ID
 * @param {string} id - The ID of the favorite to remove
 * @returns {Object} Result object with success status and message
 */
export function removeFavorite(id) {
    const favorites = getFavorites();
    const initialLength = favorites.length;
    
    // Filter out the favorite with the matching ID
    const updatedFavorites = favorites.filter(fav => fav.id !== id);
    
    // Check if anything was removed
    if (updatedFavorites.length === initialLength) {
        return {
            success: false,
            message: 'Favorite not found.'
        };
    }
    
    // Save the updated favorites
    saveFavorites(updatedFavorites);
    
    return {
        success: true,
        message: 'Removed from favorites.'
    };
}

/**
 * Sets the background to a favorite image
 * @param {string} id - The ID of the favorite to apply
 * @returns {Promise<Object>} Promise resolving to result object with success status and message
 */
export async function setBackgroundFromFavorite(id) {
    const favorites = getFavorites();
    const favorite = favorites.find(fav => fav.id === id);
    
    if (!favorite) {
        return {
            success: false,
            message: 'Favorite not found.'
        };
    }
    
    try {
        // Preload the image
        await preloadImage(favorite.url);
        
        // Set as background
        setBackgroundImage(favorite.url);
        
        // Update state with the current image metadata
        updateState({
            currentImageMetadata: {
                url: favorite.url,
                provider: favorite.provider,
                category: favorite.category,
                photographer: favorite.photographer,
                photographerUrl: favorite.photographerUrl,
                isFavorite: true
            }
        }, false, true);
        
        return {
            success: true,
            message: 'Background set from favorite.'
        };
    } catch (error) {
        console.error('Error setting background from favorite:', error);
        return {
            success: false,
            message: 'Error setting background from favorite.'
        };
    }
}

/**
 * Checks if the current background image is a favorite
 * @returns {boolean} True if current image is a favorite
 */
export function isCurrentImageFavorite() {
    const state = getState();
    const currentImageUrl = state.backgroundImageUrl || 
                          (state.currentImageMetadata && state.currentImageMetadata.url);
    
    if (!currentImageUrl) return false;
    
    const favorites = getFavorites();
    return favorites.some(fav => fav.url === currentImageUrl);
}

/**
 * Gets the favorite object for the current image if it exists
 * @returns {Object|null} The favorite object or null if not a favorite
 */
export function getCurrentImageFavorite() {
    const state = getState();
    const currentImageUrl = state.backgroundImageUrl || 
                          (state.currentImageMetadata && state.currentImageMetadata.url);
    
    if (!currentImageUrl) return null;
    
    const favorites = getFavorites();
    return favorites.find(fav => fav.url === currentImageUrl) || null;
}

/**
 * Toggles favorite status of the current image
 * @returns {Promise<Object>} Promise resolving to result object with success status and message
 */
export async function toggleCurrentImageFavorite() {
    console.log("toggleCurrentImageFavorite called");
    
    const state = getState();
    let currentImageMetadata = state.currentImageMetadata;
    
    console.log("Current image metadata:", currentImageMetadata);
    
    // If currentImageMetadata is not set, try to create it from backgroundImageUrl
    if (!currentImageMetadata || !currentImageMetadata.url) {
        const backgroundImageUrl = state.backgroundImageUrl;
        
        if (backgroundImageUrl) {
            console.log("Creating metadata from backgroundImageUrl:", backgroundImageUrl);
            
            // Create a basic metadata object
            currentImageMetadata = {
                url: backgroundImageUrl,
                provider: state.imageSource || 'unsplash',
                category: state.category || 'Nature',
                photographer: 'Unknown',
                photographerUrl: '#',
                isFavorite: false
            };
            
            // Update the state with the new metadata
            updateState({
                currentImageMetadata: currentImageMetadata
            }, false, true);
            
            console.log("Created currentImageMetadata:", currentImageMetadata);
        } else {
            console.error("No current image metadata or URL");
            return {
                success: false,
                message: 'No current image to favorite.'
            };
        }
    }
    
    // Check if already a favorite
    const isFavorite = isCurrentImageFavorite();
    console.log("Is current image already a favorite:", isFavorite);
    
    if (isFavorite) {
        // Get the favorite object
        const favorite = getCurrentImageFavorite();
        if (!favorite) {
            console.error("Could not find favorite object to remove");
            return {
                success: false,
                message: 'Error finding favorite to remove.'
            };
        }
        
        // Remove from favorites
        const result = removeFavorite(favorite.id);
        console.log("Remove favorite result:", result);
        
        // Update state to reflect the change
        if (result.success) {
            updateState({
                currentImageMetadata: {
                    ...currentImageMetadata,
                    isFavorite: false
                }
            }, false, true);
        }
        
        return result;
    } else {
        // Add to favorites
        const result = addFavorite(currentImageMetadata);
        console.log("Add favorite result:", result);
        
        // Update state to reflect the change
        if (result.success) {
            updateState({
                currentImageMetadata: {
                    ...currentImageMetadata,
                    isFavorite: true
                }
            }, false, true);
        }
        
        return result;
    }
}

/**
 * Generates a unique ID for a favorite
 * @returns {string} A unique ID
 */
function generateUniqueId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

/**
 * Generates a thumbnail URL from a full image URL
 * @param {string} url - The full image URL
 * @param {string} provider - The image provider (unsplash or pexels)
 * @returns {string} The thumbnail URL
 */
function generateThumbnailUrl(url, provider) {
    if (provider === 'unsplash') {
        // Unsplash allows resizing via URL parameters
        return url.replace(/&w=\d+/g, '&w=200').replace(/&h=\d+/g, '&h=150');
    } else if (provider === 'pexels') {
        // Pexels also allows resizing via URL parameters
        return url.replace(/&w=\d+/g, '&w=200').replace(/&h=\d+/g, '&h=150');
    }
    
    // Default fallback - just return the original URL
    return url;
}

/**
 * Gets the count of saved favorites
 * @returns {number} The number of saved favorites
 */
export function getFavoritesCount() {
    return getFavorites().length;
}

/**
 * Clears all favorites
 * @returns {Object} Result object with success status and message
 */
export function clearAllFavorites() {
    try {
        localStorage.removeItem(FAVORITES_STORAGE_KEY);
        return {
            success: true,
            message: 'All favorites cleared.'
        };
    } catch (error) {
        console.error('Error clearing favorites:', error);
        return {
            success: false,
            message: 'Error clearing favorites.'
        };
    }
}
