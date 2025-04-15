import axios from 'axios';
import fetch from 'node-fetch'; // Added for internal API call

// Vercel environment variable (or similar)
const PEXELS_API_KEY = process.env.PEXELS_API_KEY;

export default async (req, res) => {
  // Allow requests from any origin (adjust for production if needed)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (!PEXELS_API_KEY) {
    console.error('Pexels API key is not configured in environment variables.');
    return res.status(500).json({ error: 'Server configuration error: Pexels API key missing.' });
  }

  // Extract query parameters
  const { query, orientation, per_page = 30, size = 'medium', page = Math.floor(Math.random() * 20) + 1  } = req.query; // Default per_page

  if (!query) {
    return res.status(400).json({ error: 'Missing required parameter: query' });
  }

  const pexelsApiUrl = 'https://api.pexels.com/v1/search';

  try {
    console.log(`[API/Pexels] Fetching from Pexels. Query: ${query}, Orientation: ${orientation}, PerPage: ${per_page}`);
    const response = await axios.get(pexelsApiUrl, {
      headers: {
        Authorization: PEXELS_API_KEY
      },
      params: {
        query: query,
        orientation: orientation || 'landscape', // Default to landscape
        per_page: per_page,
        size: size,
        page: page
      }
    });

    console.log('[API/Pexels] Successfully fetched data from Pexels.');

    // --- Persist URLs to DB via /api/images endpoint ---
    const photos = response.data?.photos;
    if (Array.isArray(photos) && photos.length > 0) {
      const urlsToPersist = photos.map(photo => ({
        provider: 'pexels',
        provider_image_id: photo.id.toString(), // Ensure ID is string
        url: photo.src?.original || photo.src?.large2x || photo.src?.large, // Prefer original, fallback
        search_query: query, // Add the search query used
        metadata: { // Store relevant metadata
          id: photo.id, // Keep original id in metadata
          width: photo.width,
          height: photo.height,
          photographer: photo.photographer,
          photographer_url: photo.photographer_url,
          avg_color: photo.avg_color,
          alt: photo.alt,
          src: photo.src // Include all source URLs if needed
        }
      }));

      const payload = { urls: urlsToPersist };

      try {
        // Construct absolute URL for the internal API call
        const protocol = req.headers['x-forwarded-proto'] || 'http';
        const host = req.headers['x-forwarded-host'] || req.headers.host;
        const internalApiUrl = `${protocol}://${host}/api/images`;

        console.log(`[API/Pexels] Sending ${payload.urls.length} URLs to internal endpoint: ${internalApiUrl}`);

        // Await the fetch and response processing to ensure logs are generated
        const dbResponse = await fetch(internalApiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        // Process and log the response
        try {
            const dbResult = await dbResponse.json(); // Await JSON parsing
            if (dbResponse.ok) {
                console.log(`[API/Pexels] DB Persistence: Added ${dbResult.added}, Skipped ${dbResult.skipped}`);
            } else {
                console.error(`[API/Pexels] DB Persistence Error: ${dbResult.error || dbResponse.statusText}`);
            }
        } catch (logError) {
            // Handle cases where response is not valid JSON (e.g., HTML error page)
            console.error('[API/Pexels] Error processing DB response JSON:', logError);
            // Attempt to log the raw response text if JSON parsing failed
            try {
                const textResponse = await dbResponse.text(); // Use await here too
                console.error('[API/Pexels] Raw DB response text:', textResponse);
            } catch (textError) {
                console.error('[API/Pexels] Could not get raw text from DB response:', textError);
            }
        }

      } catch (dbError) {
        // Catch errors during the fetch call itself or synchronous setup errors
        console.error('[API/Pexels] Error during internal fetch or setup:', dbError);
      }
    }
    // --- End Persist URLs ---

    // Return the original data received from Pexels to the client
    res.status(200).json(response.data);

  } catch (error) {
    console.error('[API/Pexels] Error fetching from Pexels:', error.response?.data || error.message);
    const status = error.response?.status || 500;
    const message = error.response?.data?.error || 'Failed to fetch data from Pexels.';
    res.status(status).json({ error: message });
  }
};
