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
    console.log('[PeapixProvider] Initialized. Using backend proxy at:', this.baseUrl);
  }

  /**
   * Fetches the latest Bing image URL from the Peapix proxy, optionally for a specific country.
   * Note: Peapix API doesn't support search queries or orientation like Unsplash/Pexels.
   * @param {string} query - Ignored for Peapix, kept for interface consistency.
   * @param {string} [countryCode=''] - Optional country code (e.g., 'us', 'jp').
   * @returns {Promise<object|null>} A promise that resolves to an object containing image details or null if an error occurs.
   */
  async getImage(query = '', countryCode = '') { // Added countryCode parameter
    let url = this.baseUrl;
    if (countryCode) {
      const params = new URLSearchParams({ country: countryCode });
      url = `${this.baseUrl}?${params.toString()}`;
    }

    console.log(`[PeapixProvider] Fetching image via proxy: ${url}`);

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
        console.error(errorMsg);
        throw new Error(errorMsg);
      }

      const data = await response.json(); // Our API returns a single object
      console.log('[PeapixProvider] Received data via proxy:', data);

      // Validate the received data structure based on what api/peapix.js returns
      if (data && data.url && data.authorName) {
        return {
          url: data.url,
          authorName: data.authorName,
          authorUrl: data.authorUrl || '#',
          source: this.name
        };
      } else {
        console.error('[PeapixProvider] Invalid or empty data received via proxy:', data);
        return null;
      }
    } catch (error) {
      console.error('[PeapixProvider] Error fetching image:', error);
      return null; // Return null on error
    }
  }
}
