/**
 * Returns the default initial state structure for the application.
 * @returns {object} The default state object.
 */
export function getDefaultState() {
    return {
        settings: {
            theme: 'dark', // Example global setting
            background: {
                type: 'image', // 'image' or 'color' (future)
                query: 'nature',
                useFavoritesOnly: false, // Whether to use only favorites as background source
                provider: 'unsplash', // 'unsplash', 'pexels', 'peapix'
                color: '#000000', // Default background/overlay color
                overlayOpacity: 0.3,
                zoomEnabled: true,
                showInfo: true, // Added default for showing background info
                peapixCountry: 'us',
                cycleEnabled: true, // Whether to automatically cycle backgrounds
                cycleInterval: 300000, // Interval in milliseconds (e.g., 300000 = 5 minutes)
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
                position: { x: 50, y: 50 },
                scale: 1.4, // Moved scale outside options
                opacity: 1.0,
                effectStyle: 'raised', // Added element-level effect
                options: {
                    face: 'led', // Changed from 'digital'
                    timeFormat: '12',
                    showSeconds: true,
                    fontFamily: 'Segoe UI',
                    fontWeight: 'normal', // Added default
                    color: '#FFFFFF',
                    showSeparator: false, // Added default
                    charSpacing: 0.65, // Default character spacing in ch units
                    colonAdjustX: 0, // Renamed from colonAdjust
                    colonAdjustY: 0, // Default colon vertical adjustment (%) - Reverted to 0
                }
            },
            'date-default': {
                type: 'date',
                id: 'date-default',
                position: { x: 50, y: 80 },
                scale: 1.0, // Moved scale outside options
                opacity: 1.0,
                effectStyle: 'raised', // Added element-level effect
                options: {
                    format: 'Day, Month DD',
                    fontFamily: 'Segoe UI',
                    fontWeight: 'normal', // Added default
                    color: '#FFFFFF',
                    visible: true,
                    showSeparator: false, // Added separator option
                }
            },
            'controls-hint-default': {
                type: 'controls-hint',
                id: 'controls-hint-default',
                // No position, scale, opacity, or effectStyle needed for this element
                options: {
                    text: "Tap background for controls"
                }
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
                type: 'FavoriteToggleElement', // Use the class name directly for registration
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
}
