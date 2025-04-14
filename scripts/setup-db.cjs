// scripts/setup-db.js
const { Pool } = require('pg');
require('dotenv').config(); // To load environment variables like the connection string

// Get the connection string from environment variables
// IMPORTANT: Ensure POSTGRES_URL is set in your environment or a .env file
const connectionString = process.env.POSTGRES_URL;

if (!connectionString) {
  console.error('Error: POSTGRES_URL environment variable is not set.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: connectionString,
});

const createTableQuery = `
CREATE TABLE IF NOT EXISTS image_urls (
  id SERIAL PRIMARY KEY,
  provider VARCHAR(50) NOT NULL,
  url TEXT NOT NULL UNIQUE, -- Ensure URLs are unique
  metadata JSONB, -- Store additional data like author, description, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Optional: Add an index for faster lookups by provider
CREATE INDEX IF NOT EXISTS idx_image_urls_provider ON image_urls(provider);

-- Optional: Add an index for faster lookups by url (already handled by UNIQUE constraint)
-- CREATE INDEX IF NOT EXISTS idx_image_urls_url ON image_urls(url);
`;

async function setupDatabase() {
  let client;
  try {
    client = await pool.connect();
    console.log('Connected to the database.');

    console.log('Executing CREATE TABLE query...');
    await client.query(createTableQuery);
    console.log('Table "image_urls" created successfully or already exists.');

  } catch (err) {
    console.error('Error setting up database:', err.stack);
  } finally {
    if (client) {
      client.release(); // Release the client back to the pool
      console.log('Database client released.');
    }
    await pool.end(); // Close the pool
    console.log('Database pool closed.');
  }
}

setupDatabase();
