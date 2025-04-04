import * as logger from '../../utils/logger.js'; // Corrected import path

// Custom error for rate limiting
class RateLimitError extends Error {
  constructor(message, resetTimestamp = null) {
    super(message);
    this.name = 'RateLimitError';
    this.resetTimestamp = resetTimestamp; // Unix timestamp (ms) when the limit resets
  }
}

// Module-level state for rate limiting (Pexels uses hourly limits)
let rateLimitRemaining = 200; // Default assumption for Pexels free tier (requests per hour)
let rateLimitResetTimestamp = 0; // Unix timestamp (ms) when the limit resets

/**
 * Updates the rate limit state based on Pexels API response headers.
 * IMPORTANT: Assumes the backend proxy forwards these headers.
 * @param {Headers} headers - The response headers object.
 */
function updateRateLimitState(headers) {
  const limit = headers.get('x-ratelimit-limit'); // Header names might be lowercase
  const remaining = headers.get('x-ratelimit-remaining');
  const reset = headers.get('x-ratelimit-reset'); // Pexels provides reset timestamp

  if (remaining !== null) {
    const remainingNum = parseInt(remaining, 10);
    if (!isNaN(remainingNum)) {
      rateLimitRemaining = remainingNum;
      logger.debug(`[PexelsProvider] Rate limit remaining updated: ${rateLimitRemaining}`);
    }
  }

  if (reset !== null) {
    const resetNum = parseInt(reset, 10);
    if (!isNaN(resetNum)) {
      // Convert Unix timestamp (seconds) to milliseconds
      rateLimitResetTimestamp = resetNum * 1000;
      logger.debug(`[PexelsProvider] Rate limit reset time updated: ${new Date(rateLimitResetTimestamp).toLocaleTimeString()}`);
    }
  }

  // Log the limit if available
  if (limit !== null) {
    logger.debug(`[PexelsProvider] Rate limit per hour: ${limit}`);
  }

  // Warn if remaining is low
  if (rateLimitRemaining <= 10) {
      logger.warn(`[PexelsProvider] Rate limit low: ${rateLimitRemaining} requests remaining. Resets at ${new Date(rateLimitResetTimestamp).toLocaleTimeString()}`);
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
  // Check if the reset time has passed
  if (Date.now() >= rateLimitResetTimestamp) {
    rateLimitRemaining = 200; // Reset assumption
    rateLimitResetTimestamp = 0;
    logger.debug('[PexelsProvider] Rate limit reset time passed. Assuming reset.');
    return true;
  }

  logger.warn(`[PexelsProvider] Rate limit likely exceeded. Remaining: ${rateLimitRemaining}. Resets at: ${new Date(rateLimitResetTimestamp).toLocaleTimeString()}`);
  return false;
}


/**
 * Image provider for fetching images from Pexels.
 */
export class PexelsProvider {
  /**
   * Creates a PexelsProvider instance.
   * API key is handled by the backend proxy.
   */
  constructor() {
    // API key is no longer needed here
    this.baseUrl = '/api/pexels'; // Point to our serverless function
    this.name = 'pexels'; // Identifier for this provider
    logger.debug('[PexelsProvider] Initialized. Using backend proxy at:', this.baseUrl);
  }

  /**
   * Fetches a random image URL from Pexels based on a category/query.
   * Pexels search endpoint returns multiple photos, so we pick one randomly.
   * @param {string} query - The search query or category for the image.
   * @returns {Promise<object|null>} A promise that resolves to an object containing image details (url, author, etc.) or null if an error occurs.
   */
  async getImage(query = 'nature') {
    logger.debug(`[PexelsProvider] getImage called for query: ${query}. Using getImageBatch(1).`);
    try {
        // Fetch a batch of 1, but Pexels API might return more based on its minimums.
        // We only care about the first one here.
        const batch = await this.getImageBatch(query, 1);
        return batch && batch.length > 0 ? batch[0] : null;
    } catch (error) {
        logger.error(`[PexelsProvider] Error in getImage via getImageBatch:`, error);
        if (error instanceof RateLimitError) {
            // Handle upstream if needed
        }
        return null;
    }
  }

  /**
   * Fetches a batch of random images from Pexels based on a category/query.
   * @param {string} query - The search query or category for the images.
   * @param {number} [count=10] - The number of images to fetch (Pexels uses per_page, max 80).
   * @returns {Promise<Array<object>>} A promise that resolves to an array of image data objects.
   * @throws {RateLimitError} If the rate limit is exceeded.
   * @throws {Error} For other fetch or processing errors.
   */
  async getImageBatch(query = 'nature', count = 10) {
    // 1. Check Rate Limit
    if (!checkRateLimit()) {
      throw new RateLimitError('Pexels API rate limit exceeded.', rateLimitResetTimestamp);
    }

    // 2. Prepare URL
    const orientation = window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
    // Pexels uses 'per_page' parameter
    const perPage = Math.min(count, 80); // Pexels max per_page is 80
    const params = new URLSearchParams({
        query: query,
        orientation: orientation,
        per_page: perPage.toString()
        // Pexels search doesn't guarantee randomness in the same way Unsplash does.
        // The results are sorted by relevance by default. We rely on the proxy/API default.
    });
    const url = `${this.baseUrl}?${params.toString()}`;
    logger.debug(`[PexelsProvider] Fetching batch of ${perPage} via proxy: ${url}`);

    // 3. Fetch Data
    try {
      const response = await fetch(url);

      // 4. Update Rate Limit State from Headers
      // IMPORTANT: Assumes proxy forwards these headers!
      updateRateLimitState(response.headers);

      // 5. Handle HTTP Errors
      if (!response.ok) {
        let errorMsg = `Pexels API error: ${response.status} ${response.statusText}`;
        // Check for Pexels rate limit status code (429)
        if (response.status === 429) {
            logger.warn(`[PexelsProvider] Received 429. Assuming rate limit hit.`);
            // Reset timestamp might be in the headers already, updateRateLimitState should handle it.
            // If not, we might need to estimate.
            throw new RateLimitError(errorMsg, rateLimitResetTimestamp);
        }
        // Try to get more details for other errors
        try {
            const errorData = await response.json();
             if (errorData && errorData.error) {
                errorMsg += ` - ${errorData.error}`;
            } else if (errorData && errorData.code) {
                 errorMsg += ` - Code: ${errorData.code}`;
            }
        } catch (e) { /* Ignore JSON parsing error */ }
        logger.error(errorMsg);
        throw new Error(errorMsg); // Throw standard error
      }

      // 6. Process Successful Response
      const data = await response.json();
      logger.debug(`[PexelsProvider] Received batch data (${data?.photos?.length || 0} items) via proxy.`);

      if (!data || !Array.isArray(data.photos) || data.photos.length === 0) {
          logger.error('[PexelsProvider] No photos found in Pexels API response:', data);
          return []; // Return empty array
      }

      // 7. Map data to standard format
      return data.photos
        .map(photo => {
          if (photo && photo.src && photo.photographer) {
            // Choose appropriate image size
            const imageUrl = photo.src.large2x || photo.src.large || photo.src.original;
            return {
              url: imageUrl,
              authorName: photo.photographer || 'Unknown',
              authorUrl: photo.photographer_url || '#',
              source: this.name
              // Pexels 'alt' might be useful: photo.alt
            };
          }
          return null;
        })
        .filter(item => item !== null); // Remove nulls

    } catch (error) {
      logger.error('[PexelsProvider] Error fetching image batch:', error);
      // Re-throw allows the caller to handle specific types
      throw error;
    }
  }
}
