import { BaseUIElement } from '../base/base-ui-element.js';
import { StateManager } from '../../core/state-manager.js';
import { EventBus } from '../../core/event-bus.js';
import { ConfigManager } from '../../core/config-manager.js';
// No need for EventBus or StateManager directly if visibility is externalized

/**
 * @class DonateElement
 * @description Displays a donate button/link with expandable options, mimicking V1.
 * @extends BaseUIElement
 */
export class DonateElement extends BaseUIElement {
    constructor({ id, type, options, configManager }) { // Removed stateManager
        super({ id, type, options });

        // Following the architectural principle: Services must be dependency-injected
        if (!configManager) {
            throw new Error('DonateElement requires a ConfigManager instance');
        }
        
        // Store dependencies
        this.configManager = configManager;
        
        // Element state properties
        this.dropdown = null;
        this.mainButton = null;
        this.activityListeners = []; // Re-initialize for dropdown listeners
        // Removed visibility-related properties: isHovering, unsubscribeControlsVisibility
        // Removed internal visibility state and timers
    }

    /**
     * @override
     * Initializes the element, creates the DOM structure, sets up visibility.
     */
    async init() {
        // Vercel Only: Check environment variable before initializing
        // Vercel automatically exposes env vars prefixed with VITE_
        if (import.meta.env.INCLUDE_DONATE !== 'true') {
            console.log(`[DonateElement ${this.id}] INCLUDE_DONATE is not 'true'. Skipping initialization.`);
            // Optionally remove the container if it shouldn't exist at all
            // if (this.container && this.container.parentNode) {
            //     this.container.parentNode.removeChild(this.container);
            // }
            // this.container = null; 
            return false; // Indicate initialization skipped/failed
        }
        
        // Conditionally import CSS only when element is included
        await import('../../../css/components/donate.css');

        // Create and add container to DOM
        this.container = document.createElement('div');
        this.container.id = this.id;
        this.container.classList.add('donate-element');
        
        const targetContainer = document.getElementById('elements-container') || document.body;
        targetContainer.appendChild(this.container);

        // Get donation links before building the DOM
        const donationLinks = this.configManager.getFullConfig().donationLinks || {};
        console.log(`[DonateElement ${this.id}] Donation links from configManager:`, donationLinks);
        
        // Build the donation element DOM structure
        this.buildDOM();

        // Check if the DOM was built successfully
        if (!this.mainButton) {
            console.error(`[DonateElement ${this.id}] No valid donation links configured. Element will be inactive.`);
            // For debugging - add visual indicator even if no links
            this.container.innerHTML = `<div style="color: red; background: rgba(0,0,0,0.5); padding: 8px; border-radius: 4px;">[Debug] Donate Element: No valid links</div>`;
            this.container.style.opacity = '1';
            this.container.style.pointerEvents = 'auto';
            return true; // Return success but element will be inactive
        }
        
        // Set up basic event listeners (hover for dropdown)
        this.setupEventListeners();
        
        // Removed state subscription and initial visibility logic

        return true; // Signal successful initialization
    }

    buildDOM() {
        // Get links from config with direct fallback for PayPal
        let links = this.configManager.getFullConfig().donationLinks || {};
        
        // Ensure we have at least PayPal as a fallback
        if (!links.paypal) {
            console.log('[DonateElement] No PayPal link in config, using direct fallback');
            links = {
                ...links,
                paypal: 'drummster' // Direct fallback for development
            };
        }
        
        console.log('[DonateElement] Links after fallback:', links);
        
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
                                <img src="/assets/icons/${platform.icon}" alt="${platform.name}" width="24" height="24">
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

        // Only need listeners for dropdown hover effect
        addListener(this.container, 'mouseenter', this.handleMouseEnter);
        addListener(this.container, 'mouseleave', this.handleMouseLeave);

        // Keep dropdown links hoverable
        this.dropdown.querySelectorAll('.payment-option a').forEach(link => {
            addListener(link, 'mouseenter', this.handleMouseEnter);
        });
        
        // Removed document/window listeners for activity/blur/state changes
    }

    // --- Event Handlers (Simplified for Dropdown) ---

    handleMouseEnter() {
        // This might still be useful for showing the dropdown on hover,
        // but the element's overall visibility is handled externally.
        // We can keep the hover effect for the dropdown itself.
        if (this.dropdown) {
            this.dropdown.style.opacity = '1';
            this.dropdown.style.visibility = 'visible';
            this.dropdown.style.pointerEvents = 'auto';
        }
    }

    handleMouseLeave() {
        // Hide dropdown on mouse leave
        if (this.dropdown) {
            this.dropdown.style.opacity = '0';
            this.dropdown.style.visibility = 'hidden';
            this.dropdown.style.pointerEvents = 'none';
        }
    }

    // Removed all visibility methods: showDonate, hideDonate, hideDonateImmediately, resetIdleTimer
    // Removed activity handlers: handleBlur, handleActivity, handleControlsVisibilityChange
    // Removed _onStateUpdate

    destroy() {
        console.log(`[DonateElement ${this.id}] Destroying...`);
        
        // Remove only the listeners we added
        this.activityListeners.forEach(({ target, type, handler }) => {
            target.removeEventListener(type, handler);
        });
        this.activityListeners = []; // Clear the stored listeners

        // Removed timer clearing and state unsubscription

        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
        this.container = null;
        this.dropdown = null;
        this.mainButton = null;

        console.log(`[DonateElement ${this.id}] Destroyed.`);
    }
}
