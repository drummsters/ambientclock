/**
 * Utility functions for background services.
 */

/**
 * Determines the appropriate query key (search query or country code)
 * based on the background configuration.
 *
 * @param {object} config - The background configuration object from state.settings.background.
 *                          Expected properties: source, category, customCategory, peapixCountry.
 * @returns {string|null} The determined query key (string) or null if no valid key can be determined
 *                        (e.g., 'Other' category selected with no custom input).
 */
export function determineImageQueryKey(config) {
    if (!config) {
        return 'nature'; // Default if config is missing
    }

    const providerName = config.source || 'unsplash'; // Default to unsplash if source is missing

    if (providerName === 'peapix') {
        // For Peapix, the key is the country code
        return config.peapixCountry || 'us'; // Default to 'us'
    } else {
        // For other providers, the key is the search query
        let query = null;
        if (config.category === 'Other') {
            // Use custom category if provided, otherwise null (indicating waiting for input)
            query = config.customCategory?.trim() || null;
        } else if (config.category) {
            // Use the standard category name
            query = config.category;
        } else {
            // Fallback to 'nature' if no category is set
            query = 'nature';
        }

        // Return the query (could be null if 'Other' is selected with no input)
        // Convert to lowercase if it's a string
        return typeof query === 'string' ? query.toLowerCase() : query;
    }
}
