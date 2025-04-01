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

        if (!configManager) {
            throw new Error('DonateElement requires a ConfigManager instance.');
        }
        if (!stateManager) {
            throw new Error('DonateElement requires a StateManager instance.');
        }
        this.configManager = configManager;
        this.stateManager = stateManager;
        this.dropdown = null;
        this.mainButton = null;
        this.activityListeners = [];
        this.isHovering = false;
        this.unsubscribeControlsVisibility = null; // To store the unsubscribe function

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
        this.container = document.createElement('div');
        this.container.id = this.id;
        this.container.classList.add('donate-element');

        const targetContainer = document.getElementById('elements-container') || document.body;
        targetContainer.appendChild(this.container);

        this.buildDOM();

        // If the DOM wasn't fully built (no links), log it but continue initialization.
        // The element will exist in the DOM but be empty and inactive.
        if (!this.mainButton) {
             console.log(`[DonateElement ${this.id}] No valid donation links configured. Element will be inactive.`);
        } else {
            // Only setup listeners and visibility if the element has content
            this.setupEventListeners();

            // Initial visibility logic: Show after delay, then start hide timer
            setTimeout(() => {
                // Check controls state BEFORE showing initially
                if (!this.stateManager.getState().settings.controls.isOpen) {
                    this.showDonate(); // Attempt to show
                    this.resetIdleTimer(); // Start timer to hide it
                } else {
                    // If controls are already open, just show it without starting hide timer
                    this.showDonate();
                }
            }, this.initialShowDelay);

            // Listen for control panel visibility changes and store the unsubscribe function
            this.unsubscribeControlsVisibility = this.stateManager.subscribe(
                'settings.controls.isOpen',
                this.handleControlsVisibilityChange.bind(this)
            );
        }

        console.log(`[DonateElement ${this.id}] Initialized.`);
        // Always return true so ElementManager doesn't error, even if inactive
        setTimeout(() => {
            // Check controls state BEFORE showing initially
            if (!this.stateManager.getState().settings.controls.isOpen) {
                this.showDonate(); // Attempt to show
                this.resetIdleTimer(); // Start timer to hide it
            } else {
                // If controls are already open, just show it without starting hide timer
                this.showDonate();
            }
        }, this.initialShowDelay);

        // Listen for control panel visibility changes and store the unsubscribe function
        this.unsubscribeControlsVisibility = this.stateManager.subscribe(
            'settings.controls.isOpen',
            this.handleControlsVisibilityChange.bind(this)
        );

        console.log(`[DonateElement ${this.id}] Initialized.`);
        return true;
    }

    buildDOM() {
        // ... (buildDOM remains the same)
        const links = this.configManager.getFullConfig().donationLinks || {};
        const availablePlatforms = [
            { key: 'paypal', name: 'PayPal', icon: 'paypal.svg', urlPrefix: 'https://www.paypal.com/paypalme/' },
            { key: 'venmo', name: 'Venmo', icon: 'venmo.svg', urlPrefix: 'https://venmo.com/' },
            { key: 'cashapp', name: 'Cash App', icon: 'cash-app.svg', urlPrefix: 'https://cash.app/$' },
            { key: 'googlepay', name: 'Google Pay', icon: 'google-pay.svg', urlPrefix: '' }
        ];
        let dropdownHTML = '';
        let hasLinks = false;
        availablePlatforms.forEach(platform => {
            const accountId = links[platform.key];
            // Check if accountId is not null, undefined, or an empty string
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

        addListener(document, 'mousemove', this.handleActivity);
        addListener(document, 'click', this.handleActivity);
        addListener(window, 'blur', this.handleBlur);
    }

    // --- Internal Visibility Methods (Adapted from ControlsHintElement) ---

    showDonate() {
        if (!this.container) return;
        // Prevent showing if controls are open and we are not explicitly hovering
        // Or if already visible
        const controlsOpen = this.stateManager.getState().settings.controls.isOpen;
        if ((controlsOpen && !this.isHovering) || this.isVisible) {
            // If controls are open, ensure it's visible if hovering, otherwise respect controls state
             if (controlsOpen && !this.isHovering) {
                 this.hideDonateImmediately(); // Hide if controls open and not hovering
             } else if (controlsOpen && this.isHovering) {
                 // Ensure visible if controls open AND hovering
                 clearTimeout(this.hideTimeout);
                 clearTimeout(this.mouseMoveTimer);
                 this.container.classList.add('visible'); // Use class for CSS
                 this.isVisible = true;
             }
            return;
        }

        clearTimeout(this.hideTimeout);
        clearTimeout(this.mouseMoveTimer); // Clear any pending show timer
        this.container.classList.add('visible'); // Use class for CSS
        this.isVisible = true;
    }

    hideDonate() {
        if (!this.isVisible || !this.container) return;
        clearTimeout(this.hideTimeout);
        clearTimeout(this.mouseMoveTimer);
        clearTimeout(this.mouseIdleTimer);

        this.container.style.opacity = '0'; // Start fade out (assuming CSS transition on opacity)
        // Use timeout matching CSS transition to remove the 'visible' class
        this.hideTimeout = setTimeout(() => {
            if (this.container && this.container.style.opacity === '0') {
                this.container.classList.remove('visible');
                this.container.style.opacity = ''; // Reset style attribute
                this.isVisible = false;
            }
        }, this.fadeOutDuration);
    }

    hideDonateImmediately() {
        if (!this.container) return;
        clearTimeout(this.hideTimeout);
        clearTimeout(this.mouseMoveTimer);
        clearTimeout(this.mouseIdleTimer);
        this.container.classList.remove('visible');
        this.container.style.opacity = ''; // Reset style attribute
        this.isVisible = false;
    }

    resetIdleTimer() {
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
        // If controls are closed, activity should show the element and reset its idle timer
        if (!this.stateManager.getState().settings.controls.isOpen) {
             // If not visible, show after a short delay
             if (!this.isVisible && !this.mouseMoveTimer) {
                 clearTimeout(this.mouseMoveTimer);
                 this.mouseMoveTimer = setTimeout(() => {
                     this.showDonate();
                     this.resetIdleTimer(); // Start hide timer once shown
                     this.mouseMoveTimer = null;
                 }, this.mouseMoveShowDelay);
             } else if (this.isVisible) {
                 // If already visible, just reset the idle timer
                 this.resetIdleTimer();
             }
        } else {
            // If controls are open, ensure donate is visible and clear timers
            this.showDonate(); // Ensures it's visible
            clearTimeout(this.mouseIdleTimer); // Don't hide while controls are open
            clearTimeout(this.mouseMoveTimer);
        }
    }

    handleControlsVisibilityChange(controlsOpen) {
        if (controlsOpen) {
            this.showDonate(); // Ensure visible
            clearTimeout(this.mouseIdleTimer); // Clear hide timer
            clearTimeout(this.mouseMoveTimer);
        } else {
            // If controls are closed, start the hide timer only if not hovering
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
