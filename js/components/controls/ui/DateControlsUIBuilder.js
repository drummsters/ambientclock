import { StyleHandler } from '../../base/mixins/StyleHandler.js';

/**
 * Creates the DOM elements for the DateControls component.
 * Separates UI construction logic from the main component logic.
 */
export class DateControlsUIBuilder {
    /**
     * Creates a DateControlsUIBuilder instance.
     * @param {string} elementId - The ID of the date element being controlled.
     */
    constructor(elementId) {
        this.elementId = elementId;
        this.elements = {}; // To store references to created input elements
    }

    /**
     * Builds the date control UI within the given container.
     * @param {HTMLElement} container - The container element to append controls to.
     * @returns {object} An object containing references to the created DOM elements.
     */
    build(container) {
        if (!container) {
            console.error('DateControlsUIBuilder requires a container element.');
            return {};
        }
        console.log(`Building date control elements for ${this.elementId}...`);

        // Clear existing content in case of re-initialization
        container.innerHTML = '';
        this.elements = {}; // Reset elements object

        // Create and append controls using helper methods
        const visibilityFormatControls = this._createVisibilityFormatControls();
        visibilityFormatControls.forEach(control => container.appendChild(control));

        const fontControls = this._createFontControls(); // Add font controls
        fontControls.forEach(control => container.appendChild(control));

        const appearanceControls = this._createAppearanceControls();
        appearanceControls.forEach(control => container.appendChild(control));

        const effectControls = this._createEffectControls();
        effectControls.forEach(control => container.appendChild(control));

        const positionControls = this._createPositionControls();
        positionControls.forEach(control => container.appendChild(control));

        console.log(`Date control elements for ${this.elementId} built.`);
        return this.elements;
    }

    /** Creates controls for Visibility and Format */
    _createVisibilityFormatControls() {
        const controls = [];
        // Visibility
        const visibilityGroup = this._createControlGroup('Display Date:');
        this.elements.visibleCheckbox = document.createElement('input');
        this.elements.visibleCheckbox.type = 'checkbox';
        this.elements.visibleCheckbox.id = `${this.elementId}-visible-checkbox`;
        visibilityGroup.appendChild(this.elements.visibleCheckbox);
        visibilityGroup.querySelector('label').htmlFor = this.elements.visibleCheckbox.id;
        controls.push(visibilityGroup);

        // Format
        const formatGroup = this._createControlGroup('Date Format:');
        this.elements.formatSelect = document.createElement('select');
        this.elements.formatSelect.id = `${this.elementId}-format-select`;
        [
            'MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD',
            'Day', 'Day, Month DD', 'Month DD, YYYY'
        ].forEach(format => {
            const option = document.createElement('option');
            option.value = format;
            option.textContent = format;
            this.elements.formatSelect.appendChild(option);
        });
        formatGroup.appendChild(this.elements.formatSelect);
        controls.push(formatGroup);

        return controls;
    }

    /** Creates controls for Font Family and Bold */
    _createFontControls() {
        const controls = [];
        // Font Family
        const fontGroup = this._createControlGroup('Date Font:');
        this.elements.fontSelect = document.createElement('select');
        this.elements.fontSelect.id = `${this.elementId}-font-select`;
        // Group fonts by category
        [
            {
                label: 'Sans-Serif Fonts',
                fonts: ['Arial', 'Helvetica', 'Open Sans', 'Roboto', 'Segoe UI', 'Tahoma', 'Verdana']
            },
            {
                label: 'Serif Fonts',
                fonts: ['Garamond', 'Georgia', 'Times New Roman']
            },
            {
                label: 'Monospace Fonts',
                fonts: ['Consolas', 'Courier New', 'Lucida Console', 'Monaco']
            },
            {
                label: 'Creative Fonts',
                fonts: ['Comic Sans MS', 'Impact', 'Lobster', 'Pacifico']
            },
            {
                label: 'System Fonts',
                fonts: ['System UI', 'Apple System']
            },
            {
                label: 'Generic Families',
                fonts: ['Sans-serif', 'Serif', 'Monospace', 'Cursive', 'Fantasy']
            }
        ].forEach(group => {
            // Add group header
            const groupHeader = document.createElement('optgroup');
            groupHeader.label = group.label;
            this.elements.fontSelect.appendChild(groupHeader);
            
            // Add sorted fonts in this group
            group.fonts.sort().forEach(font => {
                const option = document.createElement('option');
                option.value = font;
                option.textContent = font;
                groupHeader.appendChild(option);
            });
        });
        fontGroup.appendChild(this.elements.fontSelect);
        controls.push(fontGroup);

        // Bold
        const boldGroup = this._createControlGroup('Bold:');
        this.elements.boldCheckbox = document.createElement('input');
        this.elements.boldCheckbox.type = 'checkbox';
        this.elements.boldCheckbox.id = `${this.elementId}-bold-checkbox`;
        boldGroup.appendChild(this.elements.boldCheckbox);
        boldGroup.querySelector('label').htmlFor = this.elements.boldCheckbox.id;
        controls.push(boldGroup);

        return controls;
    }

    /** Creates controls for Color, Size, and Opacity */
    _createAppearanceControls() {
        const controls = [];
        // Color
        const colorGroup = this._createControlGroup('Date Color:');
        this.elements.colorPicker = document.createElement('input');
        this.elements.colorPicker.type = 'color';
        this.elements.colorPicker.id = `${this.elementId}-color-picker`;
        colorGroup.appendChild(this.elements.colorPicker);
        controls.push(colorGroup);

        // Size
        const sizeGroup = this._createControlGroup('Date Size:');
        this.elements.sizeSlider = document.createElement('input');
        this.elements.sizeSlider.type = 'range';
        this.elements.sizeSlider.id = `${this.elementId}-size-slider`;
        this.elements.sizeSlider.min = StyleHandler.MIN_SCALE;
        this.elements.sizeSlider.max = StyleHandler.MAX_SCALE;
        this.elements.sizeSlider.step = StyleHandler.SCALE_STEP.toString();
        this.elements.sizeValue = document.createElement('span');
        this.elements.sizeValue.className = 'range-value';
        sizeGroup.appendChild(this.elements.sizeSlider);
        sizeGroup.appendChild(this.elements.sizeValue);
        controls.push(sizeGroup);

        // Opacity
        const opacityGroup = this._createControlGroup('Date Opacity:');
        this.elements.opacitySlider = document.createElement('input');
        this.elements.opacitySlider.type = 'range';
        this.elements.opacitySlider.id = `${this.elementId}-opacity-slider`;
        this.elements.opacitySlider.min = '0';
        this.elements.opacitySlider.max = '1';
        this.elements.opacitySlider.step = '0.05';
        this.elements.opacityValue = document.createElement('span');
        this.elements.opacityValue.className = 'range-value';
        opacityGroup.appendChild(this.elements.opacitySlider);
        opacityGroup.appendChild(this.elements.opacityValue);
        controls.push(opacityGroup);

        return controls;
    }

    /** Creates controls for Position */
    _createPositionControls() {
        const controls = [];
        // Center
        const centerGroup = this._createControlGroup('Position:');
        this.elements.centerLink = document.createElement('a');
        this.elements.centerLink.textContent = 'Center on Screen';
        this.elements.centerLink.className = 'center-link';
        this.elements.centerLink.href = '#';
        centerGroup.appendChild(this.elements.centerLink);
        controls.push(centerGroup);
        return controls;
    }

    /** Creates controls for Separator and Effect Style */
    _createEffectControls() {
        const controls = [];
        // Separator
        const separatorGroup = this._createControlGroup('Show Separator:');
        this.elements.separatorCheckbox = document.createElement('input');
        this.elements.separatorCheckbox.type = 'checkbox';
        this.elements.separatorCheckbox.id = `${this.elementId}-separator-checkbox`;
        separatorGroup.appendChild(this.elements.separatorCheckbox);
        separatorGroup.querySelector('label').htmlFor = this.elements.separatorCheckbox.id;
        controls.push(separatorGroup);

        // Effect Style
        const effectGroup = this._createControlGroup('Effect:');
        this.elements.effectSelect = document.createElement('select');
        this.elements.effectSelect.id = `${this.elementId}-effect-select`;
        ['flat', 'raised', 'reflected'].forEach(style => {
            const option = document.createElement('option');
            option.value = style;
            option.textContent = style.charAt(0).toUpperCase() + style.slice(1);
            this.elements.effectSelect.appendChild(option);
        });
        effectGroup.appendChild(this.elements.effectSelect);
        controls.push(effectGroup);

        return controls;
    }

    /**
     * Helper to create a label and container for a control.
     * @param {string} labelText - The text for the label.
     * @returns {HTMLElement} The container div with the label.
     */
    _createControlGroup(labelText) {
        const group = document.createElement('div');
        group.className = 'control-group';
        const label = document.createElement('label');
        label.textContent = labelText;
        group.appendChild(label);
        return group;
    }
}
