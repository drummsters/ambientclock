/**
 * Background component for the Ambient Clock application
 * Manages background images and overlay
 */

import { getState, updateState, subscribe } from '../state.js';
import * as unsplashService from '../services/unsplash.js';
import * as pexelsService from '../services/pexels.js';
import { getElement, updateStyle } from '../utils/dom.js';
import { BACKGROUND_CYCLE_INTERVAL, DEFAULT_ZOOM_ENABLED, ZOOM_ANIMATION_DURATION } from '../config.js';

// DOM elements
let backgroundContainer;
let overlay;

// Background cycling interval ID
let backgroundIntervalId = null;

/**
 * Initializes the background component
 */
export function initBackground() {
    // Get DOM elements
    backgroundContainer = getElement('background-container');
    overlay = getElement('overlay');
    
    console.log("Background container:", backgroundContainer);
    console.log("Overlay:", overlay);
    
    if (!backgroundContainer || !overlay) {
        console.error("Background elements not found");
        return;
    }
    
    // Subscribe to state changes
    subscribe(handleStateChange);
    
    // Initial setup based on current state
    const state = getState();
    console.log("Initial state:", state);
    updateOverlayOpacity(state.overlayOpacity);
    
    // Initialize _prevCategory to prevent background from changing on first state change
    updateState({ _prevCategory: state.category }, false, true);
    
    // Initialize zoom effect if not already in state
    if (state.zoomEnabled === undefined) {
        updateState({ zoomEnabled: DEFAULT_ZOOM_ENABLED }, false, true);
    }
    
    // Apply zoom effect based on state
    updateZoomEffect(state.zoomEnabled);
    
    // Start background cycling if needed, but don't force a new image on page load
    startBackgroundCycling(true, false);
}

/**
 * Handles state changes
 * @param {Object} state - The current state
 * @param {Object} prevState - The previous state (for comparison)
 */
function handleStateChange(state, prevState = {}) {
    // Update the overlay opacity based on the state
    updateOverlayOpacity(state.overlayOpacity, false);
    
    // Update zoom effect if it changed
    if (prevState.zoomEnabled !== undefined && state.zoomEnabled !== prevState.zoomEnabled) {
        updateZoomEffect(state.zoomEnabled);
    }
    
    // Get the previous category from the state
    const prevCategory = state._prevCategory;
    
    // If category is 'None', set background color and stop cycling
    if (state.category === 'None') {
        setBackgroundColor(state.backgroundColor, false);
        stopBackgroundCycling();
    } 
    // Only restart background cycling if the category has changed
    else if (prevCategory !== state.category && state.category !== undefined) {
        // Store the current category for future comparison
        // Use the third parameter to skip notifying subscribers to avoid infinite recursion
        updateState({ _prevCategory: state.category }, false, true);
        
        // Start background cycling with a new image, but force a new image since category changed
        startBackgroundCycling(true, true);
    }
    
    // If the image source has changed, clear the cached image URL and fetch a new image
    if (prevState.imageSource !== undefined && state.imageSource !== prevState.imageSource) {
        console.log(`Image source changed from ${prevState.imageSource} to ${state.imageSource}`);
        
        // Clear the cached image URL
        updateState({ backgroundImageUrl: null }, false, true);
        
        // Fetch a new image if the category is not 'None'
        if (state.category !== 'None') {
            startBackgroundCycling(true, true);
        }
    }
}

/**
 * Updates the background overlay opacity
 * @param {number} opacity - The new opacity value (0.0 to 1.0)
 * @param {boolean} [updateStateFlag=true] - Whether to update the state
 */
export function updateOverlayOpacity(opacity, updateStateFlag = true) {
    // Clamp opacity between 0.0 and 1.0
    const clampedOpacity = Math.max(0.0, Math.min(1.0, opacity));

    // Get the current background color from state
    const { backgroundColor } = getState();
    
    // Helper function to convert hex color to RGB components
    const hexToRgb = (hex) => {
        // Remove the # if present
        hex = hex.replace(/^#/, '');
        
        // Parse the hex values
        let r, g, b;
        if (hex.length === 3) {
            // Short notation (#RGB)
            r = parseInt(hex.charAt(0) + hex.charAt(0), 16);
            g = parseInt(hex.charAt(1) + hex.charAt(1), 16);
            b = parseInt(hex.charAt(2) + hex.charAt(2), 16);
        } else {
            // Full notation (#RRGGBB)
            r = parseInt(hex.substring(0, 2), 16);
            g = parseInt(hex.substring(2, 4), 16);
            b = parseInt(hex.substring(4, 6), 16);
        }
        
        return { r, g, b };
    };
    
    // Default to black if backgroundColor is not a valid hex color
    let overlayColor = `rgba(0, 0, 0, ${clampedOpacity})`;
    
    // Try to parse the backgroundColor if it's a hex color
    if (backgroundColor && backgroundColor.match(/^#([0-9A-F]{3}){1,2}$/i)) {
        const { r, g, b } = hexToRgb(backgroundColor);
        overlayColor = `rgba(${r}, ${g}, ${b}, ${clampedOpacity})`;
    }
    
    // Update the --overlay-color CSS variable
    document.documentElement.style.setProperty('--overlay-color', overlayColor);
    
    // Apply opacity directly to the background image
    if (backgroundContainer) {
        updateStyle(backgroundContainer, {
            opacity: 1 // Reset opacity to full
        });
    }

    // Update state only if flag is true
    if (updateStateFlag) {
        updateState({ overlayOpacity: clampedOpacity });
    }
}

/**
 * Sets the background color (used when category is 'None')
 * @param {string} color - The color value (hex, rgb, etc.)
 * @param {boolean} [updateStateFlag=true] - Whether to update the state
 */
export function setBackgroundColor(color, updateStateFlag = true) {
    console.log("Setting background color to:", color);
    console.log("Background container exists:", !!backgroundContainer);
    
    if (backgroundContainer) {
        // Use direct style assignment instead of updateStyle
        backgroundContainer.style.backgroundImage = 'none';
        backgroundContainer.style.backgroundColor = color;
        backgroundContainer.style.opacity = '1'; // Reset opacity to full when using a solid color
        
        // Force a repaint
        backgroundContainer.offsetHeight;
        
        console.log("Background color applied directly:", color);
        console.log("Current background-color:", backgroundContainer.style.backgroundColor);
    } else {
        console.error("Cannot set background color: backgroundContainer is null");
    }
    
    // Update state only if flag is true
    if (updateStateFlag) {
        updateState({ backgroundColor: color });
    }
    
    // Update the overlay color to match the new background color
    // This ensures the overlay color changes when the background color changes
    const { overlayOpacity } = getState();
    updateOverlayOpacity(overlayOpacity, false);
}

/**
 * Sets the background image
 * @param {string} imageUrl - The image URL
 */
export function setBackgroundImage(imageUrl) {
    if (backgroundContainer) {
        updateStyle(backgroundContainer, {
            backgroundImage: `url(${imageUrl})`
        });
        
        // Store the image URL in the state for caching
        updateState({ backgroundImageUrl: imageUrl });
    }
}

/**
 * Gets the appropriate image service based on the current state
 * @returns {Object} The image service to use
 */
function getImageService() {
    const { imageSource } = getState();
    const service = imageSource === 'pexels' ? pexelsService : unsplashService;
    
    // Log which service is being used
    console.log(`Using image service: ${imageSource}`);
    console.log(`Service methods available:`, Object.keys(service));
    
    return service;
}

/**
 * Fetches a new background image
 */
export async function fetchNewBackground() {
    const { category, customCategory, imageSource } = getState();
    
    // Handle "None" category specially
    if (category === 'None') {
        const { backgroundColor } = getState();
        setBackgroundColor(backgroundColor, false);
        return;
    }
    
    // Determine which category to use
    const categoryToUse = category === 'Custom' ? customCategory : category;
    
    if (!categoryToUse) {
        console.warn("No category selected for background");
        return;
    }
    
    // Get the appropriate image service
    const imageService = getImageService();
    console.log(`Using ${imageSource} API for fetching background image`);
    
    try {
        console.log(`Fetching image for category "${categoryToUse}" using ${imageSource} API...`);
        
        // Fetch image URL
        const imageUrl = await imageService.fetchRandomImage(categoryToUse);
        console.log(`Successfully fetched image URL from ${imageSource}:`, imageUrl);
        
        // Preload image
        console.log(`Preloading image from URL: ${imageUrl}`);
        await imageService.preloadImage(imageUrl);
        console.log(`Successfully preloaded image`);
        
        // Set as background
        console.log(`Setting background image to: ${imageUrl}`);
        setBackgroundImage(imageUrl);
        console.log(`Background image set successfully`);
    } catch (error) {
        console.error(`Failed to fetch background from ${imageSource}:`, error);
        console.error(`Error details:`, error.message);
        console.error(`Error stack:`, error.stack);
        
        // Check if this is a rate limit error
        if (error.message && error.message.includes('rate limit exceeded')) {
            console.warn(`Rate limit exceeded for ${imageSource} API. Trying alternative API...`);
            
            try {
                // Switch to the alternative API
                if (imageSource === 'pexels') {
                    console.log('Switching to Unsplash API due to Pexels rate limit...');
                    
                    // Temporarily switch to Unsplash
                    const unsplashUrl = await unsplashService.fetchRandomImage(categoryToUse);
                    await unsplashService.preloadImage(unsplashUrl);
                    setBackgroundImage(unsplashUrl);
                    
                    console.log('Successfully fetched image from Unsplash as fallback');
                    return; // Exit early since we successfully got an image
                } else if (imageSource === 'unsplash') {
                    console.log('Switching to Pexels API due to Unsplash rate limit...');
                    
                    // Temporarily switch to Pexels
                    const pexelsUrl = await pexelsService.fetchRandomImage(categoryToUse);
                    await pexelsService.preloadImage(pexelsUrl);
                    setBackgroundImage(pexelsUrl);
                    
                    console.log('Successfully fetched image from Pexels as fallback');
                    return; // Exit early since we successfully got an image
                }
            } catch (fallbackError) {
                console.error('Failed to fetch from fallback API:', fallbackError);
            }
        }
        
        // Set fallback background if all else fails
        if (backgroundContainer) {
            updateStyle(backgroundContainer, {
                backgroundImage: 'none',
                backgroundColor: '#3d3d3d'
            });
        }
        
        // If it's a 403 error, stop background cycling to prevent repeated API calls
        if (error.message && error.message.includes('403')) {
            console.warn(`Stopping background cycling due to ${imageSource} API error (403)`);
            stopBackgroundCycling();
            
            // Update category to 'None' to prevent further attempts
            updateState({ category: 'None' });
        }
    }
}

/**
 * Starts/restarts the background cycling
 * @param {boolean} fetchImmediately - Whether to fetch a new background immediately
 * @param {boolean} forceNewImage - Whether to force fetching a new image even if there's a cached one
 */
export function startBackgroundCycling(fetchImmediately = true, forceNewImage = false) {
    // Stop any existing interval
    stopBackgroundCycling();
    
    const { category, customCategory, backgroundImageUrl } = getState();
    
    // Handle "None" category specially
    if (category === 'None') {
        const { backgroundColor } = getState();
        setBackgroundColor(backgroundColor, false);
        return;
    }
    
    // Determine which category to use
    const categoryToUse = category === 'Custom' ? customCategory : category;
    
    if (!categoryToUse) {
        console.warn("No category selected for background cycling");
        return;
    }
    
    // Fetch immediately if requested
    if (fetchImmediately) {
        // Check if we have a cached image URL and we're not forcing a new image
        if (backgroundImageUrl && !forceNewImage) {
            console.log("CACHING: Using cached background image");
            console.log("- Cached URL:", backgroundImageUrl);
            console.log("- Force New Image:", forceNewImage);
            console.log("- Category:", categoryToUse);
            
            // Get the appropriate image service
            const imageService = getImageService();
            
            // Use the cached image
            imageService.preloadImage(backgroundImageUrl)
                .then(() => {
                    console.log("CACHING: Successfully loaded cached image");
                    setBackgroundImage(backgroundImageUrl);
                })
                .catch(error => {
                    console.error("CACHING: Failed to load cached image, fetching new one:", error);
                    fetchNewBackground();
                });
        } else {
            // Fetch a new image
            console.log("CACHING: Fetching new background image");
            console.log("- Has Cached URL:", !!backgroundImageUrl);
            console.log("- Force New Image:", forceNewImage);
            console.log("- Category:", categoryToUse);
            fetchNewBackground();
        }
    }
    
    // Set interval for cycling
    if (BACKGROUND_CYCLE_INTERVAL > 0) {
        backgroundIntervalId = setInterval(() => fetchNewBackground(), BACKGROUND_CYCLE_INTERVAL);
        console.log(`Background cycling started. Interval: ${BACKGROUND_CYCLE_INTERVAL / 1000}s`);
    } else {
        console.log("Background cycling disabled (interval is zero or negative).");
    }
}

/**
 * Stops the background cycling
 */
export function stopBackgroundCycling() {
    if (backgroundIntervalId) {
        clearInterval(backgroundIntervalId);
        backgroundIntervalId = null;
        console.log("Background cycling stopped");
    }
}

/**
 * Updates the zoom effect on the background
 * @param {boolean} enabled - Whether the zoom effect is enabled
 */
export function updateZoomEffect(enabled) {
    if (!backgroundContainer) return;
    
    if (enabled) {
        backgroundContainer.classList.add('zoom-effect');
        console.log("Background zoom effect enabled");
    } else {
        backgroundContainer.classList.remove('zoom-effect');
        console.log("Background zoom effect disabled");
    }
    
    // Update state
    updateState({ zoomEnabled: enabled }, false, true);
}

/**
 * Toggles the zoom effect on the background
 */
export function toggleZoomEffect() {
    const { zoomEnabled } = getState();
    updateZoomEffect(!zoomEnabled);
}
