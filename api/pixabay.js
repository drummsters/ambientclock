import axios from 'axios'; // Import axios for internal POST request

const PIXABAY_BATCH_SIZE = 50; // Fetch larger batches for client-side caching/randomization

export default async function handler(req, res) {
    // Allow requests from any origin (adjust for production if needed)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const apiKey = process.env.PIXABAY_API_KEY; // Ensure this is set in Vercel environment variables

    // Get parameters from query string
    const { q: query, orientation = 'horizontal', page = 1 } = req.query;

    if (!apiKey) {
        console.error('[API/Pixabay] API key is missing!');
        return res.status(500).json({ error: 'Pixabay API key is missing' });
    }

    if (!query) {
        return res.status(400).json({ error: 'Query parameter (q) is required' });
    }

    // Construct Pixabay API URL with desired parameters
    const params = new URLSearchParams({
        key: apiKey,
        q: query,
        image_type: 'photo',
        orientation: orientation,
        min_width: 1920,
        min_height: 1080,
        safesearch: 'true',
        per_page: PIXABAY_BATCH_SIZE.toString(),
        page: page.toString()
    });
    const url = `https://pixabay.com/api/?${params.toString()}`;
    console.log(`[API/Pixabay] Fetching URL: ${url}`); // Log the final URL

    try {
        const response = await fetch(url);
        if (!response.ok) {
            console.error('Pixabay API error:', response.status, response.statusText);
            return res.status(response.status).json({ error: `Pixabay API error: ${response.status} ${response.statusText}` });
        }

        const data = await response.json();
        console.log(`[API/Pixabay] Successfully fetched data. Found ${data.hits?.length || 0} hits.`);

        // --- Start: Add URLs to DB ---
        if (data && Array.isArray(data.hits) && data.hits.length > 0) {
            const urlsToDb = data.hits.map(hit => ({
                provider: 'pixabay',
                url: hit.largeImageURL || hit.webformatURL, // Prefer large, fallback to web format
                metadata: {
                    photographer: hit.user,
                    photographer_id: hit.user_id, // Pixabay provides user ID
                    tags: hit.tags,
                    source_url: hit.pageURL, // Link back to the Pixabay page
                    width: hit.imageWidth, // Note the property names
                    height: hit.imageHeight,
                    views: hit.views,
                    downloads: hit.downloads,
                    likes: hit.likes,
                    comments: hit.comments,
                    // Include different sizes if needed
                    src_preview: hit.previewURL,
                    src_webformat: hit.webformatURL,
                }
            }));

            // Make internal POST request to our own /api/images endpoint using relative path
            const relativeApiPath = '/api/images';
            console.log(`[API/Pixabay] Posting ${urlsToDb.length} URLs to internal endpoint: ${relativeApiPath}`);

            // Fire-and-forget the POST request using the relative path
            axios.post(relativeApiPath, { urls: urlsToDb })
                .then(dbResponse => {
                    console.log(`[API/Pixabay -> DB] Success: Added ${dbResponse.data.added}, Skipped ${dbResponse.data.skipped}`);
                })
                .catch(dbError => {
                    // Log detailed error if possible
                    const errorDetails = dbError.response ? JSON.stringify(dbError.response.data) : dbError.message;
                    console.error(`[API/Pixabay -> DB] Error posting to ${relativeApiPath}: ${errorDetails}`);
                });
        }
        // --- End: Add URLs to DB ---

        res.status(200).json(data); // Return original Pixabay data
    } catch (error) {
        console.error('Error fetching from Pixabay API:', error);
        res.status(500).json({ error: 'Failed to fetch images from Pixabay' });
    }
}
