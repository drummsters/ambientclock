import axios from 'axios';
import fetch from 'node-fetch'; // Added for internal API call
import { URL } from 'url'; // Added for constructing absolute URL
// Removed dotenv import and related logic

// Vercel environment variable (or similar for other platforms)
// Should be set via Vercel project settings or `vercel env add`
const UNSPLASH_API_KEY = process.env.UNSPLASH_API_KEY;

export default async (req, res) => {
  // Allow requests from any origin (adjust for production if needed)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (!UNSPLASH_API_KEY) {
    console.error('Unsplash API key is not configured in environment variables.');
    return res.status(500).json({ error: 'Server configuration error: Unsplash API key missing.' });
  }

  // Extract query parameters from the incoming request (e.g., query, orientation)
  const { query, orientation, count = 30, content_filter = 'high' } = req.query; // Default count to 10

  if (!query) {
    return res.status(400).json({ error: 'Missing required parameter: query' });
  }

  const unsplashApiUrl = 'https://api.unsplash.com/photos/random';

  try {
    console.log(`[API/Unsplash] Fetching from Unsplash. Query: ${query}, Orientation: ${orientation}, Count: ${count}`);
    const response = await axios.get(unsplashApiUrl, {
      headers: {
        Authorization: `Client-ID ${UNSPLASH_API_KEY}`,
        'Accept-Version': 'v1' // Recommended by Unsplash docs
      },
      params: {
        query: query,
        orientation: orientation || 'landscape', // Default to landscape if not provided
        count: count,
        content_filter: content_filter
      }
    });

    console.log('[API/Unsplash] Successfully fetched data from Unsplash.');

    // --- Persist URLs to DB via /api/images endpoint ---
    if (Array.isArray(response.data) && response.data.length > 0) {
      const urlsToPersist = response.data.map(image => ({
        provider: 'unsplash',
        provider_image_id: image.id, // Extract provider's unique ID
        url: image.urls?.raw || image.urls?.full, // Prefer raw or full URL
        search_query: query, // Add the search query used
        metadata: { // Store relevant metadata (can still include id if needed elsewhere)
          id: image.id, // Keep original id in metadata for potential future use
          description: image.description || image.alt_description,
          width: image.width,
          height: image.height,
          color: image.color,
          blur_hash: image.blur_hash,
          user: {
            name: image.user?.name,
            link: image.user?.links?.html
          },
          links: {
            html: image.links?.html,
            download_location: image.links?.download_location
          }
        }
      }));

      const payload = { urls: urlsToPersist };

      try {
        // Construct absolute URL for the internal API call
        // Use 'http' locally, Vercel handles HTTPS automatically if deployed
        const protocol = req.headers['x-forwarded-proto'] || 'http';
        const host = req.headers['x-forwarded-host'] || req.headers.host;
        const internalApiUrl = `${protocol}://${host}/api/images`;

        console.log(`[API/Unsplash] Sending ${payload.urls.length} URLs to internal endpoint: ${internalApiUrl}`);

        const dbResponse = await fetch(internalApiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        // Log result but don't wait for it or let it block the client response
        dbResponse.json().then(dbResult => {
          if (dbResponse.ok) {
            console.log(`[API/Unsplash] DB Persistence: Added ${dbResult.added}, Skipped ${dbResult.skipped}`);
          } else {
            console.error(`[API/Unsplash] DB Persistence Error: ${dbResult.error || dbResponse.statusText}`);
          }
        }).catch(logError => {
            console.error('[API/Unsplash] Error processing DB response:', logError);
        });

      } catch (dbError) {
        console.error('[API/Unsplash] Failed to call internal /api/images endpoint:', dbError);
        // Log the error but proceed to return data to client
      }
    }
    // --- End Persist URLs ---

    // Return the original data received from Unsplash to the client
    res.status(200).json(response.data);

  } catch (error) {
    console.error('[API/Unsplash] Error fetching from Unsplash:', error.response?.data || error.message);
    const status = error.response?.status || 500;
    const message = error.response?.data?.errors?.[0] || 'Failed to fetch data from Unsplash.';
    res.status(status).json({ error: message });
  }
};
