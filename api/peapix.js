// api/peapix.js
// Serverless function to fetch the latest Bing image from Peapix API.

import fetch from 'node-fetch'; // Use node-fetch for making HTTP requests in Node.js environment
import axios from 'axios'; // Import axios for internal POST request

export default async function handler(request, response) {
  const peapixUrl = 'https://peapix.com/bing/feed'; // Base URL for the Peapix Bing feed
  const { country } = request.query; // Extract country code from request query parameters

  // Generate a random page number between 1 and 50
  const randomPage = Math.floor(Math.random() * 50) + 1;

  // Construct the request URL, adding country and random page parameters
  const params = new URLSearchParams();
  if (country) {
    params.set('country', country);
  }
  params.set('page', randomPage.toString());

  const requestUrl = `${peapixUrl}?${params.toString()}`;

  try {
    console.log(`[Peapix API] Fetching from: ${requestUrl} (Country: ${country || 'default'}, Page: ${randomPage})`);
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

    // Peapix returns an array of image objects
    if (Array.isArray(data) && data.length > 0) {
      // Map each image object in the array to our standard format
      const results = data.map(imageInfo => {
        // Basic validation for each item
        if (!imageInfo || !imageInfo.fullUrl) {
          console.warn('[Peapix API] Skipping invalid item in feed:', imageInfo);
          return null; // Skip invalid items
        }
        return {
          url: imageInfo.fullUrl, // Use the full resolution URL
          authorName: imageInfo.title || 'Bing Wallpaper', // Use title as author/description
          authorUrl: imageInfo.pageUrl || '#', // Link to the Peapix page for the image
          source: 'peapix', // Identify the source
          // Note: Peapix doesn't provide separate author info like Unsplash/Pexels
        };
      }).filter(item => item !== null); // Remove any nulls from skipped items

      if (results.length === 0) {
        console.error('[Peapix API] No valid images found after filtering:', data);
        return response.status(500).json({ error: 'No valid images found in Peapix API response' });
      }

      // Set CORS headers to allow requests from your frontend domain
      response.setHeader('Access-Control-Allow-Origin', '*'); // Adjust in production
      response.setHeader('Access-Control-Allow-Methods', 'GET');
      response.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate'); // Cache for 1 hour

      // --- Start: Add URLs to DB ---
      const urlsToDb = results.map(item => ({
        provider: 'peapix',
        url: item.url,
        metadata: {
          title: item.authorName, // Peapix uses 'title'
          source_url: item.authorUrl, // Link back to the Peapix page
          // Add other available fields if needed
        }
      }));

      // Make internal POST request to our own /api/images endpoint using relative path
      const relativeApiPath = '/api/images';
      console.log(`[API/Peapix] Posting ${urlsToDb.length} URLs to internal endpoint: ${relativeApiPath}`);

      // Fire-and-forget the POST request using the relative path
      axios.post(relativeApiPath, { urls: urlsToDb })
        .then(dbResponse => {
          console.log(`[API/Peapix -> DB] Success: Added ${dbResponse.data.added}, Skipped ${dbResponse.data.skipped}`);
        })
        .catch(dbError => {
          // Log detailed error if possible
          const errorDetails = dbError.response ? JSON.stringify(dbError.response.data) : dbError.message;
          console.error(`[API/Peapix -> DB] Error posting to ${relativeApiPath}: ${errorDetails}`);
        });
      // --- End: Add URLs to DB ---

      return response.status(200).json(results); // Return the original mapped results array
    } else {
      console.error('[Peapix API] Received empty array or invalid data:', data);
      return response.status(500).json({ error: 'Received empty array or invalid data from Peapix API' });
    }

  } catch (error) {
    console.error('[Peapix API] Internal server error:', error);
    return response.status(500).json({ error: 'Internal server error', details: error.message });
  }
}
