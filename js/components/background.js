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

// Debug mode flag - set to false to disable verbose logging
const DEBUG = false;

/**
 * Conditional logger that only logs when DEBUG is true
 * @param {...any} args - Arguments to log
 */
function debugLog(...args) {
    if (DEBUG) {
        console.log(...args);
    }
}

/**
 * Initializes the background component
 */
export function initBackground() {
    // Get DOM elements
    backgroundContainer = getElement('background-container');
    overlay = getElement('overlay');
    
    debugLog("Background container:", backgroundContainer);
    debugLog("Overlay:", overlay);
    
    if (!backgroundContainer || !overlay) {
        console.error("Background elements not found");
        return;
    }
    
    // Subscribe to state changes
    subscribe(handleStateChange);
    
    // Initial setup based on current state
    const state = getState();
    debugLog("Initial state:", state);
    
    // Get overlay opacity from state (check both new and old state structure)
    const overlayOpacity = state.overlayOpacity || 
                          (state.background && state.background.overlayOpacity) || 
                          0.5;
    
    updateOverlayOpacity(overlayOpacity);
    
    // Initialize _prevCategory to prevent background from changing on first state change
    updateState({ _prevCategory: state.category }, false, true);
    
    // Get zoom enabled from state (check both new and old state structure)
    const zoomEnabled = state.zoomEnabled !== undefined ? state.zoomEnabled : 
                       (state.background && state.background.zoomEnabled !== undefined ? 
                        state.background.zoomEnabled : DEFAULT_ZOOM_ENABLED);
    
    // Initialize zoom effect if not already in state
    if (state.zoomEnabled === undefined && 
        (!state.background || state.background.zoomEnabled === undefined)) {
        updateState({
            background: {
                zoomEnabled: DEFAULT_ZOOM_ENABLED
            }
        }, false, true);
    }
    
    // Apply zoom effect based on state
    updateZoomEffect(zoomEnabled);
    
    // Start background cycling if needed, but don't force a new image on page load
    startBackgroundCycling(true, false);
}

/**
 * Handles state changes
 * @param {Object} state - The current state
 * @param {Object} prevState - The previous state (for comparison)
 */
function handleStateChange(state, prevState = {}) {
    // Update the overlay opacity based on the state (check both new and old state structure)
    // Only update if the opacity has actually changed to avoid resetting it unnecessarily
    const newOverlayOpacity = state.overlayOpacity || 
                             (state.background && state.background.overlayOpacity);
    const prevOverlayOpacity = prevState.overlayOpacity || 
                              (prevState.background && prevState.background.overlayOpacity);
    
    debugLog("State change - new opacity:", newOverlayOpacity, "prev opacity:", prevOverlayOpacity);
    
    // Only update if the opacity has changed or if it's explicitly defined in the new state
    if (newOverlayOpacity !== undefined && (newOverlayOpacity !== prevOverlayOpacity || prevOverlayOpacity === undefined)) {
        debugLog("Updating overlay opacity from state change to:", newOverlayOpacity);
        updateOverlayOpacity(newOverlayOpacity, false);
    }
    
    // Update zoom effect if it changed (check both new and old state structure)
    const newZoomEnabled = state.zoomEnabled !== undefined ? state.zoomEnabled : 
                          (state.background && state.background.zoomEnabled !== undefined ? 
                           state.background.zoomEnabled : null);
    
    const prevZoomEnabled = prevState.zoomEnabled !== undefined ? prevState.zoomEnabled : 
                           (prevState.background && prevState.background.zoomEnabled !== undefined ? 
                            prevState.background.zoomEnabled : null);
    
    if (newZoomEnabled !== null && prevZoomEnabled !== null && newZoomEnabled !== prevZoomEnabled) {
        updateZoomEffect(newZoomEnabled);
    }
    
    // Get the previous category from the state
    const prevCategory = state._prevCategory;
    
    // If category is 'None', set background color and stop cycling
    if (state.category === 'None') {
        const backgroundColor = state.backgroundColor || 
                               (state.background && state.background.backgroundColor) || 
                               '#000000';
        
        setBackgroundColor(backgroundColor, false);
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
        debugLog(`Image source changed from ${prevState.imageSource} to ${state.imageSource}`);
        
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
    debugLog("updateOverlayOpacity called with opacity:", opacity);
    
    // Ensure overlay and backgroundContainer are initialized
    if (!overlay || !backgroundContainer) {
        overlay = getElement('overlay');
        backgroundContainer = getElement('background-container');
        
        if (!overlay || !backgroundContainer) {
            console.error("Background elements not found in updateOverlayOpacity");
            return;
        }
    }
    
    // Clamp opacity between 0.0 and 1.0
    const clampedOpacity = Math.max(0.0, Math.min(1.0, opacity));
    debugLog("Clamped opacity:", clampedOpacity);

    // Get the current background color from state
    const state = getState();
    const backgroundColor = state.backgroundColor || (state.background && state.background.backgroundColor) || '#000000';
    debugLog("Background color:", backgroundColor);
    
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
    let overlayColor = `rgba(0, 0, 0, 1)`;
    
    // Try to parse the backgroundColor if it's a hex color
    if (backgroundColor && backgroundColor.match(/^#([0-9A-F]{3}){1,2}$/i)) {
        const { r, g, b } = hexToRgb(backgroundColor);
        overlayColor = `rgba(${r}, ${g}, ${b}, 1)`;
    }
    
    debugLog("Overlay color:", overlayColor);
    
    // Update the --overlay-color CSS variable with full opacity
    document.documentElement.style.setProperty('--overlay-color', overlayColor);
    
    // Invert the opacity value for the overlay
    // When slider is 0, overlay should be fully opaque (1.0)
    // When slider is 1, overlay should be fully transparent (0.0)
    const invertedOpacity = 1.0 - clampedOpacity;
    
    // Apply inverted opacity directly to the overlay element
    overlay.style.opacity = invertedOpacity;
    debugLog("Slider value:", clampedOpacity);
    debugLog("Set overlay.style.opacity to:", invertedOpacity);
    
    // Apply opacity directly to the background image
    updateStyle(backgroundContainer, {
        opacity: 1 // Reset opacity to full
    });

    // Update state only if flag is true
    if (updateStateFlag) {
        updateState({
            background: {
                overlayOpacity: clampedOpacity
            }
        });
    }
}

/**
 * Sets the background color (used when category is 'None')
 * @param {string} color - The color value (hex, rgb, etc.)
 * @param {boolean} [updateStateFlag=true] - Whether to update the state
 */
export function setBackgroundColor(color, updateStateFlag = true) {
    debugLog("Setting background color to:", color);
    
    // Ensure backgroundContainer is initialized
    if (!backgroundContainer) {
        backgroundContainer = getElement('background-container');
        if (!backgroundContainer) {
            console.error("Background container not found in setBackgroundColor");
            return;
        }
    }
    
    // Use direct style assignment instead of updateStyle
    backgroundContainer.style.backgroundImage = 'none';
    backgroundContainer.style.backgroundColor = color;
    backgroundContainer.style.opacity = '1'; // Reset opacity to full when using a solid color
    
    // Force a repaint
    backgroundContainer.offsetHeight;
    
    debugLog("Background color applied:", color);
    
    // Update state only if flag is true
    if (updateStateFlag) {
        updateState({
            background: {
                backgroundColor: color
            }
        });
    }
    
    // Update the overlay color to match the new background color
    // This ensures the overlay color changes when the background color changes
    const state = getState();
    const overlayOpacity = state.overlayOpacity || 
                          (state.background && state.background.overlayOpacity);
    
    // Only update the overlay opacity if it's explicitly defined in the state
    if (overlayOpacity !== undefined) {
        debugLog("Updating overlay opacity from setBackgroundColor to:", overlayOpacity);
        updateOverlayOpacity(overlayOpacity, false);
    }
}

/**
 * Sets the background image
 * @param {string} imageUrl - The image URL
 */
export function setBackgroundImage(imageUrl) {
    // Ensure backgroundContainer is initialized
    if (!backgroundContainer) {
        backgroundContainer = getElement('background-container');
        if (!backgroundContainer) {
            console.error("Background container not found in setBackgroundImage");
            return;
        }
    }
    
    updateStyle(backgroundContainer, {
        backgroundImage: `url(${imageUrl})`
    });
    
    // Store the image URL in the state for caching
    updateState({ backgroundImageUrl: imageUrl });
}

/**
 * Gets the appropriate image service based on the current state
 * @returns {Object} The image service to use
 */
function getImageService() {
    const { imageSource } = getState();
    const service = imageSource === 'pexels' ? pexelsService : unsplashService;
    
    // Log which service is being used
    debugLog(`Using image service: ${imageSource}`);
    debugLog(`Service methods available:`, Object.keys(service));
    
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
    debugLog(`Using ${imageSource} API for fetching background image`);
    
    try {
        debugLog(`Fetching image for category "${categoryToUse}" using ${imageSource} API...`);
        
        // Fetch image URL
        const imageUrl = await imageService.fetchRandomImage(categoryToUse);
        debugLog(`Successfully fetched image URL from ${imageSource}:`, imageUrl);
        
        // Preload image
        debugLog(`Preloading image from URL: ${imageUrl}`);
        await imageService.preloadImage(imageUrl);
        debugLog(`Successfully preloaded image`);
        
        // Set as background
        debugLog(`Setting background image to: ${imageUrl}`);
        setBackgroundImage(imageUrl);
        debugLog(`Background image set successfully`);
    } catch (error) {
        console.error(`Failed to fetch background from ${imageSource}:`, error);
        
        // Check if this is a rate limit error
        if (error.message && error.message.includes('rate limit exceeded')) {
            console.warn(`Rate limit exceeded for ${imageSource} API. Trying alternative API...`);
            
            try {
                // Switch to the alternative API
                if (imageSource === 'pexels') {
                    debugLog('Switching to Unsplash API due to Pexels rate limit...');
                    
                    // Temporarily switch to Unsplash
                    const unsplashUrl = await unsplashService.fetchRandomImage(categoryToUse);
                    await unsplashService.preloadImage(unsplashUrl);
                    setBackgroundImage(unsplashUrl);
                    
                    debugLog('Successfully fetched image from Unsplash as fallback');
                    return; // Exit early since we successfully got an image
                } else if (imageSource === 'unsplash') {
                    debugLog('Switching to Pexels API due to Unsplash rate limit...');
                    
                    // Temporarily switch to Pexels
                    const pexelsUrl = await pexelsService.fetchRandomImage(categoryToUse);
                    await pexelsService.preloadImage(pexelsUrl);
                    setBackgroundImage(pexelsUrl);
                    
                    debugLog('Successfully fetched image from Pexels as fallback');
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
            debugLog("Using cached background image:", backgroundImageUrl);
            
            // Apply the cached image directly without preloading again
            // This avoids unnecessary network requests and image loading
            setBackgroundImage(backgroundImageUrl);
        } else {
            // Fetch a new image
            debugLog("Fetching new background image (cached:", !!backgroundImageUrl, ", force:", forceNewImage, ")");
            fetchNewBackground();
        }
    }
    
    // Set interval for cycling
    if (BACKGROUND_CYCLE_INTERVAL > 0) {
        backgroundIntervalId = setInterval(() => fetchNewBackground(), BACKGROUND_CYCLE_INTERVAL);
        debugLog(`Background cycling started. Interval: ${BACKGROUND_CYCLE_INTERVAL / 1000}s`);
    } else {
        debugLog("Background cycling disabled (interval is zero or negative).");
    }
}

/**
 * Stops the background cycling
 */
export function stopBackgroundCycling() {
    if (backgroundIntervalId) {
        clearInterval(backgroundIntervalId);
        backgroundIntervalId = null;
        debugLog("Background cycling stopped");
    }
}

/**
 * Updates the zoom effect on the background
 * @param {boolean} enabled - Whether the zoom effect is enabled
 */
export function updateZoomEffect(enabled) {
    // Ensure backgroundContainer is initialized
    if (!backgroundContainer) {
        backgroundContainer = getElement('background-container');
        if (!backgroundContainer) {
            console.error("Background container not found in updateZoomEffect");
            return;
        }
    }
    
    if (enabled) {
        backgroundContainer.classList.add('zoom-effect');
        debugLog("Background zoom effect enabled");
    } else {
        backgroundContainer.classList.remove('zoom-effect');
        debugLog("Background zoom effect disabled");
    }
    
    // Update state using the new structure
    updateState({
        background: {
            zoomEnabled: enabled
        }
    }, false, true);
}

/**
 * Toggles the zoom effect on the background
 */
export function toggleZoomEffect() {
    const { zoomEnabled } = getState();
    updateZoomEffect(!zoomEnabled);
}
