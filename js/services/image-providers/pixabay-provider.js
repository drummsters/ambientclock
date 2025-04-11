import * as logger from '../../utils/logger.js';

/**
 * Image provider for fetching images from Pixabay, following similar patterns to Unsplash/Pexels.
 */
export class PixabayProvider {
    /**
     * Creates a PixabayProvider instance.
     * API key is handled by the backend proxy.
     */
    constructor() {
        this.baseUrl = '/api/pixabay'; // Point to our serverless function
        this.name = 'pixabay'; // Identifier for this provider
        this.requiresBackendKey = true; // Indicates backend API key setup is needed
        logger.debug('[PixabayProvider] Initialized. Using backend proxy at:', this.baseUrl);
    }

    /**
     * Fetches a batch of images from Pixabay based on a query and orientation.
     * Note: The 'count' parameter is ignored; the API proxy fetches a fixed larger batch.
     * @param {string} query - The search query.
     * @param {number} [count=10] - Ignored. Kept for interface consistency.
     * @returns {Promise<Array<object>>} A promise that resolves to an array of image data objects.
     * @throws {Error} For fetch or processing errors.
     */
    async getImageBatch(query = 'nature', count = 10) { // count is ignored
        // Determine orientation based on window size
        const orientation = window.innerWidth > window.innerHeight ? 'horizontal' : 'vertical';
        logger.debug(`[PixabayProvider] getImageBatch called for query: ${query}, orientation: ${orientation}. (Requested count ${count} ignored)`);

        try {
            // Prepare URL for the backend proxy
            const params = new URLSearchParams({
                q: query,
                orientation: orientation
                // page: 1 // Fetch page 1 by default. API proxy handles batch size.
            });
            const url = `${this.baseUrl}?${params.toString()}`;
            logger.debug(`[PixabayProvider] Fetching batch via proxy: ${url}`);

            const response = await fetch(url);

            // Handle HTTP errors
            if (!response.ok) {
                let errorMsg = `Pixabay API proxy error: ${response.status} ${response.statusText}`;
                try {
                    const errorData = await response.json();
                    if (errorData && errorData.error) {
                        errorMsg += ` - ${errorData.error}`;
                    }
                } catch (e) { /* Ignore JSON parsing error */ }
                logger.error(errorMsg);
                // Pixabay uses 429 for rate limits, but proxy might return 500 if key is bad.
                // We don't have specific rate limit handling here yet like Pexels/Unsplash.
                throw new Error(errorMsg);
            }

            // Process successful response
            const data = await response.json();
            logger.debug(`[PixabayProvider] Received batch data (${data?.hits?.length || 0} items) via proxy.`);

            // Validate response structure
            if (!data || !Array.isArray(data.hits)) {
                logger.error('[PixabayProvider] Invalid data received from Pixabay API proxy:', data);
                return []; // Return empty array if data is not as expected
            }

            if (data.hits.length === 0) {
                logger.warn('[PixabayProvider] No images found for query:', query);
                return []; // Return empty if no hits
            }

            // Map data to the standard format expected by ImageBackgroundHandler
            return data.hits
                .map(hit => {
                    // Basic validation for each hit
                    if (hit && hit.largeImageURL && hit.user) {
                        return {
                            url: hit.largeImageURL, // Use largeImageURL for better quality
                            authorName: hit.user || 'Unknown',
                            // Construct author URL based on Pixabay's pattern
                            authorUrl: hit.user_id ? `https://pixabay.com/users/${hit.user}-${hit.user_id}/` : '#',
                            source: this.name
                            // Other potentially useful fields: hit.webformatURL, hit.tags, hit.pageURL
                        };
                    }
                    return null; // Filter out invalid hits
                })
                .filter(item => item !== null); // Remove nulls

        } catch (error) {
            logger.error('[PixabayProvider] Error fetching image batch:', error);
            // Re-throw allows the caller (ImageBackgroundHandler) to handle it
            throw error;
        }
        // Note: Rate limit handling is not implemented here as robustly as for Pexels/Unsplash.
        // The backend proxy handles the key, but client-side checks/state are missing.
    }

    /**
     * Fetches a single image from Pixabay based on a query.
     * @param {string} query - The search query.
     * @returns {Promise<object|null>} A promise that resolves to an object containing image details or null if an error occurs.
     */
    async getImage(query = 'nature') {
        logger.debug(`[PixabayProvider] getImage called for query: ${query}. Using getImageBatch(1).`);
        try {
            const batch = await this.getImageBatch(query, 1);
            return batch && batch.length > 0 ? batch[0] : null;
        } catch (error) {
            logger.error(`[PixabayProvider] Error in getImage via getImageBatch:`, error);
            return null;
        }
    }
}
