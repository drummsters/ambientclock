/**
 * Pexels API service for fetching background images
 */

import { PEXELS_API_KEY } from '../config.js';

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
 * Checks if we're within the rate limits for the Pexels API
 * @returns {boolean} True if we can make a request, false if we should wait
 */
function checkRateLimit() {
    try {
        const storedLimit = localStorage.getItem('pexelsRateLimit');
        if (!storedLimit) {
            return true; // No stored limit, assume we can make a request
        }
        
        const rateLimit = JSON.parse(storedLimit);
        const now = Date.now();
        const timeSinceLastRequest = (now - rateLimit.timestamp) / 1000; // in seconds
        
        // If the reset time has passed, we can make a request
        if (timeSinceLastRequest >= rateLimit.reset) {
            return true;
        }
        
        // If we have remaining requests, we can make a request
        if (parseInt(rateLimit.remaining) > 0) {
            return true;
        }
        
        // Otherwise, we should wait
        const waitTime = rateLimit.reset - timeSinceLastRequest;
        console.warn(`RATE LIMIT EXCEEDED: Need to wait ${Math.ceil(waitTime)} more seconds before making another Pexels API request.`);
        return false;
    } catch (e) {
        console.warn("Error checking rate limit:", e);
        return true; // If there's an error, assume we can make a request
    }
}

/**
 * Fetches a random image from Pexels based on a category
 * @param {string} category - The category or search term for the image
 * @returns {Promise<string>} A promise that resolves to the image URL
 */
export async function fetchRandomImage(category) {
    // Check if API key is set
    if (!PEXELS_API_KEY || PEXELS_API_KEY === 'YOUR_PEXELS_API_KEY') {
        console.warn("Pexels API Key not set. Cannot fetch images.");
        throw new Error("Pexels API Key not configured");
    }
    
    // Check rate limit before making a request
    if (!checkRateLimit()) {
        throw new Error("Pexels API rate limit exceeded. Please try again later.");
    }
    
    // Process the category string
    let processedCategory = category;
    
    // Check if the category contains multiple words (has spaces)
    if (processedCategory.includes(' ')) {
        // Replace spaces with plus signs for multi-word searches
        processedCategory = processedCategory.replace(/\s+/g, '+');
        debugLog("Multi-word search detected, formatted as:", processedCategory);
    } else {
        // Use standard URL encoding for single-word terms
        processedCategory = encodeURIComponent(processedCategory);
    }

    // Pexels API requires a different endpoint for search
    const url = `https://api.pexels.com/v1/search?query=${processedCategory}&orientation=landscape&per_page=10`;
    
    // Log the API request details
    debugLog("Pexels API Request:");
    debugLog("- Original Category:", category);
    debugLog("- Processed Category:", processedCategory);
    debugLog("- Full URL:", url);

    try {
        debugLog("Sending API request to Pexels...");
        const response = await fetch(url, {
            headers: {
                'Authorization': PEXELS_API_KEY
            }
        });
        
        if (!response.ok) {
            let errorMsg = `Pexels API error: ${response.status} ${response.statusText}.`;
            if (response.status === 403) {
                errorMsg += " Check your API Key and usage limits.";
            } else if (response.status === 401) {
                errorMsg += " Invalid Pexels API Key.";
            }
            
            // Try to get more error details from the response
            try {
                const errorData = await response.text();
                console.error("Pexels API error details:", errorData);
                errorMsg += ` Details: ${errorData}`;
            } catch (textError) {
                console.error("Could not read error response text:", textError);
            }
            
            console.error(errorMsg);
            throw new Error(`Pexels API error: ${response.status}`);
        }
        
        // Extract and log rate limit information from headers
        const rateLimit = {
            limit: response.headers.get('X-Ratelimit-Limit'),
            remaining: response.headers.get('X-Ratelimit-Remaining'),
            reset: response.headers.get('X-Ratelimit-Reset')
        };
        
        // Log rate limit information - keep this in regular console for monitoring
        console.log("Pexels API Rate Limits:");
        console.log("- Limit:", rateLimit.limit, "requests per hour");
        console.log("- Remaining:", rateLimit.remaining, "requests");
        console.log("- Reset in:", rateLimit.reset, "seconds");
        
        // Store rate limit information in localStorage for tracking
        try {
            localStorage.setItem('pexelsRateLimit', JSON.stringify({
                ...rateLimit,
                timestamp: Date.now()
            }));
        } catch (e) {
            console.warn("Could not store rate limit information:", e);
        }
        
        // Check if we're close to the rate limit
        if (rateLimit.remaining && parseInt(rateLimit.remaining) < 20) {
            console.warn(`RATE LIMIT WARNING: Only ${rateLimit.remaining} Pexels API requests remaining!`);
        }
        
        const data = await response.json();
        
        // Log the API response details
        debugLog("Pexels API Response:");
        debugLog("- Response Status:", response.status);
        debugLog("- Total Results:", data.total_results);
        
        // Check if we have photos in the response
        if (data.photos && data.photos.length > 0) {
            // Select a random photo from the results
            const randomIndex = Math.floor(Math.random() * data.photos.length);
            const photo = data.photos[randomIndex];
            
            debugLog("- Image ID:", photo.id);
            debugLog("- Photographer:", photo.photographer);
            debugLog("- Image URLs:", photo.src);
            debugLog("- Selected Index:", randomIndex, "of", data.photos.length);
            
            // Pexels provides multiple image sizes, we'll use the large one with improved quality
            const imageUrl = photo.src.large.replace(/\&w.+/g, '').replace(/\&h.+/g, `&h${window.innerWidth}`);
            debugLog("- Selected Image URL:", imageUrl);
            // Keep attribution in regular console for legal compliance
            console.log(`Photo by ${photo.photographer} on Pexels: ${photo.url}`); // Attribution
            
            return imageUrl;
        } else {
            console.error("No images found in Pexels response for category:", category);
            throw new Error("No images found for the given category");
        }
    } catch (error) {
        console.error("Failed to fetch or process background from Pexels:", error);
        throw error;
    }
}

/**
 * Preloads an image and returns a promise that resolves when the image is loaded
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

/**
 * Gets the current rate limit status
 * @returns {Object|null} The rate limit status or null if not available
 */
export function getRateLimitStatus() {
    try {
        const storedLimit = localStorage.getItem('pexelsRateLimit');
        if (!storedLimit) {
            return null;
        }
        
        const rateLimit = JSON.parse(storedLimit);
        const now = Date.now();
        const timeSinceLastRequest = (now - rateLimit.timestamp) / 1000; // in seconds
        
        // Calculate time until reset
        const timeUntilReset = Math.max(0, rateLimit.reset - timeSinceLastRequest);
        
        return {
            limit: rateLimit.limit,
            remaining: rateLimit.remaining,
            resetIn: Math.ceil(timeUntilReset),
            timestamp: new Date(rateLimit.timestamp).toLocaleString(),
            isLimited: parseInt(rateLimit.remaining) <= 0 && timeUntilReset > 0
        };
    } catch (e) {
        console.warn("Error getting rate limit status:", e);
        return null;
    }
}
