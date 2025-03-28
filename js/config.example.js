/**
 * Configuration constants for the Ambient Clock application
 * 
 * IMPORTANT: Copy this file to config.js and replace the placeholder values with your own
 */

// API configuration
export const UNSPLASH_ACCESS_KEY = 'YOUR_UNSPLASH_API_KEY_HERE'; // Get your API key from https://unsplash.com/developers
export const PEXELS_API_KEY = 'YOUR_PEXELS_API_KEY_HERE'; // Get your API key from https://www.pexels.com/api/
export const DEFAULT_IMAGE_SOURCE = 'unsplash'; // Options: 'unsplash' or 'pexels'

// Timing configuration
export const BACKGROUND_CYCLE_INTERVAL = 10 * 60 * 1000; // 10 minutes in milliseconds
export const CONTROLS_HIDE_DELAY = 5000; // 5 seconds before controls auto-hide

// Appearance configuration
export const OPACITY_STEP = 0.1; // How much to change background overlay opacity with +/- keys
export const DEFAULT_OVERLAY_OPACITY = 0.3; // Initial background overlay dimness (0.0 to 1.0)
export const DEFAULT_CLOCK_OPACITY = 1.0; // Initial clock face opacity (1.0 = fully opaque)
export const DEFAULT_BACKGROUND_COLOR = '#1a1a1a'; // Default background color when None is selected

// Storage configuration
export const STORAGE_KEY = 'ambientClockSettings'; // Key for localStorage

// Clock positioning and sizing
export const POSITIONS = [
    { name: 'middle', style: { justifyContent: 'center', alignItems: 'center' } },
    { name: 'top-left', style: { justifyContent: 'flex-start', alignItems: 'flex-start', padding: '20px' } },
    { name: 'bottom-left', style: { justifyContent: 'flex-start', alignItems: 'flex-end', padding: '20px' } },
    { name: 'bottom-right', style: { justifyContent: 'flex-end', alignItems: 'flex-end', padding: '20px' } },
    { name: 'top-right', style: { justifyContent: 'flex-end', alignItems: 'flex-start', padding: '20px' } }
];
export const CUSTOM_POSITION_INDEX = 5; // Index for custom position (not in POSITIONS array)

// Clock sizing
export const MAX_SCALE = 1.4;
export const MIN_SCALE = 0.2; // Minimum 20% of original size
export const SCALE_STEP = 0.05; // 5% change per key press
