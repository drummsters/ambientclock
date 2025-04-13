// No longer inherits from BaseUIElement, simplifying the component.
// import { BaseUIElement } from '../base/base-ui-element.js';
import { StateManager } from '../../core/state-manager.js'; // Import StateManager

const FONT_EXAMPLE_TEXT = '0123 ABCD abcd'
export class FontPanel extends HTMLElement { // Inherit directly from HTMLElement
    constructor() {
        super(); // Must call super() first in custom element constructors
        this.scrollContainer = null; // Reference to the new scroll container
        this.contentElement = null; // Reference to the grid content *inside* scroll container
        this.isVisible = false;
        this.fonts = [];
        this.targetElementId = null; // To store the ID of the element to apply the font to
        console.debug('FontPanel constructor completed.');
    }

    /**
     * Standard custom element lifecycle callback.
     * Called when the element is first connected to the document's DOM.
     */
    connectedCallback() {
        console.debug('FontPanel connected to DOM.');
        // Query for the new scroll container and the content grid inside it
        this.scrollContainer = this.querySelector('.font-panel-scroll-container');
        if (!this.scrollContainer) {
            console.error('FontPanel scroll container (.font-panel-scroll-container) not found.');
            return;
        }
        this.contentElement = this.scrollContainer.querySelector('.font-panel-content');
        if (!this.contentElement) {
             console.error('FontPanel content element (.font-panel-content) not found within scroll container.');
             return;
        }
        // Ensure initial state (hidden)
        this.style.display = 'none';
        this.isVisible = false;

        // Add click listener to the scroll container (or contentElement, either works)
        this.scrollContainer.addEventListener('click', this._handleFontClick.bind(this));
    }

    disconnectedCallback() {
        // Cleanup if needed when element is removed from DOM
        console.debug('FontPanel disconnected from DOM.');
    }

    /**
     * Populates the font panel with font names and examples.
     * @param {Array<string>} fonts - An array of font family names.
     */
    populateFonts(fonts) {
        // Ensure we target the contentElement inside the scrollContainer
        if (!this.contentElement) {
            console.error('Font panel content element not found. Cannot populate.');
            return;
        }
        this.fonts = fonts;
        this.contentElement.innerHTML = ''; // Clear existing content

        this.fonts.forEach(font => {
            const nameDiv = document.createElement('div');
            nameDiv.classList.add('font-name');
            nameDiv.textContent = font;

            const exampleDiv = document.createElement('div');
            exampleDiv.classList.add('font-example');
            exampleDiv.style.fontFamily = font;
            exampleDiv.textContent = FONT_EXAMPLE_TEXT;

            // Wrap name and example in a clickable container
            const fontItemDiv = document.createElement('div');
            fontItemDiv.classList.add('font-item');
            fontItemDiv.dataset.fontFamily = font; // Store font name for easy access
            fontItemDiv.appendChild(nameDiv);
            fontItemDiv.appendChild(exampleDiv);

            this.contentElement.appendChild(fontItemDiv);
        });
        console.debug(`FontPanel populated with ${fonts.length} fonts.`);
    }

    /**
     * Shows the font panel for a specific target element.
     * @param {string} targetElementId - The ID of the element (clock/date) to apply the font to.
     */
    show(targetElementId) {
        if (!targetElementId) {
            console.error('FontPanel.show() requires a targetElementId.');
            return;
        }
        this.targetElementId = targetElementId;
        this.style.display = 'block';
        this.isVisible = true;
        this._updatePosition();
        this._highlightCurrentFont(); // Highlight the current font
        console.debug(`FontPanel shown for target: ${this.targetElementId}`);
    }

    /**
     * Hides the font panel.
     */
    hide() {
        // 'this' refers to the <font-panel> element itself
        this.style.display = 'none';
        this.isVisible = false;
        console.debug('FontPanel hidden.');
    }

    /**
     * Toggles the visibility of the font panel for a specific target element.
     * @param {string} targetElementId - The ID of the element (clock/date) to apply the font to.
     */
    toggle(targetElementId) {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show(targetElementId);
        }
    }

    /**
     * Updates the position of the font panel relative to the control panel.
     * This might be needed if the control panel's position changes or on initial show.
     */
    _updatePosition() {
        const controlPanelElement = document.querySelector('#controls-panel'); // Use the actual ID
        if (controlPanelElement) {
            const controlPanelRect = controlPanelElement.getBoundingClientRect();
            // Position relative to the viewport based on control panel's rect
            this.style.position = 'fixed'; // Use fixed to position relative to viewport
            this.style.top = `${controlPanelRect.top}px`;
            // Place it to the right, adding a small gap
            this.style.left = `${controlPanelRect.right + 10}px`; // 10px gap
            console.debug(`FontPanel position updated: top=${this.style.top}, left=${this.style.left}`);
        } else {
            console.warn('Control panel element not found for positioning FontPanel.');
        }
    }

    /**
     * Handles clicks within the font panel content area.
     * @param {Event} event - The click event.
     */
    _handleFontClick(event) {
        const fontItem = event.target.closest('.font-item');
        if (!fontItem || !this.targetElementId) {
            return; // Click wasn't on a font item or no target is set
        }

        const fontFamily = fontItem.dataset.fontFamily;
        console.log(`Font selected: ${fontFamily} for target: ${this.targetElementId}`);

        // Dispatch state update to change the font of the target element
        // Use the imported StateManager directly
        const updatePayload = {
            elements: {
                [this.targetElementId]: {
                    options: {
                        fontFamily: fontFamily
                    }
                }
            }
        };
        StateManager.update(updatePayload);
        /* Removed the check for window.StateManager
        if (StateManager) {
            const updatePayload = {
                elements: {
                    [this.targetElementId]: {
                        options: {
            StateManager.update(updatePayload);
        } else {
            console.error('StateManager not found. Cannot dispatch font update.');
        }
        */

        this.hide(); // Hide the panel after selection
    }

    /**
     * Finds the currently applied font for the target element and highlights it in the panel.
     */
    _highlightCurrentFont() {
        // Ensure we query within the contentElement inside the scrollContainer
        if (!this.targetElementId || !this.contentElement) {
            return;
        }

        // Get the current font family from the state
        const statePath = `elements.${this.targetElementId}.options.fontFamily`;
        const currentFont = StateManager.getNestedValue(StateManager.getState(), statePath);

        // Remove existing selected class
        const previouslySelected = this.contentElement.querySelector('.font-item.selected');
        if (previouslySelected) {
            previouslySelected.classList.remove('selected');
        }

        if (currentFont) {
            // Find the new font item and add the selected class
            const currentFontItem = this.contentElement.querySelector(`.font-item[data-font-family="${currentFont}"]`);
            if (currentFontItem) {
                currentFontItem.classList.add('selected');
                // Optional: Scroll the selected item into view
                currentFontItem.scrollIntoView({ block: 'nearest', inline: 'nearest' });
            } else {
                 console.warn(`Font item for "${currentFont}" not found in the panel.`);
            }
        }
    }
}

// Define the custom element
customElements.define('font-panel', FontPanel);
