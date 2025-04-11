import * as logger from '../../utils/logger.js'; // Corrected import path

// Custom error for rate limiting
class RateLimitError extends Error {
  constructor(message, resetTimestamp = null) {
    super(message);
    this.name = 'RateLimitError';
    this.resetTimestamp = resetTimestamp; // When the limit is expected to reset
  }
}

// Module-level state for rate limiting
let rateLimitRemaining = 50; // Default assumption for Unsplash free tier
let rateLimitResetTimestamp = 0; // Unix timestamp (ms) when the limit resets

/**
 * Updates the rate limit state based on API response headers.
 * IMPORTANT: Assumes the backend proxy forwards these headers from Unsplash.
 * @param {Headers} headers - The response headers object.
 */
function updateRateLimitState(headers) {
  const limit = headers.get('x-ratelimit-limit'); // Header names might be lowercase
  const remaining = headers.get('x-ratelimit-remaining');
  // Unsplash doesn't provide a reset timestamp directly, only remaining/limit per hour.
  // We'll track our own reset time based on the first request in an hour.
  // For simplicity here, we'll just update remaining if the header exists.
  // A more robust implementation might track the hour window.

  if (remaining !== null) {
    const remainingNum = parseInt(remaining, 10);
    if (!isNaN(remainingNum)) {
      rateLimitRemaining = remainingNum;
      logger.debug(`[UnsplashProvider] Rate limit remaining updated: ${rateLimitRemaining}`);
      // If remaining is low, set a reset time estimate (e.g., 1 hour from now)
      // This is a basic estimation.
      if (rateLimitRemaining <= 0) {
          rateLimitResetTimestamp = Date.now() + 3600 * 1000; // Estimate reset 1 hour from now
          logger.warn(`[UnsplashProvider] Rate limit potentially exceeded. Estimated reset: ${new Date(rateLimitResetTimestamp).toLocaleTimeString()}`);
      }
    }
  }
   // Log the limit if available
   if (limit !== null) {
    logger.debug(`[UnsplashProvider] Rate limit per hour: ${limit}`);
  }
}

/**
 * Checks if we are likely within the rate limit.
 * @returns {boolean} True if okay to proceed, false if rate limited.
 */
function checkRateLimit() {
  if (rateLimitRemaining > 0) {
    return true;
  }
  // Check if the estimated reset time has passed
  if (Date.now() >= rateLimitResetTimestamp) {
    rateLimitRemaining = 50; // Reset assumption
    rateLimitResetTimestamp = 0;
    logger.debug('[UnsplashProvider] Estimated rate limit reset time passed. Assuming reset.');
    return true;
  }

  logger.warn(`[UnsplashProvider] Rate limit likely exceeded. Remaining: ${rateLimitRemaining}. Estimated reset: ${new Date(rateLimitResetTimestamp).toLocaleTimeString()}`);
  return false;
}


/**
 * Image provider for fetching images from Unsplash.
 */
export class UnsplashProvider {
  /**
   * Creates an UnsplashProvider instance.
   * API key is handled by the backend proxy.
   */
  constructor() {
    // API key is no longer needed here
    this.baseUrl = '/api/unsplash'; // Point to our serverless function
    this.name = 'unsplash'; // Identifier for this provider
    this.requiresBackendKey = true; // Indicates backend API key setup is needed
    logger.debug('[UnsplashProvider] Initialized. Using backend proxy at:', this.baseUrl);
  }

  /**
   * Fetches a random image URL from Unsplash based on a category/query.
   * @param {string} query - The search query or category for the image.
   * @returns {Promise<object|null>} A promise that resolves to an object containing image details (url, author, etc.) or null if an error occurs.
   */
  async getImage(query = 'nature') {
    logger.debug(`[UnsplashProvider] getImage called for query: ${query}. Using getImageBatch(1).`);
    try {
        const batch = await this.getImageBatch(query, 1);
        return batch && batch.length > 0 ? batch[0] : null;
    } catch (error) {
        // Log the error but return null as per original getImage signature
        logger.error(`[UnsplashProvider] Error in getImage via getImageBatch:`, error);
        // If it was a rate limit error, the user might want to know
        if (error instanceof RateLimitError) {
            // Potentially re-throw or handle differently if needed upstream
        }
        return null;
    }
  }

  /**
   * Fetches a batch of random images from Unsplash based on a category/query.
   * @param {string} query - The search query or category for the images.
   * @param {number} [count=10] - The number of images to fetch (max handled by API/proxy).
   * @returns {Promise<Array<object>>} A promise that resolves to an array of image data objects.
   * @throws {RateLimitError} If the rate limit is exceeded.
   * @throws {Error} For other fetch or processing errors.
   */
  async getImageBatch(query = 'nature', count = 10) {
    // 1. Check Rate Limit
    if (!checkRateLimit()) {
      throw new RateLimitError('Unsplash API rate limit exceeded.', rateLimitResetTimestamp);
    }

    // 2. Prepare URL
    const orientation = window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
    const params = new URLSearchParams({
        query: query,
        orientation: orientation,
        count: count
    });
    const url = `${this.baseUrl}?${params.toString()}`;
    logger.debug(`[UnsplashProvider] Fetching batch of ${count} via proxy: ${url}`);

    // 3. Fetch Data
    try {
      const response = await fetch(url);

      // 4. Update Rate Limit State from Headers (even on errors if headers exist)
      // IMPORTANT: Assumes proxy forwards these headers!
      updateRateLimitState(response.headers);

      // 5. Handle HTTP Errors
      if (!response.ok) {
        let errorMsg = `Unsplash API error: ${response.status} ${response.statusText}`;
        // Check if it's a rate limit specific status code
        if (response.status === 403 || response.status === 429) {
            rateLimitRemaining = 0; // Assume limit hit
            rateLimitResetTimestamp = Date.now() + 3600 * 1000; // Estimate reset 1 hour
            logger.warn(`[UnsplashProvider] Received ${response.status}. Assuming rate limit hit.`);
            throw new RateLimitError(errorMsg, rateLimitResetTimestamp);
        }
        // Try to get more details for other errors
        try {
            const errorData = await response.json();
            if (errorData && errorData.errors) {
                errorMsg += ` - ${errorData.errors.join(', ')}`;
            }
        } catch (e) { /* Ignore JSON parsing error */ }
        logger.error(errorMsg);
        throw new Error(errorMsg); // Throw standard error for non-rate-limit issues
      }

      // 6. Process Successful Response
      const dataArray = await response.json();
      logger.debug(`[UnsplashProvider] Received batch data (${dataArray?.length || 0} items) via proxy.`);

      if (!Array.isArray(dataArray)) {
          logger.error('[UnsplashProvider] Invalid data received (not an array):', dataArray);
          return []; // Return empty array if data is not as expected
      }

      // 7. Map data to standard format
      return dataArray
        .map(data => {
          if (data && data.urls && data.urls.regular && data.user) {
            return {
              url: data.urls.regular,
              authorName: data.user.name || 'Unknown',
              authorUrl: data.user.links?.html || '#',
              source: this.name,
              // Add other relevant fields if needed later (e.g., id, description)
              // id: data.id,
              // description: data.description || data.alt_description
            };
          }
          return null; // Filter out invalid items
        })
        .filter(item => item !== null); // Remove nulls from the final array

    } catch (error) {
      // Log and re-throw errors (RateLimitError or standard Error)
      logger.error('[UnsplashProvider] Error fetching image batch:', error);
      // If it's not already a RateLimitError, wrap it? Or just re-throw.
      // Re-throwing allows the caller (ImageBackgroundHandler) to handle specific types.
      throw error;
    }
  }
}
