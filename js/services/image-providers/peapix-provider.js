import * as logger from '../../utils/logger.js'; // Corrected import path

/**
 * Image provider for fetching the latest Bing daily image via Peapix proxy.
 */
export class PeapixProvider {
  /**
   * Creates a PeapixProvider instance.
   */
  constructor() {
    this.baseUrl = '/api/peapix'; // Point to our serverless function
    this.name = 'peapix'; // Identifier for this provider
    this.requiresBackendKey = false; // Indicates backend API key setup is NOT needed
    logger.debug('[PeapixProvider] Initialized. Using backend proxy at:', this.baseUrl);
  }

  /**
   * Fetches the latest Bing image URL from the Peapix proxy, optionally for a specific country.
   * Note: Peapix API doesn't support search queries or orientation like Unsplash/Pexels.
   * @param {string} query - Ignored for Peapix, kept for interface consistency.
   * @param {string} [countryCode=''] - Optional country code (e.g., 'us', 'jp').
   * @returns {Promise<object|null>} A promise that resolves to an object containing image details or null if an error occurs.
   */
  async getImage(query = '', countryCode = '') {
    logger.debug(`[PeapixProvider] getImage called (country: ${countryCode}). Using getImageBatch(1).`);
    try {
        // Fetch a batch (API returns multiple, but we only need one)
        // Pass query (ignored), count=1 (ignored), and countryCode
        const batch = await this.getImageBatch(query, 1, countryCode);
        // Return the first item if the batch is not empty
        return batch && batch.length > 0 ? batch[0] : null;
    } catch (error) {
        // Log the error but return null as per original getImage signature
        logger.error(`[PeapixProvider] Error in getImage via getImageBatch:`, error);
        // Handle specific errors like RateLimitError if Peapix ever implements it
        return null;
    }
  }

  /**
   * Fetches a batch of images from Peapix via the backend proxy.
   * The proxy now returns an array based on the Peapix feed.
   * @param {string} query - Ignored for Peapix, kept for interface consistency.
   * @param {number} [count=10] - Ignored by the current Peapix API/proxy, but kept for consistency.
   * @param {string} [countryCode=''] - Optional country code (e.g., 'us', 'jp').
   * @returns {Promise<Array<object>>} A promise resolving to an array of image data objects.
   * @throws {Error} For fetch or processing errors.
   */
  async getImageBatch(query = '', count = 10, countryCode = '') {
    let url = this.baseUrl;
    if (countryCode) {
      const params = new URLSearchParams({ country: countryCode });
      url = `${this.baseUrl}?${params.toString()}`;
    }

    logger.debug(`[PeapixProvider] Fetching batch via proxy: ${url}`);

    try {
      const response = await fetch(url);
      if (!response.ok) {
        let errorMsg = `Peapix API proxy error: ${response.status} ${response.statusText}`;
        try {
            const errorData = await response.json();
            if (errorData && errorData.error) {
                errorMsg += ` - ${errorData.error}`;
                 if (errorData.details) errorMsg += ` (${errorData.details})`;
            }
        } catch (e) { /* Ignore JSON parsing error */ }
        logger.error(errorMsg);
        throw new Error(errorMsg);
      }

      const dataArray = await response.json(); // API now returns an array
      logger.debug(`[PeapixProvider] Received batch data (${dataArray?.length || 0} items) via proxy.`);

      // Validate the received data structure (should be an array)
      if (!Array.isArray(dataArray)) {
          logger.error('[PeapixProvider] Invalid data received (not an array):', dataArray);
          return []; // Return empty array if data is not as expected
      }

      // The backend already maps to the standard format, so just return the array.
      // Add validation for each item if needed, though backend should handle it.
      return dataArray.filter(item => item && item.url && item.authorName); // Basic filter for valid items

    } catch (error) {
      logger.error('[PeapixProvider] Error fetching image batch:', error);
      // Re-throw allows the caller (ImageBackgroundHandler) to handle it
      throw error;
    }
    // No rate limiting implemented for Peapix as it's likely less constrained
    // and doesn't provide standard rate limit headers via the proxy.
  }
}
