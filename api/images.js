// api/images.js
import pkg from 'pg'; // Use default import for CommonJS module
const { Pool } = pkg; // Destructure Pool from the default import

// Initialize the connection pool using the environment variable
// Vercel automatically injects environment variables defined in the project settings
const pool = new Pool({
    connectionString: process.env.POSTGRES_URL,
    // Vercel recommends these settings for serverless functions
    max: 1, // Max 1 connection per function instance
    idleTimeoutMillis: 5000, // Close idle connections after 5 seconds
    connectionTimeoutMillis: 2000, // Timeout if connection takes > 2 seconds
});

// Helper function to add URLs, avoiding duplicates
async function addUrlsToDb(urlsData) {
    if (!urlsData || urlsData.length === 0) {
        return { added: 0, skipped: 0 };
    }

    const client = await pool.connect();
    let addedCount = 0;
    let skippedCount = 0;

    try {
        // Use ON CONFLICT DO NOTHING based on the composite primary key (provider, provider_image_id)
        // Added provider_image_id and search_query columns
        const insertQuery = `
            INSERT INTO image_urls (provider, provider_image_id, url, search_query, metadata)
            SELECT provider, provider_image_id, url, search_query, metadata::jsonb
            FROM jsonb_to_recordset($1::jsonb) AS x(provider TEXT, provider_image_id TEXT, url TEXT, search_query TEXT, metadata JSONB)
            ON CONFLICT (provider, provider_image_id) DO NOTHING;
        `;
        const result = await client.query(insertQuery, [JSON.stringify(urlsData)]);
        addedCount = result.rowCount;
        skippedCount = urlsData.length - addedCount;
    } catch (error) {
        console.error('Error adding URLs to DB:', error);
        // Don't throw, just log the error and return counts
    } finally {
        client.release();
    }
    return { added: addedCount, skipped: skippedCount };
}

// Helper function to get random URLs for a provider and specific query
async function getRandomUrlsFromDb(provider, queryFilter, count = 10) { // Added queryFilter parameter
    const client = await pool.connect();
    let urls = [];
    try {
        // Use TABLESAMPLE SYSTEM for efficiency if table is large, otherwise ORDER BY RANDOM()
        // Note: TABLESAMPLE might not be perfectly random but is faster.
        // Adjust the sampling percentage or method as needed.
        // For smaller tables, ORDER BY RANDOM() is fine.
        // Added search_query filter
        const selectQuery = `
            SELECT url, metadata FROM image_urls
            WHERE provider = $1 AND search_query = $2
            ORDER BY RANDOM()
            LIMIT $3;
        `;
        // Alternative using TABLESAMPLE (adjust percentage as needed, e.g., 10%)
        // const selectQuery = `
        //     SELECT url, metadata FROM image_urls TABLESAMPLE SYSTEM(10)
        //     WHERE provider = $1 AND search_query = $2
        //     LIMIT $3;
        // `;
        const result = await client.query(selectQuery, [provider, queryFilter, count]);
        urls = result.rows; // [{ url: '...', metadata: {...} }, ...]
    } catch (error) {
        console.error(`Error fetching random URLs for provider ${provider} and query ${queryFilter}:`, error);
        // Don't throw, return empty array on error
    } finally {
        client.release();
    }
    return urls;
}


// Main API handler function for Vercel
export default async function handler(request, response) {
    // Ensure the database connection string is configured
    if (!process.env.POSTGRES_URL) {
         console.error('[API/Images] POSTGRES_URL environment variable is not set.');
         return response.status(500).json({ error: 'Database connection string is not configured' });
    }

    try {
        if (request.method === 'GET') {
            // --- Handle GET request: Fetch random URLs ---
            const provider = request.query.provider;
            const queryFilter = request.query.query; // Get the search query filter
            const count = parseInt(request.query.count || '10', 10);

            if (!provider) {
                return response.status(400).json({ error: 'Missing required query parameter: provider' });
            }
            if (!queryFilter) { // Also require query filter now
                return response.status(400).json({ error: 'Missing required query parameter: query' });
            }
            if (isNaN(count) || count <= 0) {
                 return response.status(400).json({ error: 'Invalid count parameter' });
            }

            console.log(`[API] GET /api/images?provider=${provider}&query=${queryFilter}&count=${count}`);
            const urls = await getRandomUrlsFromDb(provider, queryFilter, count); // Pass queryFilter
            console.log(`[API] Found ${urls.length} URLs for provider ${provider} and query ${queryFilter}`);

            return response.status(200).json({ urls });

        } else if (request.method === 'POST') {
            // --- Handle POST request: Add new URLs ---
            // Expects body like: { urls: [{ provider: '...', url: '...', metadata: {...} }, ...] }
            const { urls: urlsToAdd } = request.body;

            if (!Array.isArray(urlsToAdd) || urlsToAdd.length === 0) {
                return response.status(400).json({ error: 'Invalid request body. Expected { urls: [...] }' });
            }

            console.log(`[API] POST /api/images - Received ${urlsToAdd.length} URLs to add.`);
            const result = await addUrlsToDb(urlsToAdd);
            console.log(`[API] Added ${result.added} URLs, skipped ${result.skipped} duplicates.`);

            return response.status(200).json({ success: true, added: result.added, skipped: result.skipped });

        } else {
            // Handle unsupported methods
            response.setHeader('Allow', ['GET', 'POST']);
            return response.status(405).end(`Method ${request.method} Not Allowed`);
        }
    } catch (error) {
        console.error('[API] Unhandled error in /api/images:', error);
        return response.status(500).json({ error: 'Internal Server Error' });
    }
}
