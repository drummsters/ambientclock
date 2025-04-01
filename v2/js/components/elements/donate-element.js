import { BaseUIElement } from '../base/base-ui-element.js';
import { StateManager } from '../../core/state-manager.js';
import { EventBus } from '../../core/event-bus.js';
import { ConfigManager } from '../../core/config-manager.js';
// Removed: import { VisibilityManager } from '../../utils/visibility-manager.js';

/**
 * @class DonateElement
 * @description Displays a donate button/link with expandable options, mimicking V1.
 * @extends BaseUIElement
 */
export class DonateElement extends BaseUIElement {
    constructor({ id, type, options, configManager, stateManager }) {
        super({ id, type, options });

        // Following the architectural principle: Services and State must be dependency-injected
        if (!configManager) {
            throw new Error('DonateElement requires a ConfigManager instance');
        }
        if (!stateManager) {
            throw new Error('DonateElement requires a StateManager instance');
        }
        
        // Store dependencies
        this.configManager = configManager;
        this.stateManager = stateManager;
        
        // Element state properties
        this.dropdown = null;
        this.mainButton = null;
        this.isHovering = false;
        this.activityListeners = [];
        this.unsubscribeControlsVisibility = null;

        // Internal visibility state and timers (like ControlsHintElement)
        this.isVisible = false;
        this.hideTimeout = null; // Timer for fade-out completion
        this.mouseIdleTimer = null; // Timer for hiding after mouse idle
        this.mouseMoveTimer = null; // Timer for showing after mouse move
        this.initialShowDelay = 2000; // V1: Show 2 seconds after load? (Donate was slightly different)
        this.mouseIdleHideDelay = 3000; // V1: Hide 3 seconds after mouse stops
        this.mouseMoveShowDelay = 200; // V1: Show 0.2 seconds after mouse moves (Let's use this)
        this.fadeOutDuration = 500; // Match CSS transition duration
    }

    /**
     * @override
     * Initializes the element, creates the DOM structure, sets up visibility.
     */
    async init() {
        // Create and add container to DOM
        this.container = document.createElement('div');
        this.container.id = this.id;
        this.container.classList.add('donate-element');
        
        const targetContainer = document.getElementById('elements-container') || document.body;
        targetContainer.appendChild(this.container);

        // Build the donation element DOM structure
        this.buildDOM();

        // If no valid donation links, log it but continue initialization as inactive
        if (!this.mainButton) {
            console.log(`[DonateElement ${this.id}] No valid donation links configured. Element will be inactive.`);
            return true; // Return success but element will be inactive
        }
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Following the Event-Driven Messaging pattern:
        // Subscribe to control panel visibility changes
        this.unsubscribeControlsVisibility = this.stateManager.subscribe(
            'settings.controls.isOpen',
            this.handleControlsVisibilityChange.bind(this)
        );
        
        // Initial display based on controls state
        setTimeout(() => {
            const controlsOpen = this.stateManager.getState().settings.controls.isOpen;
            this.showDonate(); // Always show initially
            if (!controlsOpen) {
                this.resetIdleTimer(); // Start hide timer only if controls closed
            }
        }, this.initialShowDelay);

        return true; // Signal successful initialization
    }

    buildDOM() {
        const links = this.configManager.getFullConfig().donationLinks || {};
        const availablePlatforms = [
            { key: 'paypal', name: 'PayPal', icon: 'paypal.svg', urlPrefix: 'https://www.paypal.com/paypalme/' },
            { key: 'venmo', name: 'Venmo', icon: 'venmo.svg', urlPrefix: 'https://venmo.com/' },
            { key: 'cashapp', name: 'Cash App', icon: 'cash-app.svg', urlPrefix: 'https://cash.app/$' },
            { key: 'googlepay', name: 'Google Pay', icon: 'google-pay.svg', urlPrefix: '' }
        ];
        
        let dropdownHTML = '';
        let hasLinks = false;
        
        // Process each platform to build dropdown HTML
        availablePlatforms.forEach(platform => {
            const accountId = links[platform.key];
            
            // Truthy check handles null, undefined, and empty strings
            if (accountId) {
                hasLinks = true;
                const url = platform.urlPrefix ? `${platform.urlPrefix}${accountId}` : accountId;
                 dropdownHTML += `
                    <div class="payment-option">
                        <a href="${url}" target="_blank" rel="noopener noreferrer">
                            <span class="payment-icon">
                                <img src="assets/icons/${platform.icon}" alt="${platform.name}" width="24" height="24">
                            </span>
                            <span class="payment-name">${platform.name}</span>
                        </a>
                    </div>
                `;
            }
        });
        if (hasLinks) {
             this.container.innerHTML = `
                <div class="donate-content">
                    <div class="coffee-icon">☕</div>
                    <div class="donate-text">Buy Me a Coffee</div>
                </div>
                <div class="payment-dropdown">
                    ${dropdownHTML}
                </div>
            `;
            this.dropdown = this.container.querySelector('.payment-dropdown');
            this.mainButton = this.container.querySelector('.donate-content');
        } else {
            // Set container to empty but don't nullify button/dropdown vars
            this.container.innerHTML = '';
            // Log moved to init
        }
    }

    setupEventListeners() {
        if (!this.container || !this.dropdown || !this.mainButton) return;

        const addListener = (target, type, handler) => {
            const boundHandler = handler.bind(this); // Ensure 'this' context
            target.addEventListener(type, boundHandler);
            this.activityListeners.push({ target, type, handler: boundHandler });
        };

        addListener(this.container, 'mouseenter', this.handleMouseEnter);
        addListener(this.container, 'mouseleave', this.handleMouseLeave);

        this.dropdown.querySelectorAll('.payment-option a').forEach(link => {
            addListener(link, 'mouseenter', this.handleMouseEnter); // Treat link hover same as container hover
        });

        addListener(document, 'mousemove', this.handleActivity); // Listen on document
        addListener(document, 'click', this.handleActivity);
        addListener(window, 'blur', this.handleBlur);
    }

    // --- Visibility Methods (Following Centralized State Control principle) ---
    
    showDonate() {
        // Don't proceed if container is missing or already visible
        if (!this.container || this.isVisible) return;
        
        // Apply the visible class for CSS-driven appearance
        clearTimeout(this.hideTimeout);
        clearTimeout(this.mouseMoveTimer);
        this.container.classList.add('visible');
        this.isVisible = true;
    }
    
    hideDonate() {
        if (!this.isVisible || !this.container) return;
        
        // Clear all visibility-related timers
        clearTimeout(this.hideTimeout);
        clearTimeout(this.mouseMoveTimer);
        clearTimeout(this.mouseIdleTimer);
        
        // Remove visible class to trigger CSS transition
        this.container.classList.remove('visible');
        this.isVisible = false;
    }
    
    hideDonateImmediately() {
        if (!this.container) return;
        
        // Clear all timers and hide immediately
        clearTimeout(this.hideTimeout);
        clearTimeout(this.mouseMoveTimer);
        clearTimeout(this.mouseIdleTimer);
        this.container.classList.remove('visible');
        this.isVisible = false;
    }

    resetIdleTimer() {
        // Reset the timer that calls hideDonate
        clearTimeout(this.mouseIdleTimer);
        this.mouseIdleTimer = setTimeout(this.hideDonate.bind(this), this.mouseIdleHideDelay);
    }

    // --- Event Handlers ---

    handleMouseEnter() {
        this.isHovering = true;
        this.showDonate(); // Show immediately on hover
        clearTimeout(this.mouseIdleTimer); // Clear hide timer
        clearTimeout(this.mouseMoveTimer); // Clear any pending show timer
    }

    handleMouseLeave() {
        this.isHovering = false;
        // Only start hide timer if controls are closed
        if (!this.stateManager.getState().settings.controls.isOpen) {
            this.resetIdleTimer(); // Start timer to hide it
        }
    }

    handleBlur() {
        // Hide immediately when window loses focus
        this.hideDonateImmediately();
    }

    handleActivity() {
        // Check current control panel state from StateManager
        const controlsOpen = this.stateManager.getState().settings.controls.isOpen;
        
        if (controlsOpen) {
            // When controls are open, show donate without auto-hide
            this.showDonate();
            clearTimeout(this.mouseIdleTimer);
            return;
        }
        
        // When controls are closed:
        if (!this.isVisible) {
            // If not visible, schedule showing after delay
            clearTimeout(this.mouseMoveTimer);
            this.mouseMoveTimer = setTimeout(() => {
                this.showDonate();
                this.resetIdleTimer(); // Start auto-hide timer
            }, this.mouseMoveShowDelay);
        } else {
            // If already visible, reset auto-hide timer
            this.resetIdleTimer();
        }
    }
    
    handleControlsVisibilityChange(controlsOpen) {
        if (controlsOpen) {
            // Controls opened - show element without auto-hide
            this.showDonate();
            clearTimeout(this.mouseIdleTimer);
        } else {
            // Controls closed - start auto-hide if not being hovered
            if (!this.isHovering) {
                this.resetIdleTimer();
            }
        }
    }

    _onStateUpdate(changedPaths) {
        // Handled by direct subscription to settings.controls.isOpen
    }

    destroy() {
        console.log(`[DonateElement ${this.id}] Destroying...`);
        clearTimeout(this.hideTimeout);
        clearTimeout(this.mouseIdleTimer);
        clearTimeout(this.mouseMoveTimer);

        this.activityListeners.forEach(({ target, type, handler }) => {
            target.removeEventListener(type, handler);
        });
        this.activityListeners = [];

        // Call the stored unsubscribe function if it exists
        if (typeof this.unsubscribeControlsVisibility === 'function') {
            this.unsubscribeControlsVisibility();
        }
        this.unsubscribeControlsVisibility = null; // Ensure it's cleared

        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
        this.container = null;
        this.dropdown = null;
        this.mainButton = null;

        console.log(`[DonateElement ${this.id}] Destroyed.`);
    }
}
