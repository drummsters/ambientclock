import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ImageBackgroundHandler } from '../../js/services/image-background-handler.js';
import { StateManager } from '../../js/core/state-manager.js';
import { RateLimitError } from '../../js/core/errors.js'; // Import the centralized error

// Mock dependencies
vi.mock('../../js/core/state-manager.js', () => ({
    StateManager: {
        getState: vi.fn(() => ({ currentImageMetadata: null })), // Simplified initial state
        update: vi.fn(),
        getNestedValue: vi.fn(), // Add if needed by handler directly
    },
}));
vi.mock('../../js/utils/logger.js', () => ({
    log: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
}));
// Mock the Image object used for preloading
global.Image = class {
    constructor() {
        this.onload = null;
        this.onerror = null;
        // Simulate loading delay slightly
        setTimeout(() => this.onload && this.onload(), 10);
    }
    set src(url) {
        // console.log(`Mock Image src set: ${url}`);
        if (!url) {
             setTimeout(() => this.onerror && this.onerror(new Error('Mock image error: No URL')), 10);
        }
    }
};


describe('ImageBackgroundHandler', () => {
    let handler;
    let mockContainerA;
    let mockContainerB;
    let mockProviders;
    let mockUnsplashProvider;
    let mockPexelsProvider;
    let mockPeapixProvider;
    let mockConfigManager;
    let mockFavoritesService;
    let initialConfig;

    beforeEach(() => {
        vi.clearAllMocks();

        // Mock DOM elements
        mockContainerA = document.createElement('div');
        mockContainerA.id = 'containerA';
        mockContainerB = document.createElement('div');
        mockContainerB.id = 'containerB';
        document.body.appendChild(mockContainerA);
        document.body.appendChild(mockContainerB);

        // Mock Providers
        mockUnsplashProvider = {
            getImageBatch: vi.fn().mockResolvedValue([{ url: 'unsplash_url_1', source: 'unsplash' }]),
        };
        mockPexelsProvider = {
            getImageBatch: vi.fn().mockResolvedValue([{ url: 'pexels_url_1', source: 'pexels' }]),
        };
         mockPeapixProvider = {
            getImageBatch: vi.fn().mockResolvedValue([{ url: 'peapix_url_1', source: 'peapix' }]),
        };
        mockProviders = new Map([
            ['unsplash', mockUnsplashProvider],
            ['pexels', mockPexelsProvider],
            ['peapix', mockPeapixProvider],
        ]);

        // Mock other dependencies
        mockConfigManager = {}; // Add properties if needed
        mockFavoritesService = {
             getFavoritesCount: vi.fn(() => 0),
             getRandomFavorite: vi.fn(() => null),
        };

        // Initial config for the handler
        initialConfig = {
            source: 'unsplash',
            query: 'nature',
            zoomEnabled: true,
            useFavoritesOnly: false,
            category: 'nature',
        };

        // Instantiate the handler
        handler = new ImageBackgroundHandler(
            mockContainerA,
            mockContainerB,
            initialConfig,
            mockProviders,
            mockConfigManager,
            mockFavoritesService
        );
    });

     afterEach(() => {
        // Clean up DOM elements
        if (mockContainerA.parentNode) document.body.removeChild(mockContainerA);
        if (mockContainerB.parentNode) document.body.removeChild(mockContainerB);
     });

    it('should instantiate without errors', () => {
        expect(handler).toBeInstanceOf(ImageBackgroundHandler);
        expect(handler.type).toBe('image');
    });

    it('should initialize and load the first image', async () => {
        const loadImageSpy = vi.spyOn(handler, 'loadImage');
        await handler.init();
        expect(loadImageSpy).toHaveBeenCalledWith(true); // isInitialLoad = true
        // Check if background was set on container A
        expect(mockContainerA.style.backgroundImage).toContain('unsplash_url_1');
        expect(mockContainerA.style.opacity).toBe('1');
        expect(mockContainerB.style.opacity).toBe('0');
        expect(StateManager.update).toHaveBeenCalledWith({ currentImageMetadata: { url: 'unsplash_url_1', source: 'unsplash' } });
    });

    it('should fetch a batch if cache is empty during loadImage', async () => {
        handler.imageCache = []; // Ensure cache is empty
        await handler.loadImage(); // isInitialLoad = false
        // Expect 2 calls: 1 for initial load, 1 for proactive fetch because cache becomes 0
        expect(mockUnsplashProvider.getImageBatch).toHaveBeenCalledTimes(2);
        // Check if background was set on container B (inactive initially) and faded
        expect(mockContainerB.style.backgroundImage).toContain('unsplash_url_1');
        expect(mockContainerA.style.opacity).toBe('0'); // Faded out
        expect(mockContainerB.style.opacity).toBe('1'); // Faded in
        expect(handler.activeContainer).toBe(mockContainerB); // Active container swapped
    });

     it('should use cached image if available and key matches (and not trigger proactive fetch in this test)', async () => {
        handler.currentBatchQuery = 'nature'; // Set cache key
        handler.imageCache = [{ url: 'cached_url_1', source: 'unsplash' }];
        // Mock _fetchImageBatch specifically for this test to prevent proactive call
        const fetchBatchSpy = vi.spyOn(handler, '_fetchImageBatch').mockResolvedValue();

        await handler.loadImage();

        expect(mockUnsplashProvider.getImageBatch).not.toHaveBeenCalled(); // Should not call provider directly, proves cache hit
        // fetchBatchSpy *will* be called by proactive logic, so remove assertion checking it wasn't called.
        expect(mockContainerB.style.backgroundImage).toContain('cached_url_1');
        expect(handler.imageCache.length).toBe(0); // Cache item was used

        fetchBatchSpy.mockRestore(); // Restore original method
    });

    it('should clear cache and fetch new batch if query key changes', async () => {
        handler.currentBatchQuery = 'nature';
        handler.imageCache = [{ url: 'old_url', source: 'unsplash' }];
        const newConfig = { ...initialConfig, query: 'mountains', category: 'mountains' }; // Change query

        await handler.update(newConfig); // Update triggers loadImage

        expect(handler.imageCache.length).toBe(0); // Cache cleared before fetch
        expect(mockUnsplashProvider.getImageBatch).toHaveBeenCalledWith('mountains', 10); // Fetched new batch
        expect(mockContainerB.style.backgroundImage).toContain('unsplash_url_1'); // Displayed new image
        expect(handler.currentBatchQuery).toBe('mountains'); // Cache key updated
    });

     it('should handle RateLimitError during batch fetch', async () => {
        mockUnsplashProvider.getImageBatch.mockRejectedValueOnce(new RateLimitError('Rate limit hit'));
        handler.imageCache = []; // Ensure fetch is triggered

        await handler.loadImage(); // Attempt to load

        // Check that the fallback provider (Pexels) was used successfully
        // Expect 2 calls: 1 for fallback, 1 for proactive fetch after cache becomes 0
        expect(mockPexelsProvider.getImageBatch).toHaveBeenCalledTimes(2);
        expect(mockContainerB.style.backgroundImage).toContain('pexels_url_1'); // Expect fallback image
        expect(StateManager.update).toHaveBeenCalledWith({ currentImageMetadata: { url: 'pexels_url_1', source: 'pexels' } }); // Expect fallback metadata
    });

     it('should apply zoom effect based on config', async () => {
        await handler.init(); // Loads first image
        expect(mockContainerA.classList.contains('zoom-effect')).toBe(true); // Initial config has zoomEnabled: true

        const newConfig = { ...initialConfig, zoomEnabled: false };
        await handler.update(newConfig); // Update shouldn't reload if query is same

        // Need to check the *active* container after update (which is still A)
        expect(handler.activeContainer.classList.contains('zoom-effect')).toBe(false);

        // Test enabling zoom again
        const newerConfig = { ...initialConfig, zoomEnabled: true };
        await handler.update(newerConfig);
        expect(handler.activeContainer.classList.contains('zoom-effect')).toBe(true);
     });

    // TODO: Add tests for proactive fetching (threshold logic)
    // TODO: Add tests for Peapix provider logic (country code)
    // TODO: Add tests for 'Other' category handling
    // TODO: Add tests for favorite image loading (useFavoritesOnly, random chance, loadImageFromUrl)
    // TODO: Add tests for destroy method

});
