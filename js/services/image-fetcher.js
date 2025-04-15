import * as logger from '../utils/logger.js';
import { determineImageQueryKey } from './utils/background-helpers.js';
import { RateLimitError } from '../core/errors.js';

console.log('[ImageFetcher Module] File loaded and parsed.'); // Top-level log

const BATCH_SIZE = 10; // Needs to be consistent

/**
 * Handles fetching image batches, prioritizing DB cache then falling back to providers.
 */
export class ImageFetcher {
    /**
     * Creates an ImageFetcher instance.
     * @param {Map<string, object>} providers - Map of available image provider instances.
      * @param {ConfigManager} configManager - The application's configuration manager.
      */
     constructor(providers, configManager) {
         logger.debug('[ImageFetcher] Constructor called. Received providers:', providers); // Reverted to logger.debug
         this.providers = providers;
         this.configManager = configManager;
         this.isFetching = false; // Prevent concurrent fetches
        if (!this.providers || !(this.providers instanceof Map)) {
             logger.error('[ImageFetcher] Constructor received invalid providers map!', providers);
        }
    }

    /**
     * Fetches a batch of images based on the current configuration.
     * Implements the 90/10 DB vs. Provider logic.
     * @param {object} config - The current background configuration.
     * @returns {Promise<Array<object>>} A promise resolving to an array of image data objects.
      * @throws {Error} If fetching fails after all fallbacks.
      */
     async fetchImageBatch(config) {
         logger.debug('[ImageFetcher] fetchImageBatch called. Checking this.providers:', this.providers); // Reverted to logger.debug
         if (!this.providers || !(this.providers instanceof Map)) {
              logger.error('[ImageFetcher] fetchImageBatch: this.providers is invalid!', this.providers);
              // Potentially throw an error here or return empty array?
             // Throwing might be better to signal a fundamental issue.
             this.isFetching = false; // Reset flag before throwing
             throw new Error("ImageFetcher is missing its providers map.");
        }

        if (this.isFetching) {
            logger.debug('[ImageFetcher] Fetch batch skipped: Already fetching.');
            return []; // Return empty array or throw specific error? Returning empty for now.
        }
        this.isFetching = true;

        let imageBatch = [];
        let fetchedFromDb = false;
        let lastError = null;

        const useDb = this.configManager.isFeatureEnabled('useImageDb');
        const currentProvider = config.source || 'unsplash';
        const currentQueryKey = determineImageQueryKey(config);

         // --- Add diagnostic logging ---
         const randomCheckValue = Math.random(); // Store the random value
         logger.log(`[ImageFetcher] DB Fetch Check: useDb=${useDb}, currentQueryKey=${currentQueryKey}, randomCheck=${randomCheckValue.toFixed(2)}`); // TEMPORARILY Changed to logger.log
         // --- End diagnostic logging ---

         // --- Attempt DB Fetch (90% chance if enabled and possible) ---
        // Use the stored random value for the actual check
        if (useDb && currentQueryKey !== null && randomCheckValue < 0.9) {
            logger.debug(`[ImageFetcher] (90% chance met) Attempting fetch from DB API for provider: ${currentProvider}, query: ${currentQueryKey}`);
            try {
                const apiUrl = `/api/images?provider=${encodeURIComponent(currentProvider)}&query=${encodeURIComponent(currentQueryKey)}&count=${BATCH_SIZE}`;
                const response = await fetch(apiUrl);

                if (!response.ok) {
                    const errorText = await response.text();
                    logger.warn(`[ImageFetcher] DB API request failed: ${response.status}. Response: ${errorText}. Falling back to provider.`);
                } else {
                    const data = await response.json();
                    // Map DB response to expected cache format
                    const mappedUrls = data.urls?.map(item => ({
                        url: item.url,
                        ...item.metadata // Spread metadata
                    })) || [];

                    if (mappedUrls.length > 0) {
                        imageBatch = mappedUrls;
                        logger.debug(`[ImageFetcher] Successfully fetched ${imageBatch.length} images from DB API for ${currentProvider}, query: ${currentQueryKey}.`);
                        fetchedFromDb = true;
                    } else {
                        logger.warn(`[ImageFetcher] DB API returned no URLs for ${currentProvider}, query: ${currentQueryKey}. Falling back to provider API.`);
                    }
                }
            } catch (error) {
                logger.error(`[ImageFetcher] Error fetching/processing from DB API for ${currentProvider}, query: ${currentQueryKey}. Falling back to provider API.`, error);
            }
        } else {
             // Log the specific reason for skipping DB fetch
             let skipReason = '';
             if (!useDb) skipReason = 'DB feature flag disabled';
             else if (currentQueryKey === null) skipReason = 'Query key is null';
             else skipReason = `10% chance met (rnd=${randomCheckValue.toFixed(2)})`;
             logger.debug(`[ImageFetcher] (${skipReason}) Proceeding to fetch from provider API.`);
        }
        // --- End DB Fetch Attempt ---


        // --- Provider Fetch Logic (Execute if DB fetch didn't succeed) ---
        if (!fetchedFromDb) {
            logger.debug('[ImageFetcher] Executing provider fetch logic.');
            let providerToUse = config.source || 'unsplash'; // Start with configured provider

            // Create ordered list of providers to try
            let providerFallbackOrder = [];
            if (providerToUse !== 'peapix') {
                providerFallbackOrder.push(providerToUse);
            }
            // Add remaining providers (ensure Pixabay is included if its API is ready)
            ['unsplash', 'pexels', 'pixabay'].forEach(name => {
                if (name !== providerToUse && name !== 'peapix') {
                    providerFallbackOrder.push(name);
                }
            });

            let providerFetchSucceeded = false;

            // Special handling for Peapix
            if (providerToUse === 'peapix') {
                const provider = this.providers.get('peapix');
                if (!provider || typeof provider.getImageBatch !== 'function') {
                     logger.error('[ImageFetcher] Invalid provider or missing getImageBatch for peapix');
                     lastError = new Error('Invalid provider or missing getImageBatch for peapix');
                } else {
                    try {
                        const countryCode = determineImageQueryKey(config);
                        if (countryCode === null) {
                            logger.error('[ImageFetcher] Cannot fetch for Peapix without a country code.');
                            lastError = new Error('Cannot fetch for Peapix without a country code.');
                        } else {
                            logger.debug(`[ImageFetcher] Fetching batch for Peapix, country: ${countryCode}`);
                            imageBatch = await provider.getImageBatch(null, BATCH_SIZE, countryCode);
                            logger.debug(`[ImageFetcher] Peapix batch fetch successful. Fetched ${imageBatch.length} images.`);
                            providerFetchSucceeded = true;
                            // TODO: Add Peapix results to DB if its API endpoint is updated
                        }
                    } catch (error) {
                        logger.error('[ImageFetcher] Error during Peapix batch fetch:', error);
                        lastError = error;
                    }
                }
            } else { // Handle non-Peapix providers with fallback
                for (const providerName of providerFallbackOrder) {
                    const provider = this.providers.get(providerName);
                    if (!provider || typeof provider.getImageBatch !== 'function') {
                        logger.warn(`[ImageFetcher] Provider "${providerName}" not found or invalid, trying next...`);
                        continue;
                    }

                    try {
                        const queryKey = determineImageQueryKey(config);
                        if (queryKey === null) {
                            logger.debug('[ImageFetcher] Skipping provider fetch: Query key is null.');
                            lastError = new Error('Query key is null, cannot fetch from provider.');
                            break; // Exit loop
                        }

                        logger.debug(`[ImageFetcher] Trying batch fetch from ${providerName}, query: "${queryKey}"`);
                        imageBatch = await provider.getImageBatch(queryKey, BATCH_SIZE);

                        // Update config if fallback occurred (needs access to StateManager or callback)
                        // For now, just log the success
                        // if (providerName !== providerToUse) {
                        //     logger.log(`[ImageFetcher] Switched to provider ${providerName} due to rate limit on ${providerToUse}`);
                        //     // TODO: Need a way to signal config update back to caller
                        // }

                        logger.debug(`[ImageFetcher] Batch fetch successful from ${providerName}. Fetched ${imageBatch.length} images.`);
                        providerFetchSucceeded = true;
                        break; // Success, exit loop

                    } catch (error) {
                        lastError = error;
                        if (error instanceof RateLimitError || error.name === 'RateLimitError') {
                            logger.warn(`[ImageFetcher] Rate limit hit for ${providerName}, trying next provider...`);
                            continue; // Try next provider
                        } else {
                            logger.error(`[ImageFetcher] Non-rate-limit error from ${providerName}:`, error);
                            break; // Exit loop on non-rate-limit errors
                        }
                    }
                }
                 // If loop finished without success
                if (!providerFetchSucceeded) {
                     logger.error('[ImageFetcher] All provider fetches failed or encountered non-rate-limit error.');
                     // Keep lastError
                }
            }
        } // End of if(!fetchedFromDb) block

        // --- Final Cleanup and Error Handling ---
        this.isFetching = false; // Reset fetching flag

        // If neither DB nor provider fetch succeeded, and we have an error, throw it
        if (!fetchedFromDb && imageBatch.length === 0 && lastError) {
            logger.error('[ImageFetcher] Fetch batch failed after all attempts. Throwing last error.');
            throw lastError;
        } else if (imageBatch.length === 0) {
            logger.warn('[ImageFetcher] Fetch batch completed, but image batch is empty.');
        }

        return imageBatch; // Return the fetched batch (could be empty)
    }
}
