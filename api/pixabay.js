const PIXABAY_BATCH_SIZE = 50; // Fetch larger batches for client-side caching/randomization

export default async function handler(req, res) {
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
        res.status(200).json(data);
    } catch (error) {
        console.error('Error fetching from Pixabay API:', error);
        res.status(500).json({ error: 'Failed to fetch images from Pixabay' });
    }
}
