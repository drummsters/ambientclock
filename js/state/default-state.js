/**
 * Returns the default initial state structure for the application.
 * @returns {object} The default state object.
 */
export function getDefaultState() {
    const state = { // Define state object first
        settings: {
            theme: 'dark', // Example global setting
            background: {
                type: 'image', // 'image', 'color', or 'youtube'
                query: 'nature',
                useFavoritesOnly: false, // Whether to use only favorites as background source
                provider: 'peapix', // Default provider set to peapix
                color: '#000000', // Default background/overlay color
                overlayOpacity: 0.3,
                zoomEnabled: true,
                showInfo: true, // Added default for showing background info
                peapixCountry: 'us', // Default country set to US
                cycleEnabled: true, // Whether to automatically cycle backgrounds
                cycleInterval: 300000, // Interval in milliseconds (e.g., 300000 = 5 minutes)
                youtubeVideoId: '', // Default YouTube video ID (empty)
                youtubeQuality: 'auto', // Default YouTube quality ('auto' = 'Auto')
            },
            // effects: { // Keep commented out unless re-implemented
            //   style: 'raised',
            // },
            controls: {
                isOpen: false // Initially closed
            },
            debugModeEnabled: false // Controls logger verbosity
        },
        elements: {
            // Example initial elements (can be loaded from migration or defaults)
            'clock-default': {
                type: 'clock',
                id: 'clock-default',
                position: {
                  x: 50,
                  y: 50
                },
                scale: 1.4,
                opacity: 0.75,
                effectStyle: 'reflected',
                options: {
                  face: 'clean',
                  timeFormat: '12',
                  showSeconds: true,
                  fontFamily: 'Libre Baskerville',
                  fontWeight: 'normal',
                  color: '#ffffff',
                  showSeparator: true,
                  charSpacing: 0.89,
                  colonAdjustX: 0,
                  colonAdjustY: 0
                }
            },
            'date-default': {
                type: 'date',
                id: 'date-default',
                position: {
                  x: 50,
                  y: 40.39999999999999 // Note: Preserving the exact float from input
                },
                scale: 0.30000000000000016, // Note: Preserving the exact float from input
                opacity: 0.75,
                effectStyle: 'flat',
                options: {
                  format: 'Day, Month DD',
                  fontFamily: 'Libre Baskerville',
                  fontWeight: 'normal',
                  color: '#FFFFFF',
                  visible: true,
                  showSeparator: false
                }
            },
            'controls-hint-default': {
                type: 'controls-hint',
                id: 'controls-hint-default',
                // No position, scale, opacity, or effectStyle needed for this element
                // Text is now hardcoded in the element itself
                options: {} // Options object kept for consistency, but text removed
            },
            'background-info-default': {
                type: 'background-info',
                id: 'background-info-default',
                // No position, scale, opacity, or effectStyle needed for this element
                options: {} // No specific options needed initially
            },
            'donate-default': {
                type: 'donate',
                id: 'donate-default',
                // Fixed position, no options needed initially
                options: {}
            },
            'favorite-toggle-default': {
                type: 'favorite-toggle', // DOUBLE CHECK: This MUST be 'favorite-toggle'
                id: 'favorite-toggle-default',
                // Fixed position, visibility managed externally
                options: {} // No specific options needed
            },
            'next-background-button-default': {
                type: 'next-background-button',
                id: 'next-background-button-default',
                // Fixed position, no options needed initially
                options: {}
            },
            'fullscreen-toggle-default': {
                type: 'fullscreen-toggle',
                id: 'fullscreen-toggle-default',
                // Fixed position, visibility managed by the component
                options: {}
            },
            'control-panel-toggle-default': {
                type: 'control-panel-toggle',
                id: 'control-panel-toggle-default',
                // Fixed position, visibility managed by the component
                options: {}
            }
        },
        // Add other top-level state keys as needed (e.g., currentImageMetadata)
        currentImageMetadata: null // Placeholder for current background info
    };
    
    // console.log('[DefaultState] Returning default state. Favorite toggle type:', state.elements['favorite-toggle-default']?.type); // Removed log
    
    return state;
}
