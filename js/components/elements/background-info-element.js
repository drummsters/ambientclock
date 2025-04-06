import { BaseUIElement } from '../base/base-ui-element.js';
import { StateManager } from '../../core/state-manager.js';
import { EventBus } from '../../core/event-bus.js';

/**
 * @class BackgroundInfoElement
 * @description Displays information about the current background image.
 * @extends BaseUIElement
 */
export class BackgroundInfoElement extends BaseUIElement {
    constructor(config) { // Accept the whole config object
        super(config); // Pass the whole config object to the base constructor
        this.info = null; // Store current background info
    }

    /**
     * @override
     * Initializes the element, creates the DOM structure.
     */
    async init() {
        const success = await super.init();
        if (!success || !this.container) {
            console.error(`[BackgroundInfoElement ${this.id}] Base init failed or container missing.`);
            return false;
        }

        this.container.classList.add('background-info-element');
        this.container.innerHTML = `
            <div class="info-content">
                <!-- Content will be populated by state updates -->
            </div>
        `;

        // Initial render based on current state
        this._updateContent(StateManager.getState().background?.currentInfo);
        this._updateVisibility(StateManager.getState().settings?.background?.showInfo);

        return true;
    }

    /**
     * @override
     * Satisfies BaseUIElement requirement, but content is set in init.
     */
    async createElements() {
        // No dynamic elements needed, content set in init
    }

    /**
     * Updates the displayed background information.
     * @param {object | null} info - The background information object or null.
     * @private
     */
    _updateContent(info) {
        this.info = info;
        const contentElement = this.container?.querySelector('.info-content');
        if (!contentElement) return;

        if (info && info.photographer) {
            let html = `Photo by <a href="${info.photographerUrl || '#'}" target="_blank" rel="noopener noreferrer">${info.photographer}</a>`;
            if (info.source) {
                html += ` on <a href="${info.sourceUrl || '#'}" target="_blank" rel="noopener noreferrer">${info.source}</a>`;
            }
            contentElement.innerHTML = html;
        } else {
            contentElement.innerHTML = ''; // Clear content if no info
        }
    }

    /**
     * Updates the visibility of the element based on state.
     * @param {boolean} show - Whether to show the element.
     * @private
     */
    _updateVisibility(show) {
         if (!this.container) return;
         this.container.style.display = show ? '' : 'none';
    }

    /**
     * @override
     * Handles state updates relevant to background info.
     * @param {object} changedPaths - Object indicating which state paths have changed.
     */
    _onStateUpdate(changedPaths) {
        if (!this.container) return;

        // Check if background info itself changed
        if (changedPaths['background.currentInfo']) {
            this._updateContent(StateManager.getState().background.currentInfo);
        }

        // Check if visibility setting changed
        if (changedPaths['settings.background.showInfo']) {
            this._updateVisibility(StateManager.getState().settings.background.showInfo);
        }

        // Handle potential option changes if needed in the future
        // e.g., if (changedPaths[`elements.${this.id}.options.someOption`]) { ... }
    }

    /**
     * @override
     * Cleans up resources.
     */
    destroy() {
        // Add any specific cleanup if needed
        super.destroy();
    }
}
