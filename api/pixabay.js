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

        // --- Persist URLs to DB via /api/images endpoint ---
        const hits = data?.hits;
        if (Array.isArray(hits) && hits.length > 0) {
            const urlsToPersist = hits.map(hit => ({
                provider: 'pixabay',
                provider_image_id: hit.id.toString(), // Ensure ID is string
                url: hit.largeImageURL || hit.webformatURL, // Prefer large, fallback to web format
                search_query: query, // Add the search query used
                metadata: { // Store relevant metadata
                    id: hit.id, // Keep original id in metadata
                    pageURL: hit.pageURL,
                    type: hit.type,
                    tags: hit.tags,
                    previewURL: hit.previewURL,
                    previewWidth: hit.previewWidth,
                    previewHeight: hit.previewHeight,
                    webformatURL: hit.webformatURL,
                    webformatWidth: hit.webformatWidth,
                    webformatHeight: hit.webformatHeight,
                    largeImageURL: hit.largeImageURL,
                    imageWidth: hit.imageWidth,
                    imageHeight: hit.imageHeight,
                    imageSize: hit.imageSize,
                    views: hit.views,
                    downloads: hit.downloads,
                    collections: hit.collections,
                    likes: hit.likes,
                    comments: hit.comments,
                    user_id: hit.user_id,
                    user: hit.user,
                    userImageURL: hit.userImageURL
                }
            }));

            const payload = { urls: urlsToPersist };

            try {
                // Construct absolute URL for the internal API call
                const protocol = req.headers['x-forwarded-proto'] || 'http';
                const host = req.headers['x-forwarded-host'] || req.headers.host;
                const internalApiUrl = `${protocol}://${host}/api/images`;

                console.log(`[API/Pixabay] Sending ${payload.urls.length} URLs to internal endpoint: ${internalApiUrl}`);

                // Await the fetch and response processing
                const dbResponse = await fetch(internalApiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                // Process and log the response
                try {
                    const dbResult = await dbResponse.json();
                    if (dbResponse.ok) {
                        console.log(`[API/Pixabay] DB Persistence: Added ${dbResult.added}, Skipped ${dbResult.skipped}`);
                    } else {
                        console.error(`[API/Pixabay] DB Persistence Error: ${dbResult.error || dbResponse.statusText}`);
                    }
                } catch (logError) {
                    console.error('[API/Pixabay] Error processing DB response JSON:', logError);
                    try {
                        const textResponse = await dbResponse.text();
                        console.error('[API/Pixabay] Raw DB response text:', textResponse);
                    } catch (textError) {
                        console.error('[API/Pixabay] Could not get raw text from DB response:', textError);
                    }
                }

            } catch (dbError) {
                console.error('[API/Pixabay] Error during internal fetch or setup:', dbError);
            }
        }
        // --- End Persist URLs ---

        // Return original Pixabay data to client
        res.status(200).json(data);

    } catch (error) {
        console.error('Error fetching from Pixabay API or during persistence step:', error);
        res.status(500).json({ error: 'Failed to fetch images from Pixabay' });
    }
}
