/**
 * Image provider for fetching images from Unsplash.
 */
export class UnsplashProvider {
  /**
   * Creates an UnsplashProvider instance.
   * @param {string} apiKey - The Unsplash API key.
   */
  constructor(apiKey) {
    if (!apiKey) {
      console.warn('[UnsplashProvider] API key is missing. Provider will not function.');
    }
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.unsplash.com';
    this.name = 'unsplash'; // Identifier for this provider
  }

  /**
   * Fetches a random image URL from Unsplash based on a category/query.
   * @param {string} query - The search query or category for the image.
   * @returns {Promise<object|null>} A promise that resolves to an object containing image details (url, author, etc.) or null if an error occurs or no key is provided.
   */
  async getImage(query = 'nature') {
    if (!this.apiKey) {
      console.error('[UnsplashProvider] Cannot fetch image: API key is missing.');
      return null;
    }

    const orientation = window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
    const url = `${this.baseUrl}/photos/random?query=${encodeURIComponent(query)}&orientation=${orientation}&client_id=${this.apiKey}`;

    console.log(`[UnsplashProvider] Fetching image from: ${url}`);

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

      const data = await response.json();
      console.log('[UnsplashProvider] Received data:', data);

      if (data && data.urls && data.urls.regular && data.user) {
        return {
          url: data.urls.regular, // Use 'regular' size for decent quality
          authorName: data.user.name || 'Unknown',
          authorUrl: data.user.links?.html || '#', // Link to user profile
          source: this.name // Identify the source
          // Add other relevant data like description if needed: data.description || data.alt_description
        };
      } else {
        console.error('[UnsplashProvider] Invalid data received from Unsplash API:', data);
        return null;
      }
    } catch (error) {
      console.error('[UnsplashProvider] Error fetching image:', error);
      return null; // Return null on error
    }
  }
}
