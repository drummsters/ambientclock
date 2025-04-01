import { BaseUIElement } from '../base/base-ui-element.js';
import { StateManager } from '../../core/state-manager.js'; // Import StateManager again
import { EventBus } from '../../core/event-bus.js';

/**
 * @class ControlsHintElement
 * @description Displays a hint for accessing the controls panel, mimicking V1 behavior.
 * @extends BaseUIElement
 */
export class ControlsHintElement extends BaseUIElement {
    constructor(id, options) {
        super(id, options);
        this.hintTimeout = null;
        this.isVisible = false; // Internal visibility state
        this.initialShowDelay = 3000; // V1: Show 3 seconds after load
        this.mouseIdleHideDelay = 5000; // V1: Hide 5 seconds after mouse stops
        this.mouseMoveShowDelay = 200; // V1: Show 0.2 seconds after mouse moves
        this.fadeOutDuration = 500; // Match CSS transition duration (0.5s)
        this.subscriptions = []; // Array to store subscription objects
        this.activityListeners = []; // Store activity listener references for removal
        this.mouseMoveTimer = null; // Timer for showing hint after mouse move
        this.mouseIdleTimer = null; // Timer for hiding hint after mouse idle
    }

    /**
     * @override
     * Initializes the element, creates the DOM structure, and sets up initial state.
     */
    async init() { // Make async
        const success = await super.init(); // Await the base init
        if (!success || !this.container) { // Check base success and container
            console.error(`[ControlsHintElement ${this.id}] Base init failed or container missing.`);
             return false;
         }

         this.container.classList.add('controls-hint-element');
         this.container.innerHTML = `<p>${this.options.text || "Press 'Space' or 'c' to toggle controls"}</p>`;

           // V1 Initial display logic: Show after delay, then hide after idle period
           setTimeout(() => {
               // Check state BEFORE showing initially
               if (!StateManager.getState().settings.controls.isOpen) {
                   this.showHint(); // Attempt to show
                   this.resetIdleTimer(); // Start timer to hide it
               }
         }, this.initialShowDelay);

        // Listen ONLY for control panel OPEN event to hide immediately
        this.subscriptions.push(
            EventBus.subscribe('controls:opened', this.hideHintImmediately.bind(this))
        );

        // V1 Listeners: mousemove, mouseleave, click on hint
        const mouseMoveHandler = this.handleMouseMove.bind(this);
        const mouseLeaveHandler = this.hideHint.bind(this); // V1 hides on mouseleave
        const hintClickHandler = this.handleHintClick.bind(this);

        document.addEventListener('mousemove', mouseMoveHandler);
        document.addEventListener('mouseleave', mouseLeaveHandler);
        this.container.addEventListener('click', hintClickHandler);

        // Store listeners for removal
        this.activityListeners.push({ target: document, type: 'mousemove', handler: mouseMoveHandler });
        this.activityListeners.push({ target: document, type: 'mouseleave', handler: mouseLeaveHandler });
        this.activityListeners.push({ target: this.container, type: 'click', handler: hintClickHandler });

        return true; // Signal successful initialization
    }

    // --- V1 Style Visibility Logic ---

    /**
     * Shows the hint element, but only if controls are closed.
      */
     showHint() {
           // Add back the check for controlsOpen state
           const controlsOpen = StateManager.getState().settings.controls.isOpen;
           if (controlsOpen || this.isVisible) {
               return; // Don't show if controls are open or already visible
          }
         clearTimeout(this.mouseMoveTimer); // Clear any pending show timer

         this.container.style.opacity = '1';
        this.container.style.visibility = 'visible';
        this.isVisible = true;
    }

    /**
     * Fades out the hint element.
     */
    hideHint() {
        if (!this.isVisible) return;
        clearTimeout(this.hintTimeout);
         clearTimeout(this.mouseMoveTimer); // Clear pending show timer
         clearTimeout(this.mouseIdleTimer); // Clear pending hide timer

         this.container.style.opacity = '0';
        // Use timeout matching CSS transition to set visibility hidden
        this.hintTimeout = setTimeout(() => {
            // Double check opacity in case it was shown again quickly
            if (this.container && this.container.style.opacity === '0') {
                 this.container.style.visibility = 'hidden';
                 this.isVisible = false;
            }
        }, this.fadeOutDuration);
     }

    /**
     * Hides the hint element immediately without fading.
     */
    hideHintImmediately() {
        clearTimeout(this.hintTimeout);
         clearTimeout(this.mouseMoveTimer);
         clearTimeout(this.mouseIdleTimer);
         if (this.container) {
             this.container.style.opacity = '0';
            this.container.style.visibility = 'hidden';
        }
        this.isVisible = false;
    }

    /**
       * Handles mouse movement over the document (V1 style).
       */
      handleMouseMove() {
           // Check if controls are open BEFORE setting timer
           if (StateManager.getState().settings.controls.isOpen) {
               this.hideHint(); // Ensure hint is hidden if controls are open
               return; // Exit if controls are open
           }

          // If hint isn't visible, set a timer to show it
          if (!this.isVisible) {
              clearTimeout(this.mouseMoveTimer); // Clear previous show timer
              this.mouseMoveTimer = setTimeout(() => {
                  this.showHint(); // showHint will double-check controls state
                  this.resetIdleTimer(); // Start hide timer once shown
              }, this.mouseMoveShowDelay);
        } else {
            // If already visible, just reset the idle timer to keep it shown
            this.resetIdleTimer();
        }
    }

    /**
     * Resets the timer that hides the hint after mouse inactivity.
     */
    resetIdleTimer() {
        clearTimeout(this.mouseIdleTimer);
        this.mouseIdleTimer = setTimeout(this.hideHint.bind(this), this.mouseIdleHideDelay);
    }

    /**
     * Handles clicking on the hint element (V1 style).
     */
    handleHintClick() {
        EventBus.publish('controls:toggle'); // Use event bus to request toggle
        this.hideHint(); // Hide hint after click
    }

    /**
     * @override
     * Cleans up timers and event listeners.
     */
    destroy() {
        clearTimeout(this.hintTimeout);
        clearTimeout(this.mouseMoveTimer);
        clearTimeout(this.mouseIdleTimer);

        // Unsubscribe from EventBus events
        this.subscriptions.forEach(sub => sub.unsubscribe());
        this.subscriptions = [];

        // Remove V1 style activity listeners
        this.activityListeners.forEach(listener => {
            listener.target.removeEventListener(listener.type, listener.handler);
        });
        this.activityListeners = [];

        super.destroy();
    }

    /**
     * @override
     * Handles state updates (e.g., text changes). Currently minimal.
     * @param {object} changedPaths - Object indicating which state paths have changed.
     */
    _onStateUpdate(changedPaths) {
        // Example: Update text if options change
        if (this.container && changedPaths[`elements.${this.id}.options.text`]) {
            const pElement = this.container.querySelector('p');
            if (pElement) {
                pElement.textContent = this.options.text;
            }
        }
        // Note: Visibility is handled internally by mouse/control events, not direct state binding.
    }
}
