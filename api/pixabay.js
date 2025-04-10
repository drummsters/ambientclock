export default async function handler(req, res) {
    const apiKey = process.env.PIXABAY_API_KEY; // Ensure this is set in Vercel environment variables
    // console.log('[API/Pixabay] Attempting to read PIXABAY_API_KEY...'); // Logging removed for now
    // console.log(`[API/Pixabay] PIXABAY_API_KEY value: ${apiKey ? 'Loaded' : 'MISSING or undefined'}`); // Logging removed for now

    const { q: query, count = 10 } = req.query;

    if (!apiKey) {
        // console.error('[API/Pixabay] API key is missing!'); // Logging removed for now
        return res.status(500).json({ error: 'Pixabay API key is missing' });
    }

    if (!query) {
        return res.status(400).json({ error: 'Query parameter is required' });
    }

    const url = `https://pixabay.com/api/?key=${apiKey}&q=${encodeURIComponent(query)}&per_page=${count}&safesearch=true`;

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
