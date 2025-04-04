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
  const { query, orientation, per_page = 15 } = req.query; // Default per_page

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
        per_page: per_page
      }
    });

    console.log('[API/Pexels] Successfully fetched data from Pexels.');
    // Return the data received from Pexels (usually nested under 'photos')
    res.status(200).json(response.data);

  } catch (error) {
    console.error('[API/Pexels] Error fetching from Pexels:', error.response?.data || error.message);
    const status = error.response?.status || 500;
    const message = error.response?.data?.error || 'Failed to fetch data from Pexels.';
    res.status(status).json({ error: message });
  }
};
