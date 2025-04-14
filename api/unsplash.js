import axios from 'axios';
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

    // --- Start: Add URLs to DB ---
    if (response.data && Array.isArray(response.data) && response.data.length > 0) {
      const urlsToDb = response.data.map(photo => ({
        provider: 'unsplash',
        url: photo.urls.raw || photo.urls.full, // Prefer raw, fallback to full
        metadata: {
          photographer: photo.user?.name,
          photographer_url: photo.user?.links?.html,
          alt: photo.alt_description || photo.description,
          source_url: photo.links?.html, // Link back to the Unsplash page
          width: photo.width,
          height: photo.height,
          color: photo.color,
          blur_hash: photo.blur_hash,
          // Include different sizes if needed
          src_small: photo.urls?.small,
          src_thumb: photo.urls?.thumb,
        }
      }));

      // Make internal POST request to our own /api/images endpoint
      const internalApiUrl = `${req.headers['x-forwarded-proto'] || 'http'}://${req.headers.host}/api/images`;
      console.log(`[API/Unsplash] Posting ${urlsToDb.length} URLs to internal endpoint: ${internalApiUrl}`);

      // Fire-and-forget the POST request
      axios.post(internalApiUrl, { urls: urlsToDb })
        .then(dbResponse => {
          console.log(`[API/Unsplash -> DB] Success: Added ${dbResponse.data.added}, Skipped ${dbResponse.data.skipped}`);
        })
        .catch(dbError => {
          console.error('[API/Unsplash -> DB] Error posting to /api/images:', dbError.response?.data || dbError.message);
        });
    }
    // --- End: Add URLs to DB ---

    // Return the data received from Unsplash
    res.status(200).json(response.data);

  } catch (error) {
    console.error('[API/Unsplash] Error fetching from Unsplash:', error.response?.data || error.message);
    const status = error.response?.status || 500;
    const message = error.response?.data?.errors?.[0] || 'Failed to fetch data from Unsplash.';
    res.status(status).json({ error: message });
  }
};
