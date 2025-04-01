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
    console.log('[PexelsProvider] Initialized. Using backend proxy at:', this.baseUrl);
  }

  /**
   * Fetches a random image URL from Pexels based on a category/query.
   * Pexels search endpoint returns multiple photos, so we pick one randomly.
   * @param {string} query - The search query or category for the image.
   * @returns {Promise<object|null>} A promise that resolves to an object containing image details (url, author, etc.) or null if an error occurs.
   */
  async getImage(query = 'nature') {
    // API key check removed

    const orientation = window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
    const perPage = 15; // Keep fetching multiple to allow random selection client-side

    // Construct URL for our serverless function
    const params = new URLSearchParams({
        query: query,
        orientation: orientation,
        per_page: perPage.toString()
        // Note: Random page logic is removed here; the proxy could implement it if needed,
        // or we rely on Pexels' default sorting/randomness for the first page.
        // Alternatively, the proxy could accept a 'page' param. For now, keep it simple.
    });
    const url = `${this.baseUrl}?${params.toString()}`;

    console.log(`[PexelsProvider] Fetching image via proxy: ${url}`);

    try {
      // Remove Authorization header as the proxy handles it
      const response = await fetch(url);

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
