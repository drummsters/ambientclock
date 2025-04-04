// api/peapix.js
// Serverless function to fetch the latest Bing image from Peapix API.

import fetch from 'node-fetch'; // Use node-fetch for making HTTP requests in Node.js environment

export default async function handler(request, response) {
  const peapixUrl = 'https://peapix.com/bing/feed'; // Base URL for the Peapix Bing feed
  const { country } = request.query; // Extract country code from request query parameters

  // Construct the request URL, adding the country parameter if it exists
  let requestUrl = peapixUrl;
  if (country) {
    // Basic validation could be added here to check against known codes if needed
    requestUrl = `${peapixUrl}?country=${encodeURIComponent(country)}`;
  }

  try {
    console.log(`[Peapix API] Fetching from: ${requestUrl}`);
    const apiResponse = await fetch(requestUrl);

    if (!apiResponse.ok) {
      console.error(`[Peapix API] Error fetching data: ${apiResponse.status} ${apiResponse.statusText}`);
      // Try to get more details from the response body
      let errorBody = 'No details available';
      try {
        errorBody = await apiResponse.text();
      } catch (e) { /* ignore */ }
      return response.status(apiResponse.status).json({
        error: `Failed to fetch from Peapix API: ${apiResponse.status} ${apiResponse.statusText}`,
        details: errorBody
      });
    }

    const data = await apiResponse.json();
    console.log('[Peapix API] Received data:', data);

    // Peapix returns an array, usually with one item (the latest image)
    if (Array.isArray(data) && data.length > 0) {
      const imageInfo = data[0]; // Get the first image object

      // Extract relevant details, mapping to a consistent format if possible
      const result = {
        url: imageInfo.fullUrl, // Use the full resolution URL
        authorName: imageInfo.title || 'Bing Wallpaper', // Use title as author/description
        authorUrl: imageInfo.pageUrl || '#', // Link to the Peapix page for the image
        source: 'peapix', // Identify the source
        // Note: Peapix doesn't provide separate author info like Unsplash/Pexels
      };

      // Set CORS headers to allow requests from your frontend domain
      response.setHeader('Access-Control-Allow-Origin', '*'); // Adjust in production
      response.setHeader('Access-Control-Allow-Methods', 'GET');
      response.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate'); // Cache for 1 hour

      return response.status(200).json(result); // Return a single object, not an array
    } else {
      console.error('[Peapix API] Received empty or invalid data:', data);
      return response.status(500).json({ error: 'Received empty or invalid data from Peapix API' });
    }

  } catch (error) {
    console.error('[Peapix API] Internal server error:', error);
    return response.status(500).json({ error: 'Internal server error', details: error.message });
  }
}
