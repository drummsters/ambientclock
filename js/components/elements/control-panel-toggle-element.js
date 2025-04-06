import { StateManager } from '../../core/state-manager.js';
import { BaseUIElement } from '../base/base-ui-element.js';

export class ControlPanelToggleElement extends BaseUIElement {
    constructor(config) { // Accept the whole config object
        super(config); // Pass the whole config object to the base constructor
        
        // Bind methods
        this._handleClick = this._handleClick.bind(this);
    }

    async init() {
        const success = await super.init();
        if (!success || !this.container) {
            console.error(`[ControlPanelToggleElement ${this.id}] Base init failed or container missing.`);
            return false;
        }
        
        // Add control-panel-toggle class to container
        this.container.classList.add('control-panel-toggle');
        
        // Create button element
        this.container.innerHTML = `
            <button class="control-panel-button">
                <svg class="control-panel-icon" viewBox="0 0 24 24" width="24" height="24">
                    <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
                </svg>
            </button>
        `;

        // Add click listener
        this.container.addEventListener('click', this._handleClick);
        
        // Always show container on mobile
        if (this._isMobileDevice()) {
            this.container.classList.add('visible');
            // Force display block on the container
            this.container.style.display = 'block';
        }

        // Subscribe to control panel state changes
        StateManager.subscribe(state => state.settings.controls.isOpen, this._updateButtonState.bind(this));
        
        return true; // Signal successful initialization
    }

    _handleClick() {
        const currentState = StateManager.getState();
        const isOpen = currentState.settings.controls.isOpen;
        
        // Toggle control panel state
        StateManager.update({
            settings: {
                controls: {
                    isOpen: !isOpen
                }
            }
        });
    }

    _updateButtonState(isOpen) {
        if (isOpen) {
            this.container.classList.add('is-active');
        } else {
            this.container.classList.remove('is-active');
        }
    }

    _isMobileDevice() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    destroy() {
        this.container.removeEventListener('click', this._handleClick);
        super.destroy();
    }
}
