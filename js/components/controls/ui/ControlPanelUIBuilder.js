/**
 * Creates the basic DOM structure for the ControlPanel.
 * This includes static sections, placeholders for dynamic controls, and the reset button.
 */
export class ControlPanelUIBuilder {
    /**
     * Creates a ControlPanelUIBuilder instance.
     * @param {HTMLElement} container - The main container element for the control panel.
     */
    constructor(container) {
        if (!container) {
            throw new Error('ControlPanelUIBuilder requires a container element.');
        }
        this.container = container;
        this.elements = {}; // To store references to created elements
    }

    /** Helper to create a section container with title */
    _createSectionContainer(titleText, classNameSuffix = '') {
        const section = document.createElement('div');
        section.className = `control-section ${classNameSuffix}`.trim();
        const title = document.createElement('h3');
        title.className = 'section-title';
        title.textContent = titleText;
        section.appendChild(title);
        return section;
    }

    /**
     * Builds the static UI structure within the container.
     * @returns {object} An object containing references to the created elements and placeholders.
     */
    build() {
        this.container.innerHTML = ''; // Clear existing content

        // 1. Dynamic Placeholders
        this.elements.clockSectionPlaceholder = this._createSectionContainer('Clock', 'clock-controls-placeholder');
        this.container.appendChild(this.elements.clockSectionPlaceholder);

        this.elements.dateSectionPlaceholder = this._createSectionContainer('Date', 'date-controls-placeholder');
        this.container.appendChild(this.elements.dateSectionPlaceholder);

        // 2. Static Section Containers (content added by ControlPanel)
        this.elements.backgroundSection = this._createSectionContainer('Background', 'background-controls-section');
        this.container.appendChild(this.elements.backgroundSection);

        this.elements.favoritesSection = this._createSectionContainer('Favorites', 'favorites-controls-section');
        this.container.appendChild(this.elements.favoritesSection);

        // 3. Settings Section with Reset Button
        this.elements.settingsSection = this._createSectionContainer('Settings', 'settings-section');
        const resetButton = document.createElement('button');
        resetButton.textContent = 'Reset All Settings';
        resetButton.id = `${this.container.id}-reset-button`; // Use container ID for uniqueness
        resetButton.className = 'reset-button';
        const resetGroup = document.createElement('div');
        resetGroup.className = 'control-group';
        resetGroup.style.justifyContent = 'center';
        resetGroup.appendChild(resetButton);
        this.elements.settingsSection.appendChild(resetGroup);
        this.container.appendChild(this.elements.settingsSection);
        this.elements.resetButton = resetButton; // Store reference to the button itself

        console.log(`[ControlPanelUIBuilder] Built structure for #${this.container.id}`);

        // Return references to the key elements/containers
        return {
            clockSectionPlaceholder: this.elements.clockSectionPlaceholder,
            dateSectionPlaceholder: this.elements.dateSectionPlaceholder,
            backgroundSection: this.elements.backgroundSection,
            favoritesSection: this.elements.favoritesSection,
            settingsSection: this.elements.settingsSection,
            resetButton: this.elements.resetButton
        };
    }
}
