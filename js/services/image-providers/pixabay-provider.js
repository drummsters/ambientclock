import * as logger from '../../utils/logger.js';

/**
 * Image provider for fetching images from Pixabay.
 */
export class PixabayProvider {
    /**
     * Creates a PixabayProvider instance.
     * API key is handled by the backend proxy.
     */
    constructor() {
        this.baseUrl = '/api/pixabay'; // Point to our serverless function
        this.name = 'pixabay'; // Identifier for this provider
        logger.debug('[PixabayProvider] Initialized. Using backend proxy at:', this.baseUrl);
    }

    /**
     * Fetches a batch of images from Pixabay based on a query.
     * @param {string} query - The search query.
     * @param {number} [count=10] - The number of images to fetch.
     * @returns {Promise<Array<object>>} A promise that resolves to an array of image data objects.
     */
    async getImageBatch(query = 'nature', count = 10) {
        logger.debug(`[PixabayProvider] getImageBatch called for query: ${query}, count: ${count}`);
        try {
            const params = new URLSearchParams({
                q: query,
                count: count
            });
            const url = `${this.baseUrl}?${params.toString()}`;
            logger.debug(`[PixabayProvider] Fetching batch via proxy: ${url}`);

            const response = await fetch(url);
            if (!response.ok) {
                const errorMsg = `Pixabay API error: ${response.status} ${response.statusText}`;
                logger.error(errorMsg);
                throw new Error(errorMsg);
            }

            const data = await response.json();
            logger.debug(`[PixabayProvider] Received batch data (${data?.hits?.length || 0} items) via proxy.`);

            if (!data || !Array.isArray(data.hits) || data.hits.length === 0) {
                logger.error('[PixabayProvider] No images found in Pixabay API response:', data);
                return [];
            }

            return data.hits.map(hit => {
                return {
                    url: hit.largeImageURL,
                    authorName: hit.user,
                    authorUrl: `https://pixabay.com/users/${hit.user}-${hit.user_id}`,
                    source: this.name
                };
            });
        } catch (error) {
            logger.error('[PixabayProvider] Error fetching image batch:', error);
            throw error;
        }
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
