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
    console.log('[UnsplashProvider] Initialized. Using backend proxy at:', this.baseUrl);
  }

  /**
   * Fetches a random image URL from Unsplash based on a category/query.
   * @param {string} query - The search query or category for the image.
   * @returns {Promise<object|null>} A promise that resolves to an object containing image details (url, author, etc.) or null if an error occurs.
   */
  async getImage(query = 'nature') {
    // API key check removed

    const orientation = window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
    // Construct URL for our serverless function, passing parameters
    const params = new URLSearchParams({
        query: query,
        orientation: orientation,
        count: 1 // Fetch one random image matching the query
    });
    const url = `${this.baseUrl}?${params.toString()}`;

    console.log(`[UnsplashProvider] Fetching image via proxy: ${url}`);

    try {
      const response = await fetch(url);
      if (!response.ok) {
        // Log specific error from Unsplash if possible
        let errorMsg = `Unsplash API error: ${response.status} ${response.statusText}`;
        try {
            const errorData = await response.json();
            if (errorData && errorData.errors) {
                errorMsg += ` - ${errorData.errors.join(', ')}`;
            }
        } catch (e) { /* Ignore JSON parsing error */ }
        console.error(errorMsg);
        throw new Error(errorMsg);
      }

      const dataArray = await response.json(); // Our API returns an array
      console.log('[UnsplashProvider] Received data via proxy:', dataArray);

      // Since the proxy asks for count=1, we expect an array with one item
      const data = Array.isArray(dataArray) && dataArray.length > 0 ? dataArray[0] : null;

      if (data && data.urls && data.urls.regular && data.user) {
        return {
          url: data.urls.regular,
          authorName: data.user.name || 'Unknown',
          authorUrl: data.user.links?.html || '#',
          source: this.name
        };
      } else {
        console.error('[UnsplashProvider] Invalid or empty data received via proxy:', dataArray);
        return null;
      }
    } catch (error) {
      console.error('[UnsplashProvider] Error fetching image:', error);
      return null; // Return null on error
    }
  }
}
