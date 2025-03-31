/**
 * Image provider for fetching images from Pexels.
 */
export class PexelsProvider {
  /**
   * Creates a PexelsProvider instance.
   * @param {string} apiKey - The Pexels API key.
   */
  constructor(apiKey) {
    if (!apiKey) {
      console.warn('[PexelsProvider] API key is missing. Provider will not function.');
    }
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.pexels.com/v1';
    this.name = 'pexels'; // Identifier for this provider
  }

  /**
   * Fetches a random image URL from Pexels based on a category/query.
   * Pexels search endpoint returns multiple photos, so we pick one randomly.
   * @param {string} query - The search query or category for the image.
   * @returns {Promise<object|null>} A promise that resolves to an object containing image details (url, author, etc.) or null if an error occurs or no key is provided.
   */
  async getImage(query = 'nature') {
    if (!this.apiKey) {
      console.error('[PexelsProvider] Cannot fetch image: API key is missing.');
      return null;
    }

    const orientation = window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
    // Pexels uses 'search' endpoint and returns multiple results per page
    const perPage = 15; // Fetch a decent number to pick randomly from
    const randomPage = Math.floor(Math.random() * 10) + 1; // Get results from different pages
    const url = `${this.baseUrl}/search?query=${encodeURIComponent(query)}&orientation=${orientation}&per_page=${perPage}&page=${randomPage}`;

    console.log(`[PexelsProvider] Fetching image from: ${url}`);

    try {
      const response = await fetch(url, {
        headers: {
          'Authorization': this.apiKey
        }
      });

      if (!response.ok) {
        let errorMsg = `Pexels API error: ${response.status} ${response.statusText}`;
         try {
            const errorData = await response.json();
            if (errorData && errorData.error) {
                errorMsg += ` - ${errorData.error}`;
            } else if (errorData && errorData.code) {
                 errorMsg += ` - Code: ${errorData.code}`;
            }
        } catch (e) { /* Ignore JSON parsing error */ }
        console.error(errorMsg);
        throw new Error(errorMsg);
      }

      const data = await response.json();
      console.log('[PexelsProvider] Received data:', data);

      if (data && data.photos && data.photos.length > 0) {
        // Pick a random photo from the results
        const randomIndex = Math.floor(Math.random() * data.photos.length);
        const photo = data.photos[randomIndex];

        // Pexels provides different sizes, choose one appropriate for background
        const imageUrl = photo.src.large2x || photo.src.large || photo.src.original;

        return {
          url: imageUrl,
          authorName: photo.photographer || 'Unknown',
          authorUrl: photo.photographer_url || '#', // Link to photographer profile
          source: this.name // Identify the source
          // Pexels 'alt' might be useful: photo.alt
        };
      } else {
        console.error('[PexelsProvider] No photos found in Pexels API response:', data);
        return null;
      }
    } catch (error) {
      console.error('[PexelsProvider] Error fetching image:', error);
      return null; // Return null on error
    }
  }
}
