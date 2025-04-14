import axios from 'axios';

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
    // Return the data received from Pexels (usually nested under 'photos')
    console.log('[API/Pexels] Successfully fetched data from Pexels.');

    // --- Start: Add URLs to DB ---
    if (response.data && Array.isArray(response.data.photos) && response.data.photos.length > 0) {
      const urlsToDb = response.data.photos.map(photo => ({
        provider: 'pexels',
        url: photo.src.original, // Assuming 'original' is the desired URL
        metadata: {
          photographer: photo.photographer,
          photographer_url: photo.photographer_url,
          avg_color: photo.avg_color,
          alt: photo.alt,
          source_url: photo.url, // Link back to the Pexels page for the image
          width: photo.width,
          height: photo.height,
          // Include different sizes if needed, e.g., photo.src.large2x, photo.src.medium etc.
          src_medium: photo.src.medium,
          src_large: photo.src.large,
          src_tiny: photo.src.tiny,
        }
      }));

      // Make internal POST request to our own /api/images endpoint using relative path
      const relativeApiPath = '/api/images';
      console.log(`[API/Pexels] Posting ${urlsToDb.length} URLs to internal endpoint: ${relativeApiPath}`);

      // Fire-and-forget the POST request using the relative path
      axios.post(relativeApiPath, { urls: urlsToDb })
        .then(dbResponse => {
          console.log(`[API/Pexels -> DB] Success: Added ${dbResponse.data.added}, Skipped ${dbResponse.data.skipped}`);
        })
        .catch(dbError => {
          // Log detailed error if possible
          const errorDetails = dbError.response ? JSON.stringify(dbError.response.data) : dbError.message;
          console.error(`[API/Pexels -> DB] Error posting to ${relativeApiPath}: ${errorDetails}`);
        });
    }
    // --- End: Add URLs to DB ---

    // Return the data received from Pexels (usually nested under 'photos')
    res.status(200).json(response.data);

  } catch (error) {
    console.error('[API/Pexels] Error fetching from Pexels:', error.response?.data || error.message);
    const status = error.response?.status || 500;
    const message = error.response?.data?.error || 'Failed to fetch data from Pexels.';
    res.status(status).json({ error: message });
  }
};
