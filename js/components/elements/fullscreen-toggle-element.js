import { StateManager } from '../../core/state-manager.js';
import { BaseUIElement } from '../base/base-ui-element.js';

export class FullscreenToggleElement extends BaseUIElement {
    constructor() {
        super('fullscreen-toggle');
        
        // Bind methods
        this._handleClick = this._handleClick.bind(this);
        
        // Track fullscreen state
        this._isFullscreen = false;
    }

    init() {
        super.init();
        
        // Add fullscreen-toggle class to container
        this.container.classList.add('fullscreen-toggle');
        
        // Create button element
        this.container.innerHTML = `
            <button class="fullscreen-button">
                <svg class="fullscreen-icon" viewBox="0 0 24 24" width="24" height="24">
                    <path class="enter-fullscreen" d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
                    <path class="exit-fullscreen" d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/>
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
    }

    _handleClick() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable fullscreen: ${err.message}`);
            });
        } else {
            document.exitFullscreen();
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

// Register the element
customElements.define('fullscreen-toggle-element', FullscreenToggleElement);
