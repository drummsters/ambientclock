/**
 * Peapix API service for fetching the latest Bing daily background image.
 */

// No API key needed for Peapix

// Debug mode flag - set to false to disable verbose logging
const DEBUG = false;

/**
 * Conditional logger that only logs when DEBUG is true
 * @param {...any} args - Arguments to log
 */
function debugLog(...args) {
    if (DEBUG) {
        console.log('[Peapix Service]', ...args);
    }
}

/**
 * Fetches the latest Bing image from the Peapix API for a specific country.
 * @param {string} countryCode - The 2-letter country code (e.g., 'us', 'jp'). Defaults to 'us'.
 * @returns {Promise<object>} A promise that resolves to an object containing image data.
 */
export async function fetchLatestImage(countryCode = 'us') {
    const baseUrl = 'https://peapix.com/bing/feed';
    const requestUrl = `${baseUrl}?country=${encodeURIComponent(countryCode)}`;

    debugLog(`Fetching Peapix image for country: ${countryCode}`);
    debugLog(`Request URL: ${requestUrl}`);

    try {
        const response = await fetch(requestUrl);
        if (!response.ok) {
            let errorMsg = `Peapix API error: ${response.status} ${response.statusText}.`;
            try {
                const errorData = await response.text();
                debugLog("Peapix API error details:", errorData);
                errorMsg += ` Details: ${errorData}`;
            } catch (textError) {
                debugLog("Could not read error response text:", textError);
            }
            console.error(errorMsg);
            throw new Error(`Peapix API error: ${response.status}`);
        }

        const data = await response.json();
        debugLog("Peapix API Response:", data);

        // Peapix returns an array, usually with one item
        if (Array.isArray(data) && data.length > 0) {
            const imageInfo = data[0];

            // Process the image data into a consistent format
            const imageData = {
                url: imageInfo.fullUrl, // Use the full resolution URL
                id: imageInfo.pageUrl.split('/').pop(), // Use last part of pageUrl as a pseudo-ID
                description: imageInfo.title || "Bing Daily Wallpaper",
                photographer: "Microsoft Bing", // Attribute to Bing
                photographerUrl: imageInfo.pageUrl || '#', // Link to Peapix page
                provider: 'peapix',
                category: `Bing Daily (${countryCode.toUpperCase()})`, // Indicate source and country
                originalUrl: imageInfo.pageUrl
            };

            // Update V1 state with the current image metadata
            // Use dynamic import to avoid circular dependencies if state.js imports this file
            import('../state.js').then(({ updateState }) => {
                const metadata = {
                    url: imageData.url,
                    provider: 'peapix',
                    category: imageData.category,
                    photographer: imageData.photographer,
                    photographerUrl: imageData.photographerUrl,
                    isFavorite: false // Will be updated by background-info component
                };
                debugLog("Setting currentImageMetadata in V1 state:", metadata);
                updateState({ currentImageMetadata: metadata }, false, true); // Don't save, notify=true
            }).catch(err => console.error("Error importing or updating state:", err));

            return imageData; // Return the processed data
        } else {
            console.error('[Peapix Service] Received empty or invalid data:', data);
            throw new Error('Received empty or invalid data from Peapix API');
        }

    } catch (error) {
        console.error("[Peapix Service] Failed to fetch or process background:", error);
        throw error; // Re-throw the error for the caller (background.js) to handle
    }
}

/**
 * Preloads an image and returns a promise that resolves when the image is loaded.
 * (Helper function, same as in unsplash.js)
 * @param {string} url - The image URL to preload
 * @returns {Promise<HTMLImageElement>} A promise that resolves to the loaded image
 */
export function preloadImage(url) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = (e) => reject(new Error(`Failed to load image: ${url}`));
        img.src = url;
    });
}
