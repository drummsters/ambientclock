import { StateManager } from '../core/state-manager.js';
import { EventBus } from '../core/event-bus.js';
import { ImageBackgroundHandler } from './image-background-handler.js';
import { UnsplashProvider } from './image-providers/unsplash-provider.js';
import { PexelsProvider } from './image-providers/pexels-provider.js';
import { PeapixProvider } from './image-providers/peapix-provider.js';
import { PixabayProvider } from './image-providers/pixabay-provider.js';
import { determineImageQueryKey } from './utils/background-helpers.js';

/**
 * Manages the application's background (color, image, or YouTube video) and overlay,
 * supporting cross-fade transitions between images and video backgrounds.
 */
export class BackgroundService {
  /**
   * Creates a BackgroundService instance.
   * @param {HTMLElement} backgroundContainerA - The first DOM element for the background layer.
   * @param {HTMLElement} backgroundContainerB - The second DOM element for the background layer.
   * @param {HTMLElement} overlayContainer - The DOM element for the overlay layer.
   * @param {ConfigManager} configManager - The application's configuration manager.
   */
  constructor(backgroundContainerA, backgroundContainerB, overlayContainer, configManager, favoritesService) {
    if (!backgroundContainerA || !backgroundContainerB || !overlayContainer) {
      throw new Error('BackgroundService requires valid background (A & B) and overlay container elements.');
    }
    if (!configManager) {
      throw new Error('BackgroundService requires a ConfigManager instance.');
    }
    if (!favoritesService) {
      throw new Error('BackgroundService requires a FavoritesService instance.');
    }

    this.backgroundContainerA = backgroundContainerA;
    this.backgroundContainerB = backgroundContainerB;
    this.overlayContainer = overlayContainer;
    this.configManager = configManager;
    this.favoritesService = favoritesService;
    this.currentBackgroundHandler = null;
    this.imageProviders = new Map();
    this.unsubscribeState = null;
    this.unsubscribeRefresh = null;
    this.unsubscribeSetFromFavorite = null;
    this.backgroundIntervalId = null;

    console.log('BackgroundService created.');
  }

  /**
   * Initializes the BackgroundService.
   * Registers image providers and sets the initial background based on state.
   * @returns {Promise<void>}
   */
  async init() {
    console.log('BackgroundService initializing...');

    this.registerProvider('unsplash', new UnsplashProvider());
    this.registerProvider('pexels', new PexelsProvider());
    this.registerProvider('peapix', new PeapixProvider());
    this.registerProvider('pixabay', new PixabayProvider());

    EventBus.subscribe('state:initialized', (fullState) => {
      console.log('[BackgroundService] state:initialized event received. Full state:', fullState);
      const backgroundState = fullState.settings?.background;
      console.log('[BackgroundService] Received initial state from state:initialized', backgroundState);
      this.applyBackground(backgroundState || {});
    });

    const backgroundSubscription = EventBus.subscribe('state:settings.background:changed', (backgroundState) => {
      console.log('[BackgroundService] EventBus state:settings.background:changed triggered. Received state:', backgroundState);
      this.applyBackground(backgroundState || {});
    });
    this.unsubscribeState = backgroundSubscription.unsubscribe;

    const refreshSubscription = EventBus.subscribe('background:refresh', () => {
        console.log('[BackgroundService] Received background:refresh command.');
        this.loadNextImage();
    });
    this.unsubscribeRefresh = refreshSubscription.unsubscribe;

    const setFromFavoriteSubscription = EventBus.subscribe('background:setFromFavorite', (favoriteData) => {
        console.log('[BackgroundService] Received background:setFromFavorite event:', favoriteData);
        this.loadImageFromFavorite(favoriteData);
    });
    this.unsubscribeSetFromFavorite = setFromFavoriteSubscription.unsubscribe;

    console.log('BackgroundService initialized.');
  }

  /**
   * Registers an image provider service.
   * @param {string} name - The name of the provider (e.g., 'unsplash').
   * @param {object} providerInstance - An instance of the image provider class.
   */
  registerProvider(name, providerInstance) {
    this.imageProviders.set(name, providerInstance);
    console.log(`Image provider "${name}" registered.`);
  }

  /**
   * Applies the background based on the provided configuration.
   * Determines whether to show a color, image, or YouTube video background.
   * @param {object} config - The background configuration from `state.settings.background`.
   * @returns {Promise<void>}
   */
  async applyBackground(config) {
    console.log('[BackgroundService] applyBackground called with config:', config);

    // Clear previous background handler if type changes
    const newType = config.type || 'color';
    if (this.currentBackgroundHandler && this.currentBackgroundHandler.type !== newType) {
      this.currentBackgroundHandler.destroy();
      this.currentBackgroundHandler = null;
    }

    // Apply overlay using values from config (defaults handled within applyOverlay)
    this.applyOverlay(config.overlayOpacity, config.color);

    // Determine the correct handler based on type
    if (newType === 'image') {
        // ... (existing image logic unchanged)
        if (!this.currentBackgroundHandler || this.currentBackgroundHandler.type !== 'image') {
            console.log('[BackgroundService] Switching to ImageBackgroundHandler.');
            this.currentBackgroundHandler?.destroy();
            const selectedProviderName = config.provider || config.source || 'unsplash';
            if (!this.imageProviders.has(selectedProviderName)) {
                 console.warn(`[BackgroundService] Selected image provider "${selectedProviderName}" is not configured or registered. Falling back to color.`);
                 this.currentBackgroundHandler?.destroy();
                 this.currentBackgroundHandler = null;
                 await this.applyBackground({ ...config, type: 'color' });
                 return;
            }
            const processedConfig = { 
                ...config,
                source: selectedProviderName,
                provider: selectedProviderName
            };
            const queryKey = determineImageQueryKey(processedConfig);
            if (queryKey) {
                if (processedConfig.source === 'peapix') {
                    processedConfig.peapixCountry = queryKey;
                    delete processedConfig.query;
                } else {
                    processedConfig.query = queryKey;
                }
            } else {
                delete processedConfig.query;
            }
            this.currentBackgroundHandler = new ImageBackgroundHandler(
                this.backgroundContainerA,
                this.backgroundContainerB,
                processedConfig,
                this.imageProviders,
                this.configManager,
                this.favoritesService
            );
            await this.currentBackgroundHandler.init();
            this.updateCycling(config);
        } else {
            console.log('[BackgroundService] Updating existing ImageBackgroundHandler.');
            const selectedProviderName = config.provider || config.source || 'unsplash';
            const processedConfig = { 
                ...config,
                source: selectedProviderName,
                provider: selectedProviderName
            };
            const queryKey = determineImageQueryKey(processedConfig);
             if (queryKey) {
                if (processedConfig.source === 'peapix') {
                    processedConfig.peapixCountry = queryKey;
                    delete processedConfig.query;
                } else {
                    processedConfig.query = queryKey;
                }
            } else {
                delete processedConfig.query;
            }
            await this.currentBackgroundHandler.update(processedConfig);
            this.updateCycling(config);
        }
    } else if (newType === 'youtube') {
        // --- YOUTUBE BACKGROUND HANDLER ---
        if (!this.currentBackgroundHandler || this.currentBackgroundHandler.type !== 'youtube') {
            console.log('[BackgroundService] Switching to YouTubeBackgroundHandler.');
            this.currentBackgroundHandler?.destroy(); // Ensure previous handler is destroyed
            this.currentBackgroundHandler = new YouTubeBackgroundHandler(
                this.backgroundContainerA,
                this.backgroundContainerB,
                config.youtubeVideoId,
                config.youtubeQuality
            );
            await this.currentBackgroundHandler.init();
        } else if (config.youtubeVideoId !== this.currentBackgroundHandler.videoId || 
                  config.youtubeQuality !== this.currentBackgroundHandler.quality) {
            // Only update if video ID or quality has actually changed
            console.log('[BackgroundService] Updating YouTube background with new video ID or quality');
            await this.currentBackgroundHandler.update(config.youtubeVideoId, config.youtubeQuality);
        } else {
            console.log('[BackgroundService] YouTube background already set with correct video ID and quality');
        }
        
        // Update state with YouTube video info only if needed
        if (config.youtubeVideoId !== StateManager.getState().currentImageMetadata?.videoId ||
            config.youtubeQuality !== StateManager.getState().currentImageMetadata?.quality) {
            StateManager.update({
              settings: {
                background: {
                  type: 'youtube',
                  youtubeVideoId: config.youtubeVideoId,
                  youtubeQuality: config.youtubeQuality || 'default'
                }
              },
              currentImageMetadata: {
                type: 'youtube',
                videoId: config.youtubeVideoId,
                quality: config.youtubeQuality || 'default'
              }
            });
        }
        
        // Stop cycling for YouTube backgrounds
        this.stopBackgroundCycling();
    } else {
        // Default to color background
        this.stopBackgroundCycling();
        if (!this.currentBackgroundHandler || this.currentBackgroundHandler.type !== 'color') {
             console.log('[BackgroundService] Switching to ColorBackgroundHandler.');
            this.currentBackgroundHandler?.destroy();
            this.currentBackgroundHandler = new ColorBackgroundHandler(
                this.backgroundContainerA,
                this.backgroundContainerB
            );
            await this.currentBackgroundHandler.init();
        }
        console.log('[BackgroundService] Updating existing ColorBackgroundHandler.');
        await this.currentBackgroundHandler.update(config);
    }
  }

  /**
   * Applies the overlay opacity and color.
   * @param {number} opacity - The opacity value (0 to 1).
   * @param {string} color - The base color for the overlay (hex string, e.g., '#000000').
   */
  applyOverlay(opacity = 0.5, color = '#000000') {
    const validOpacity = Math.max(0, Math.min(1, opacity));
    const validColor = color || '#000000';
    const hex = validColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    if (isNaN(r) || isNaN(g) || isNaN(b)) {
        console.error(`[BackgroundService] Invalid color format received: ${validColor}. Falling back to black.`);
        this.overlayContainer.style.backgroundColor = `rgba(0, 0, 0, ${validOpacity})`;
        return;
    }
    this.overlayContainer.style.backgroundColor = `rgba(${r}, ${g}, ${b}, ${validOpacity})`;
  }

  updateCycling(config) {
    if (config.type === 'image' && config.cycleEnabled && config.cycleInterval > 0) {
      this.startBackgroundCycling(config.cycleInterval);
    } else {
      this.stopBackgroundCycling();
    }
  }

  startBackgroundCycling(interval) {
    this.stopBackgroundCycling();
    if (interval > 0) {
      this.backgroundIntervalId = setInterval(() => {
        this.loadNextImage();
      }, interval);
    }
  }

  stopBackgroundCycling() {
    if (this.backgroundIntervalId) {
      clearInterval(this.backgroundIntervalId);
      this.backgroundIntervalId = null;
    }
  }

  async loadNextImage() {
    if (this.currentBackgroundHandler && typeof this.currentBackgroundHandler.loadNext === 'function') {
      await this.currentBackgroundHandler.loadNext();
    }
  }

    async loadImageFromFavorite(favoriteData) {
        if (!favoriteData) {
            console.warn('[BackgroundService] loadImageFromFavorite called with invalid favoriteData:', favoriteData);
            return;
        }

        // Determine type from favoriteData or fallback to 'unknown'
        const favoriteType = favoriteData.type || favoriteData.provider || 'unknown';

        // Fix: Accept 'unknown' as valid type for images (some favorites have 'unknown' provider and no explicit type)
        const validImageTypes = ['image', 'unknown'];

        if (favoriteType === 'youtube') {
            const videoId = favoriteData.url ? this._extractYouTubeVideoId(favoriteData.url) : '';
            const quality = favoriteData.youtubeQuality || 'default';
            
            // Check if we already have the same video with the same quality
            if (this.currentBackgroundHandler && 
                this.currentBackgroundHandler.type === 'youtube' &&
                this.currentBackgroundHandler.videoId === videoId &&
                this.currentBackgroundHandler.quality === quality) {
                console.log('[BackgroundService] YouTube favorite already loaded with same video ID and quality');
                return; // Skip reloading the same video with the same quality
            }
            
            if (!this.currentBackgroundHandler || this.currentBackgroundHandler.type !== 'youtube') {
                console.log('[BackgroundService] Creating new YouTubeBackgroundHandler for favorite');
                if (this.currentBackgroundHandler) {
                    this.currentBackgroundHandler.destroy();
                }
                this.currentBackgroundHandler = new YouTubeBackgroundHandler(
                    this.backgroundContainerA,
                    this.backgroundContainerB,
                    videoId,
                    quality
                );
                await this.currentBackgroundHandler.init();
            } else {
                console.log('[BackgroundService] Updating existing YouTubeBackgroundHandler for favorite');
                await this.currentBackgroundHandler.update(videoId, quality);
            }
            
            // Update state with YouTube video info
            StateManager.update({
              currentImageMetadata: {
                type: 'youtube',
                videoId: videoId,
                quality: quality
              }
            });
        } else if (validImageTypes.includes(favoriteType)) {
            if (!this.currentBackgroundHandler || this.currentBackgroundHandler.type !== 'image') {
                if (this.currentBackgroundHandler) {
                    this.currentBackgroundHandler.destroy();
                }
                this.currentBackgroundHandler = new ImageBackgroundHandler(
                    this.backgroundContainerA,
                    this.backgroundContainerB,
                    favoriteData,
                    this.imageProviders,
                    this.configManager,
                    this.favoritesService
                );
                await this.currentBackgroundHandler.init();
            } else {
                await this.currentBackgroundHandler.update(favoriteData);
            }
        } else {
            console.warn('[BackgroundService] Unsupported favorite type:', favoriteType);
            return;
        }

        if (this.currentBackgroundHandler && typeof this.currentBackgroundHandler.loadImageFromUrl === 'function') {
            await this.currentBackgroundHandler.loadImageFromUrl(favoriteData);
        }
    }

    _extractYouTubeVideoId(url) {
        if (!url) return '';
        const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/))([A-Za-z0-9_-]{11})/);
        return match && match[1] ? match[1] : '';
    }

  destroy() {
    if (this.unsubscribeState) {
      this.unsubscribeState();
      this.unsubscribeState = null;
    }
    if (this.unsubscribeRefresh) {
        this.unsubscribeRefresh();
        this.unsubscribeRefresh = null;
    }
    if (this.unsubscribeSetFromFavorite) {
        this.unsubscribeSetFromFavorite();
        this.unsubscribeSetFromFavorite = null;
    }
    if (this.currentBackgroundHandler) {
      this.currentBackgroundHandler.destroy();
      this.currentBackgroundHandler = null;
    }
    this.stopBackgroundCycling();
  }
}

// --- Simple Handler for Color Background (Updated for two elements) ---
class ColorBackgroundHandler {
  constructor(containerA, containerB) {
    this.containerA = containerA;
    this.containerB = containerB;
    this.type = 'color';
  }

  async init() {
    this.containerA.style.backgroundImage = 'none';
    this.containerB.style.backgroundImage = 'none';
    this.containerA.style.opacity = '1';
    this.containerB.style.opacity = '0';
  }

  update(config) {
    const color = config.color || '#000000';
    this.containerA.style.backgroundColor = color;
    this.containerB.style.backgroundColor = color;
    this.containerA.style.opacity = '1';
    this.containerB.style.opacity = '0';
    const computedStyle = window.getComputedStyle(this.containerA);
    console.log(`[ColorBackgroundHandler] Computed background color (A): ${computedStyle.backgroundColor}`);
  }

  destroy() {
    console.log('ColorBackgroundHandler destroyed.');
  }
}

// --- Handler for YouTube Video Background ---
class YouTubeBackgroundHandler {
  constructor(containerA, containerB, videoId, quality) {
    this.containerA = containerA;
    this.containerB = containerB;
    this.type = 'youtube';
    this.videoId = videoId || '';
    this.quality = quality || '';
    StateManager.update({
      currentImageMetadata: {
        type: 'youtube',
        videoId: this.videoId,
        quality: this.quality
      }
    });
    this.iframe = null;
    this.apiLoaded = false;
    this.player = null;
    this.isInitialized = false; // Flag to track if player is already initialized
  }

  async init() {
    this.containerA.style.backgroundImage = 'none';
    this.containerB.style.backgroundImage = 'none';
    this.containerA.style.backgroundColor = 'black';
    this.containerB.style.backgroundColor = 'black';
    this.containerA.style.opacity = '1';
    this.containerB.style.opacity = '0';

    this._removeIframe();
    await this._loadYouTubeAPI();
    this._createIframe();
  }

  async update(videoId, quality) {
    let qualityChanged = false;
    if (typeof quality !== "undefined" && quality !== this.quality) {
      this.quality = quality;
      qualityChanged = true;
    }
    if (videoId && videoId !== this.videoId) {
      this.videoId = videoId;
      if (this.player && typeof this.player.loadVideoById === 'function') {
        this.player.loadVideoById(this.videoId);
        if (qualityChanged) {
          this._updateQuality(this.quality);
        }
      } else {
        this._removeIframe();
        this._createIframe();
      }
    } else if (qualityChanged && this.player) {
      this._updateQuality(this.quality);
    }
  }
  
  /**
   * Updates the video quality by modifying the iframe src URL with the vq parameter
   * @param {string} quality - The quality setting ('auto', 'small', 'medium', 'large', 'hd720', 'hd1080', etc.)
   * @private
   */
  _updateQuality(quality) {
    if (!this.player || !quality) return;
    
    // Get the iframe element
    const iframe = this.player.getIframe();
    if (!iframe) return;
    
    // Map quality settings to YouTube vq parameter values
    const qualityMap = {
      'auto': '',  // No vq parameter for auto
      'small': 'small',  // 240p
      'medium': 'medium',  // 360p
      'large': 'large',  // 480p
      'hd720': 'hd720',  // 720p
      'hd1080': 'hd1080',  // 1080p
      'hd1440': 'hd1440',  // 1440p
      'hd2160': 'hd2160'   // 4K/2160p
    };
    
    // Get the mapped quality value or default to empty (auto)
    const vqValue = qualityMap[quality] || '';
    
    // Get current src
    let src = iframe.src;
    
    // Remove existing vq parameter if present
    src = src.replace(/(&|\?)vq=[^&]*(&|$)/, function(match, p1, p2) {
      return p2 === '&' ? p1 : '';  // Keep the prefix if the suffix is &, otherwise remove both
    });
    
    // Add new vq parameter if not auto
    if (vqValue) {
      src += (src.indexOf('?') > -1 ? '&' : '?') + 'vq=' + vqValue;
    }
    
    // Add parameters to prevent browser extensions from interfering
    if (src.indexOf('jsapicallback=') === -1) {
      src += (src.indexOf('?') > -1 ? '&' : '?') + 'jsapicallback=none&enablejsapi=0';
    }
    
    // Update iframe src
    iframe.src = src;
    
    // Also try to use the API method as a fallback
    if (typeof this.player.setPlaybackQuality === 'function') {
      this.player.setPlaybackQuality(quality);
    }
    
    console.log(`[YouTubeBackgroundHandler] Updated quality to ${quality} (vq=${vqValue})`);
  }

  destroy() {
    this._removeIframe();
    this.player = null;
    this.iframe = null;
  }

  _removeIframe() {
    if (this.iframe && this.iframe.parentNode) {
      this.iframe.parentNode.removeChild(this.iframe);
    }
    this.iframe = null;
    if (window.YT && window.YT.Player && this.player) {
      try {
        this.player.destroy();
      } catch (e) {}
    }
    this.player = null;
  }

  async _loadYouTubeAPI() {
    if (window.YT && window.YT.Player) {
      this.apiLoaded = true;
      return;
    }
    if (!document.getElementById('youtube-iframe-api')) {
      const tag = document.createElement('script');
      tag.id = 'youtube-iframe-api';
      tag.src = 'https://www.youtube.com/iframe_api';
      document.body.appendChild(tag);
    }
    // Wait for the API to be ready
    await new Promise((resolve) => {
      window.onYouTubeIframeAPIReady = () => {
        this.apiLoaded = true;
        resolve();
      };
      // If already loaded, resolve immediately
      if (window.YT && window.YT.Player) {
        this.apiLoaded = true;
        resolve();
      }
    });
  }

  _createIframe() {
    if (!this.videoId) return;
    this._removeIframe();

    // Create main container with proper class
    const container = document.createElement('div');
    container.className = 'youtube-background-container';
    
    // Create responsive container that maintains aspect ratio
    const responsiveContainer = document.createElement('div');
    responsiveContainer.className = 'youtube-responsive-container';
    container.appendChild(responsiveContainer);
    
    // Create the player div
    const playerDiv = document.createElement('div');
    playerDiv.id = 'ambientclock-youtube-bg-player';
    responsiveContainer.appendChild(playerDiv);

    // Add the container to the DOM
    this.containerA.appendChild(container);
    this.iframe = container; // Store reference to the main container for cleanup

    // Initialize YouTube player in the player div
    this.player = new window.YT.Player(playerDiv, {
      videoId: this.videoId,
      width: '100%',
      height: '100%',
      playerVars: {
        autoplay: 1,
        controls: 0,
        showinfo: 0,
        modestbranding: 1, // Reduces YouTube branding
        loop: 1,
        mute: 1,
        playlist: this.videoId,
        rel: 0, // Limits related videos to the same channel
        fs: 0, // Disables fullscreen button since this is a background
        disablekb: 1,
        iv_load_policy: 3,
        playsinline: 1,
        origin: window.location.origin, // Security parameter
        host: window.location.origin, // Additional security parameter
        enablejsapi: 0, // Disable JavaScript API to prevent extensions from interfering
        jsapicallback: 'none', // Prevent extensions from using callbacks
      },
      events: {
        onReady: (event) => {
          // Prevent multiple initializations
          if (this.isInitialized) {
            return;
          }
          
          this.isInitialized = true;
          console.log('[YouTubeBackgroundHandler] Player initialized');
          
          event.target.mute();
          event.target.playVideo(); // Start playing immediately
          
          // Add class to the iframe for styling and add sandbox attribute
          const iframe = event.target.getIframe();
          if (iframe) {
            iframe.classList.add('youtube-player-iframe');
            
            // Add sandbox attribute to prevent browser extensions from interfering
            iframe.setAttribute('sandbox', 'allow-same-origin allow-scripts');
            
            // Add additional attributes to reduce CORS errors
            iframe.setAttribute('referrerpolicy', 'no-referrer');
            
            // Update src to include additional parameters
            let src = iframe.src;
            if (!src.includes('widget_referrer=')) {
              src += (src.includes('?') ? '&' : '?') + 'widget_referrer=' + encodeURIComponent(window.location.href);
              iframe.src = src;
            }
          }
          
          // Apply quality setting after video starts playing
          if (this.quality) {
            this._updateQuality(this.quality);
          }
        },
        onStateChange: (event) => {
          if (event.data === window.YT.PlayerState.ENDED) {
            event.target.seekTo(0);
            event.target.playVideo();
          }
        }
      }
    });
  }
}
