import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BackgroundService } from '../../js/services/background-service.js';
import { EventBus } from '../../js/core/event-bus.js';
import { StateManager } from '../../js/core/state-manager.js';
// Mock dependencies
vi.mock('../../js/core/event-bus.js', () => ({
    EventBus: {
        subscribe: vi.fn(() => ({ unsubscribe: vi.fn() })),
        publish: vi.fn(),
    },
}));
vi.mock('../../js/core/state-manager.js', () => ({
    StateManager: {
        getState: vi.fn(() => ({ settings: { background: {} }, currentImageMetadata: null })),
        update: vi.fn(),
        getNestedValue: vi.fn(),
    },
}));
vi.mock('../../js/services/image-background-handler.js'); // Auto-mock the class
vi.mock('../../js/services/image-providers/unsplash-provider.js');
vi.mock('../../js/services/image-providers/pexels-provider.js');
vi.mock('../../js/services/image-providers/peapix-provider.js');
vi.mock('../../js/utils/logger.js', () => ({
    log: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
}));

describe('BackgroundService', () => {
    let backgroundService;
    let mockContainerA;
    let mockContainerB;
    let mockOverlay;
    let mockConfigManager;
    let mockFavoritesService;

    beforeEach(() => {
        // Reset mocks before each test
        vi.clearAllMocks();

        // Create mock DOM elements
        mockContainerA = document.createElement('div');
        mockContainerB = document.createElement('div');
        mockOverlay = document.createElement('div');
        document.body.appendChild(mockContainerA);
        document.body.appendChild(mockContainerB);
        document.body.appendChild(mockOverlay);

        // Mock dependencies
        mockConfigManager = {
            // Add mock methods/properties as needed by BackgroundService
        };
        mockFavoritesService = {
            // Add mock methods/properties as needed by BackgroundService
             getFavoritesCount: vi.fn(() => 0),
             getRandomFavorite: vi.fn(() => null),
        };

        // Instantiate the service
        backgroundService = new BackgroundService(
            mockContainerA,
            mockContainerB,
            mockOverlay,
            mockConfigManager,
            mockFavoritesService
        );
    });

    // Cleanup mock DOM elements after each test
    // afterEach(() => {
    //     document.body.removeChild(mockContainerA);
    //     document.body.removeChild(mockContainerB);
    //     document.body.removeChild(mockOverlay);
    // });

    it('should instantiate without errors', () => {
        expect(backgroundService).toBeInstanceOf(BackgroundService);
    });

    it('should register default providers during init', async () => {
        await backgroundService.init();
        expect(backgroundService.imageProviders.has('unsplash')).toBe(true);
        expect(backgroundService.imageProviders.has('pexels')).toBe(true);
        expect(backgroundService.imageProviders.has('peapix')).toBe(true);
    });

    it('should subscribe to necessary EventBus events during init', async () => {
        await backgroundService.init();
        expect(EventBus.subscribe).toHaveBeenCalledWith('state:initialized', expect.any(Function));
        expect(EventBus.subscribe).toHaveBeenCalledWith('state:settings.background:changed', expect.any(Function));
        expect(EventBus.subscribe).toHaveBeenCalledWith('background:refresh', expect.any(Function));
        expect(EventBus.subscribe).toHaveBeenCalledWith('background:setFromFavorite', expect.any(Function));
    });

    // Add more tests for applyBackground, applyOverlay, cycling, etc.
    // Example for applyOverlay:
    it('should apply overlay style correctly', () => {
        backgroundService.applyOverlay(0.7, '#FF0000');
        // JSDOM doesn't compute colors perfectly, check rgba string
        expect(mockOverlay.style.backgroundColor).toBe('rgba(255, 0, 0, 0.7)');

        backgroundService.applyOverlay(0.2); // Test default color
        expect(mockOverlay.style.backgroundColor).toBe('rgba(0, 0, 0, 0.2)');

         backgroundService.applyOverlay(); // Test default opacity and color
        expect(mockOverlay.style.backgroundColor).toBe('rgba(0, 0, 0, 0.5)');
    });

     it('should apply color background correctly when type is color', async () => {
        const config = { type: 'color', color: '#123456' };
        await backgroundService.applyBackground(config);

        // Check if ColorBackgroundHandler was used (mock its constructor/methods if needed)
        // For now, check styles directly
        expect(mockContainerA.style.backgroundColor).toBe('rgb(18, 52, 86)'); // JSDOM converts hex
        expect(mockContainerB.style.backgroundColor).toBe('rgb(18, 52, 86)');
        expect(mockContainerA.style.opacity).toBe('1');
        expect(mockContainerB.style.opacity).toBe('0');
        expect(backgroundService.currentBackgroundHandler.type).toBe('color');
    });

    // TODO: Add tests for image background handling (requires mocking ImageBackgroundHandler)
    // TODO: Add tests for cycling logic (requires vi.useFakeTimers)
    // TODO: Add tests for destroy method (check unsubscribers)

});
