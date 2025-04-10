/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Use jsdom to simulate the DOM environment for testing UI components
    environment: 'jsdom',
    // Optional: Glob patterns for test files
    // include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    // Optional: Setup files to run before tests (e.g., for global mocks)
    // setupFiles: ['./tests/setup.js'],
  },
});
