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

        // Create buttons
        const downloadButton = document.createElement('button');
        downloadButton.textContent = 'Download Settings';
        downloadButton.id = `${this.container.id}-download-button`;
        downloadButton.className = 'settings-io-button download-button'; // Add specific classes

        const uploadButton = document.createElement('button');
        uploadButton.textContent = 'Upload Settings';
        uploadButton.id = `${this.container.id}-upload-button`;
        uploadButton.className = 'settings-io-button upload-button';

        // Create a hidden file input associated with the upload button
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.json';
        fileInput.id = `${this.container.id}-file-input`;
        fileInput.style.display = 'none'; // Hide the actual file input

        const resetButton = document.createElement('button');
        resetButton.textContent = 'Reset All Settings';
        resetButton.id = `${this.container.id}-reset-button`;
        resetButton.className = 'reset-button'; // Keep existing class

        // Group buttons
        const settingsGroup = document.createElement('div');
        settingsGroup.className = 'control-group settings-actions-group'; // Use a more specific class
        settingsGroup.style.justifyContent = 'space-around'; // Adjust layout if needed
        settingsGroup.style.flexWrap = 'wrap'; // Allow wrapping on smaller screens
        settingsGroup.appendChild(downloadButton);
        settingsGroup.appendChild(uploadButton);
        settingsGroup.appendChild(fileInput); // Add hidden input to the DOM (but hidden)
        settingsGroup.appendChild(resetButton);

        this.elements.settingsSection.appendChild(settingsGroup);
        this.container.appendChild(this.elements.settingsSection);

        // Store references
        this.elements.downloadButton = downloadButton;
        this.elements.uploadButton = uploadButton;
        this.elements.fileInput = fileInput; // Store reference to hidden input
        this.elements.resetButton = resetButton;

        console.log(`[ControlPanelUIBuilder] Built structure for #${this.container.id}`);

        // Return references to the key elements/containers
        return {
            clockSectionPlaceholder: this.elements.clockSectionPlaceholder,
            dateSectionPlaceholder: this.elements.dateSectionPlaceholder,
            backgroundSection: this.elements.backgroundSection,
            favoritesSection: this.elements.favoritesSection,
            settingsSection: this.elements.settingsSection,
            downloadButton: this.elements.downloadButton,
            uploadButton: this.elements.uploadButton,
            fileInput: this.elements.fileInput, // Return reference to hidden input
            resetButton: this.elements.resetButton
        };
    }
}
