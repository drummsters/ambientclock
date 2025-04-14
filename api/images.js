// api/images.js
import { Pool } from 'pg';

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
        // Use ON CONFLICT DO NOTHING to ignore duplicates based on the UNIQUE constraint on 'url'
        const query = `
            INSERT INTO image_urls (provider, url, metadata)
            SELECT provider, url, metadata::jsonb FROM jsonb_to_recordset($1::jsonb) AS x(provider TEXT, url TEXT, metadata JSONB)
            ON CONFLICT (url) DO NOTHING;
        `;
        const result = await client.query(query, [JSON.stringify(urlsData)]);
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

// Helper function to get random URLs for a provider
async function getRandomUrlsFromDb(provider, count = 10) {
    const client = await pool.connect();
    let urls = [];
    try {
        // Use TABLESAMPLE SYSTEM for efficiency if table is large, otherwise ORDER BY RANDOM()
        // Note: TABLESAMPLE might not be perfectly random but is faster.
        // Adjust the sampling percentage or method as needed.
        // For smaller tables, ORDER BY RANDOM() is fine.
        const query = `
            SELECT url, metadata FROM image_urls
            WHERE provider = $1
            ORDER BY RANDOM()
            LIMIT $2;
        `;
        // Alternative using TABLESAMPLE (adjust percentage as needed, e.g., 10%)
        // const query = `
        //     SELECT url, metadata FROM image_urls TABLESAMPLE SYSTEM(10)
        //     WHERE provider = $1
        //     LIMIT $2;
        // `;
        const result = await client.query(query, [provider, count]);
        urls = result.rows; // [{ url: '...', metadata: {...} }, ...]
    } catch (error) {
        console.error(`Error fetching random URLs for provider ${provider}:`, error);
        // Don't throw, return empty array on error
    } finally {
        client.release();
    }
    return urls;
}


// Main API handler function for Vercel
export default async function handler(request, response) {
    // Ensure this function only runs in Vercel environment with DB configured
    if (!process.env.POSTGRES_URL || !process.env.VERCEL_ENV) {
         return response.status(500).json({ error: 'Database not configured or not in Vercel environment' });
    }

    try {
        if (request.method === 'GET') {
            // --- Handle GET request: Fetch random URLs ---
            const provider = request.query.provider;
            const count = parseInt(request.query.count || '10', 10);

            if (!provider) {
                return response.status(400).json({ error: 'Missing required query parameter: provider' });
            }
            if (isNaN(count) || count <= 0) {
                 return response.status(400).json({ error: 'Invalid count parameter' });
            }

            console.log(`[API] GET /api/images?provider=${provider}&count=${count}`);
            const urls = await getRandomUrlsFromDb(provider, count);
            console.log(`[API] Found ${urls.length} URLs for ${provider}`);

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
