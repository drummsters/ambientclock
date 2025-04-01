import { BaseUIElement } from '../base/base-ui-element.js';
import { StateManager } from '../../core/state-manager.js';
import { EventBus } from '../../core/event-bus.js'; // Keep for toggle event

/**
 * @class ControlsHintElement
 * @description Displays a hint for accessing the controls panel, mimicking V1 behavior.
 * @extends BaseUIElement
 */
export class ControlsHintElement extends BaseUIElement {
    constructor({ id, type, options, stateManager }) {
        super({ id, type, options });
        
        // Follow the architectural principles: StateManager must be dependency-injected
        if (!stateManager) {
            throw new Error('ControlsHintElement requires a StateManager instance');
        }
        this.stateManager = stateManager;

        this.isVisible = false; // Internal visibility state
        this.hideTimeout = null; // Timer for fade-out completion
        this.mouseIdleTimer = null; // Timer for hiding after mouse idle
        this.mouseMoveTimer = null; // Timer for showing after mouse move
        this.initialShowDelay = 3000;
        this.mouseIdleHideDelay = 5000;
        this.mouseMoveShowDelay = 200;
        this.fadeOutDuration = 500; // Matches CSS transition
        this.activityListeners = [];
        this.unsubscribeControlsVisibility = null; // For state subscription
    }

    /**
     * @override
     * Initializes the element, creates the DOM structure, and sets up initial state.
     */
    async init() {
        // Use BaseUIElement's init which creates the container
        const success = await super.init();
        if (!success || !this.container) {
            console.error(`[ControlsHintElement ${this.id}] Base init failed or container missing.`);
             return false;
         }

         this.container.classList.add('controls-hint-element');
         this.container.innerHTML = `<p>${this.options.text || "Press 'Space' or 'c' to toggle controls"}</p>`;

        // Initial display logic: After a delay, check controls state and show if appropriate
        // Ensure the hint displays after a delay, with special handling for production
        // environments where timing might be different
        const initialDelayMs = 1000; // Show sooner than original 3s delay
        const displayInitialHint = () => {
            console.log('[ControlsHint] Attempting to show initial hint');
            
            // Force hint to display if controls aren't open
            const controlsOpen = this.stateManager.getState().settings.controls.isOpen;
            if (!controlsOpen) {
                // Always ensure visibility is handled correctly
                this.container.classList.add('visible');
                this.isVisible = true;
                this.resetIdleTimer();
                
                // Schedule a check to make sure hint becomes visible even in production builds
                setTimeout(() => {
                    if (!this.container.classList.contains('visible')) {
                        console.log('[ControlsHint] Re-applying visibility class');
                        this.container.classList.add('visible');
                    }
                }, 500);
            }
        };
        
        // Initial display with shorter delay
        setTimeout(displayInitialHint, initialDelayMs);
        
        // Additional display attempt after standard delay (backup for production)
        setTimeout(displayInitialHint, this.initialShowDelay);

        // Follow the Event-Driven Messaging principle
        // Subscribe to control panel visibility state through StateManager
        this.unsubscribeControlsVisibility = this.stateManager.subscribe(
            'settings.controls.isOpen', 
            this.handleControlsVisibilityChange.bind(this)
        );

        // Activity Listeners
        const mouseMoveHandler = this.handleMouseMove.bind(this);
        const mouseLeaveHandler = this.handleMouseLeave.bind(this); // Use internal hide
        const hintClickHandler = this.handleHintClick.bind(this);

        // Store listeners for removal
        this.activityListeners.push({ target: document, type: 'mousemove', handler: mouseMoveHandler });
        this.activityListeners.push({ target: document, type: 'mouseleave', handler: mouseLeaveHandler }); // Hides on leaving window
        this.activityListeners.push({ target: this.container, type: 'click', handler: hintClickHandler });

        // Add listeners
        this.activityListeners.forEach(listener => {
            listener.target.addEventListener(listener.type, listener.handler);
        });

        return true;
    }

    // --- Visibility Logic ---

    // Simplified visibility methods following the architectural principles
    showHint() {
        if (!this.container || this.isVisible) return;
        
        // Check if controls are open - if yes, don't show hint
        if (this.stateManager.getState().settings.controls.isOpen) {
            return; // Don't show when controls are open
        }
        
        // Apply the visible CSS class for state-driven rendering
        clearTimeout(this.hideTimeout);
        clearTimeout(this.mouseMoveTimer);
        this.container.classList.add('visible');
        this.isVisible = true;
    }

    hideHint() {
        if (!this.isVisible || !this.container) return;
        clearTimeout(this.hideTimeout);
        clearTimeout(this.mouseMoveTimer);
        clearTimeout(this.mouseIdleTimer);
        // Let CSS handle the transition via class removal
        this.container.classList.remove('visible');
        this.isVisible = false;
        // Removed excessive logging
    }

    hideHintImmediately() {
        if (!this.container) return;
        clearTimeout(this.hideTimeout);
        clearTimeout(this.mouseMoveTimer);
        clearTimeout(this.mouseIdleTimer);
        this.container.classList.remove('visible');
        this.isVisible = false;
        // Removed excessive logging
    }

    resetIdleTimer() {
        clearTimeout(this.mouseIdleTimer);
        this.mouseIdleTimer = setTimeout(this.hideHint.bind(this), this.mouseIdleHideDelay);
    }

    // --- Event Handlers ---

    // Track last movement time to throttle processing
    lastMoveTime = 0;
    moveThrottleMs = 100; // Only process mouse movements every 100ms

    handleMouseMove() {
        // Throttle mouse move handler to reduce processing
        const now = Date.now();
        if (now - this.lastMoveTime < this.moveThrottleMs) {
            return; // Skip this movement, too soon after the last one
        }
        this.lastMoveTime = now;
        
        // If controls panel is open, always keep the hint hidden
        const controlsOpen = this.stateManager.getState().settings.controls.isOpen;
        if (controlsOpen) {
            this.hideHintImmediately();
            return;
        }

        // If hint is not visible, set timer to show it
        if (!this.isVisible) {
            clearTimeout(this.mouseMoveTimer);
            this.mouseMoveTimer = setTimeout(() => {
                this.showHint();
                this.resetIdleTimer();
            }, this.mouseMoveShowDelay);
        } else {
            // If already visible, just reset idle timer
            this.resetIdleTimer();
        }
    }

     handleMouseLeave() {
        // Hide when mouse leaves the document window if controls are closed
        if (!this.stateManager.getState().settings.controls.isOpen) {
             this.hideHint();
        }
    }

    handleHintClick() {
        EventBus.publish('controls:toggle'); // Still use EventBus to request toggle
        this.hideHintImmediately(); // Hide hint after click
    }

    // Centralize control panel state handling
    handleControlsVisibilityChange(controlsOpen) {
        if (controlsOpen) {
            // When controls open, immediately hide the hint
            this.hideHintImmediately();
            clearTimeout(this.mouseIdleTimer);
            clearTimeout(this.mouseMoveTimer);
        } else {
            // When controls close, let mouse activity determine visibility
            if (this.isVisible) {
                this.resetIdleTimer(); // If hint is showing, start timer to hide it
            }
        }
    }

    destroy() {
        clearTimeout(this.hideTimeout);
        clearTimeout(this.mouseMoveTimer);
        clearTimeout(this.mouseIdleTimer);

        // Unsubscribe from StateManager
        if (typeof this.unsubscribeControlsVisibility === 'function') {
            this.unsubscribeControlsVisibility();
        }
        this.unsubscribeControlsVisibility = null;

        // Remove activity listeners
        this.activityListeners.forEach(listener => {
            listener.target.removeEventListener(listener.type, listener.handler);
        });
        this.activityListeners = [];

        // Call base destroy AFTER cleaning up own listeners/subscriptions
        super.destroy();
    }

    _onStateUpdate(changedPaths) {
        // Update text if options change
        if (this.container && changedPaths[`elements.${this.id}.options.text`]) {
            const pElement = this.container.querySelector('p');
            if (pElement) {
                pElement.textContent = this.options.text;
            }
        }
        // Visibility handled by internal logic + state subscription
    }
}
