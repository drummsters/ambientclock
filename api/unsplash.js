import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Determine the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.local ONLY if not in production (Vercel sets VERCEL_ENV)
if (process.env.VERCEL_ENV !== 'production') {
  dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
  console.log('[API/Unsplash] Loaded .env.local for non-production environment.');
}

// Vercel environment variable (or similar for other platforms)
// Now loaded by dotenv if not already set by Vercel
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
  const { query, orientation, count = 10 } = req.query; // Default count to 10

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
        count: count
      }
    });

    console.log('[API/Unsplash] Successfully fetched data from Unsplash.');
    // Return the data received from Unsplash
    res.status(200).json(response.data);

  } catch (error) {
    console.error('[API/Unsplash] Error fetching from Unsplash:', error.response?.data || error.message);
    const status = error.response?.status || 500;
    const message = error.response?.data?.errors?.[0] || 'Failed to fetch data from Unsplash.';
    res.status(status).json({ error: message });
  }
};
