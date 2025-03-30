/**
 * Unsplash API service for fetching background images
 */

import { UNSPLASH_ACCESS_KEY } from '../config.js';

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
 * Checks if we're within the rate limits for the Unsplash API
 * @returns {boolean} True if we can make a request, false if we should wait
 */
function checkRateLimit() {
    try {
        const storedLimit = localStorage.getItem('unsplashRateLimit');
        if (!storedLimit) {
            return true; // No stored limit, assume we can make a request
        }
        
        const rateLimit = JSON.parse(storedLimit);
        const now = Date.now();
        const timeSinceLastRequest = (now - rateLimit.timestamp) / 1000; // in seconds
        
        // Unsplash resets hourly, so convert to seconds (3600 seconds in an hour)
        const resetTime = 3600; 
        
        // If the reset time has passed, we can make a request
        if (timeSinceLastRequest >= resetTime) {
            return true;
        }
        
        // If we have remaining requests, we can make a request
        if (parseInt(rateLimit.remaining) > 0) {
            return true;
        }
        
        // Otherwise, we should wait
        const waitTime = resetTime - timeSinceLastRequest;
        console.warn(`RATE LIMIT EXCEEDED: Need to wait ${Math.ceil(waitTime)} more seconds before making another Unsplash API request.`);
        return false;
    } catch (e) {
        console.warn("Error checking rate limit:", e);
        return true; // If there's an error, assume we can make a request
    }
}

/**
 * Gets the current rate limit status
 * @returns {Object|null} The rate limit status or null if not available
 */
export function getRateLimitStatus() {
    try {
        const storedLimit = localStorage.getItem('unsplashRateLimit');
        if (!storedLimit) {
            return null;
        }
        
        const rateLimit = JSON.parse(storedLimit);
        const now = Date.now();
        const timeSinceLastRequest = (now - rateLimit.timestamp) / 1000; // in seconds
        
        // Unsplash resets hourly, so convert to seconds (3600 seconds in an hour)
        const resetTime = 3600;
        
        // Calculate time until reset
        const timeUntilReset = Math.max(0, resetTime - timeSinceLastRequest);
        
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

/**
 * Fetches a random image from Unsplash based on a category
 * @param {string} category - The category or search term for the image
 * @returns {Promise<string>} A promise that resolves to the image URL
 */
export async function fetchRandomImage(category) {
    // Check if API key is set
    if (!UNSPLASH_ACCESS_KEY || UNSPLASH_ACCESS_KEY === 'YOUR_UNSPLASH_ACCESS_KEY') {
        console.warn("Unsplash Access Key not set. Cannot fetch images.");
        throw new Error("Unsplash Access Key not configured");
    }
    
    // Check rate limit before making a request
    if (!checkRateLimit()) {
        throw new Error("Unsplash API rate limit exceeded. Please try again later.");
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

    const url = `https://api.unsplash.com/photos/random?query=${processedCategory}&orientation=landscape&client_id=${UNSPLASH_ACCESS_KEY}`;
    
    // Log the API request details
    debugLog("Unsplash API Request:");
    debugLog("- Original Category:", category);
    debugLog("- Processed Category:", processedCategory);
    debugLog("- Full URL:", url);

    try {
        debugLog("Sending API request to Unsplash...");
        const response = await fetch(url);
        if (!response.ok) {
            let errorMsg = `Unsplash API error: ${response.status} ${response.statusText}.`;
            if (response.status === 403) {
                errorMsg += " Check your Access Key and usage limits.";
            } else if (response.status === 401) {
                errorMsg += " Invalid Unsplash Access Key.";
            }
            
            // Try to get more error details from the response
            try {
                const errorData = await response.text();
                console.error("Unsplash API error details:", errorData);
                errorMsg += ` Details: ${errorData}`;
            } catch (textError) {
                console.error("Could not read error response text:", textError);
            }
            
            console.error(errorMsg);
            throw new Error(`Unsplash API error: ${response.status}`);
        }
        
        // Extract and log rate limit information from headers
        const rateLimit = {
            limit: response.headers.get('X-Ratelimit-Limit'),
            remaining: response.headers.get('X-Ratelimit-Remaining')
        };
        
        // Log rate limit information - keep this in regular console for monitoring
        console.log("Unsplash API Rate Limits:");
        console.log("- Limit:", rateLimit.limit, "requests per hour");
        console.log("- Remaining:", rateLimit.remaining, "requests");
        
        // Store rate limit information in localStorage for tracking
        try {
            localStorage.setItem('unsplashRateLimit', JSON.stringify({
                ...rateLimit,
                timestamp: Date.now()
            }));
        } catch (e) {
            console.warn("Could not store rate limit information:", e);
        }
        
        // Check if we're close to the rate limit
        if (rateLimit.remaining && parseInt(rateLimit.remaining) < 10) {
            console.warn(`RATE LIMIT WARNING: Only ${rateLimit.remaining} Unsplash API requests remaining!`);
        }
        
        const data = await response.json();
        
        // Log the API response details
        debugLog("Unsplash API Response:");
        debugLog("- Response Status:", response.status);
        debugLog("- Image ID:", data.id);
        debugLog("- Image Description:", data.description || data.alt_description || "No description");
        debugLog("- Image URLs:", data.urls);

        if (data.urls && data.urls.regular) {
            // Modify the URL to use the window's inner width for better quality
            const imageUrl = data.urls.regular.replace(/\&w.+/g, `&w=${window.innerWidth}`);
            // Keep attribution in regular console for legal compliance
            console.log(`Photo by ${data.user.name} on Unsplash: ${data.links.html}`); // Attribution
            debugLog("- Selected Image URL:", imageUrl);
            return imageUrl;
        } else {
            console.error("No image URL found in Unsplash response:", data);
            throw new Error("No image URL in response");
        }
    } catch (error) {
        console.error("Failed to fetch or process background:", error);
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
