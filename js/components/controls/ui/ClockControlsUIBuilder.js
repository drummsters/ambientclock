import { StyleHandler } from '../../base/mixins/StyleHandler.js';
import { EventBus } from '../../../core/event-bus.js'; // Import EventBus

/**
 * Creates the DOM elements for the ClockControls component.
 * Separates UI construction logic from the main component logic.
 */
export class ClockControlsUIBuilder {
    /**
     * Creates a ClockControlsUIBuilder instance.
     * @param {string} elementId - The ID of the clock element being controlled.
     */
    constructor(elementId) {
        this.elementId = elementId;
        this.elements = {}; // To store references to created input elements
    }

    /**
     * Builds the clock control UI within the given container.
     * @param {HTMLElement} container - The container element to append controls to.
     * @returns {object} An object containing references to the created DOM elements.
     */
    build(container) {
        if (!container) {
            console.error('ClockControlsUIBuilder requires a container element.');
            return {};
        }
        console.log(`Building clock control elements for ${this.elementId}...`);

        // Clear existing content in case of re-initialization
        container.innerHTML = '';
        this.elements = {}; // Reset elements object

        // Create and append controls using helper methods
        const faceFormatSeconds = this._createFaceFormatSecondsControls();
        faceFormatSeconds.forEach(control => container.appendChild(control));

        const fontControls = this._createFontControls();
        fontControls.forEach(control => container.appendChild(control));

        const appearanceControls = this._createAppearanceControls();
        appearanceControls.forEach(control => container.appendChild(control));

        const spacingControls = this._createSpacingControls(); // Add spacing controls
        spacingControls.forEach(control => container.appendChild(control));

        const effectControls = this._createEffectControls();
        effectControls.forEach(control => container.appendChild(control));

        const positionControls = this._createPositionControls();
        positionControls.forEach(control => container.appendChild(control));

        console.log(`Clock control elements for ${this.elementId} built.`);
        return this.elements;
    }

    /** Creates controls for Face, Format, and Seconds */
    _createFaceFormatSecondsControls() {
        const controls = [];
        // Face
        const faceGroup = this._createControlGroup('Clock Face:');
        this.elements.faceSelect = document.createElement('select');
        this.elements.faceSelect.id = `${this.elementId}-face-select`;
        ['clean', 'analog'].forEach(face => { // Removed 'led' option
            const option = document.createElement('option');
            option.value = face;
            option.textContent = face.charAt(0).toUpperCase() + face.slice(1);
            this.elements.faceSelect.appendChild(option);
        });
        faceGroup.appendChild(this.elements.faceSelect);
        controls.push(faceGroup);

        // Format
        const formatGroup = this._createControlGroup('Time Format:');
        this.elements.formatSelect = document.createElement('select');
        this.elements.formatSelect.id = `${this.elementId}-format-select`;
        ['12', '24'].forEach(format => {
            const option = document.createElement('option');
            option.value = format;
            option.textContent = `${format}-hour`;
            this.elements.formatSelect.appendChild(option);
        });
        formatGroup.appendChild(this.elements.formatSelect);
        controls.push(formatGroup);

        // Seconds
        const secondsGroup = this._createControlGroup('Show Seconds:');
        this.elements.secondsCheckbox = document.createElement('input');
        this.elements.secondsCheckbox.type = 'checkbox';
        this.elements.secondsCheckbox.id = `${this.elementId}-seconds-checkbox`;
        secondsGroup.appendChild(this.elements.secondsCheckbox);
        secondsGroup.querySelector('label').htmlFor = this.elements.secondsCheckbox.id;
        controls.push(secondsGroup);

        return controls;
    }

    /** Creates controls for Font Family and Bold */
    _createFontControls() {
        const controls = [];
        // --- Row for Font Display and Change Link ---
        const fontDisplayRow = this._createControlGroup('Clock Font:'); // Use control group for label
        fontDisplayRow.classList.add('font-display-row'); // Add class for specific styling

        // Span to display the current font name
        this.elements.currentFontDisplay = document.createElement('span');
        this.elements.currentFontDisplay.className = 'current-font-display';
        this.elements.currentFontDisplay.textContent = 'Default'; // Placeholder
        // Add label, font display span, and change link to the same group
        fontDisplayRow.querySelector('label').textContent = 'Clock Font:';
        fontDisplayRow.appendChild(this.elements.currentFontDisplay);

        // "Change Font" Link
        this.elements.changeFontLink = document.createElement('a');
        this.elements.changeFontLink.textContent = 'Change Font';
        this.elements.changeFontLink.href = '#';
        this.elements.changeFontLink.className = 'control-link change-font-link'; // Ensure class is set
        fontDisplayRow.appendChild(this.elements.changeFontLink); // Append to the same row

        controls.push(fontDisplayRow); // Add the combined row

        // --- Row for Bold Checkbox ---
        const boldGroup = this._createControlGroup('Bold:');
        this.elements.boldCheckbox = document.createElement('input');
        this.elements.boldCheckbox.type = 'checkbox';
        this.elements.boldCheckbox.id = `${this.elementId}-bold-checkbox`;
        boldGroup.appendChild(this.elements.boldCheckbox);
        boldGroup.querySelector('label').htmlFor = this.elements.boldCheckbox.id;
        controls.push(boldGroup); // Add bold group separately

        return controls;
    }

    /** Creates controls for Character Spacing */
    _createSpacingControls() {
        const controls = [];
        // Character Spacing
        const spacingGroup = this._createControlGroup('Char Spacing (ch):');
        this.elements.spacingSlider = document.createElement('input');
        this.elements.spacingSlider.type = 'range';
        this.elements.spacingSlider.id = `${this.elementId}-spacing-slider`;
        this.elements.spacingSlider.min = '0.1'; // Min spacing
        this.elements.spacingSlider.max = '1.5'; // Max spacing (adjust as needed)
        this.elements.spacingSlider.step = '0.01'; // Fine control
        this.elements.spacingValue = document.createElement('span');
        this.elements.spacingValue.className = 'range-value';
        spacingGroup.appendChild(this.elements.spacingSlider);
        spacingGroup.appendChild(this.elements.spacingValue);
        controls.push(spacingGroup);

        // Colon X Adjustment
        const colonGroup = this._createControlGroup('Colon Position X:'); // Renamed Label
        this.elements.colonXSlider = document.createElement('input'); // Renamed element reference
        this.elements.colonXSlider.type = 'range';
        this.elements.colonXSlider.id = `${this.elementId}-colon-x-slider`; // Renamed ID
        this.elements.colonXSlider.min = '-5'; // Limit range to -5%
        this.elements.colonXSlider.max = '5';  // Limit range to +5%
        this.elements.colonXSlider.step = '1';
        this.elements.colonXValue = document.createElement('span'); // Renamed element reference
        this.elements.colonXValue.className = 'range-value';
        colonGroup.appendChild(this.elements.colonXSlider);
        colonGroup.appendChild(this.elements.colonXValue);
        controls.push(colonGroup);

        // Colon Vertical Adjustment
        const colonYGroup = this._createControlGroup('Colon Position Y:');
        this.elements.colonYSlider = document.createElement('input');
        this.elements.colonYSlider.type = 'range';
        this.elements.colonYSlider.id = `${this.elementId}-colon-y-slider`;
        this.elements.colonYSlider.min = '-5'; // Limit range to -5%
        this.elements.colonYSlider.max = '5';  // Limit range to +5%
        this.elements.colonYSlider.step = '1';
        this.elements.colonYValue = document.createElement('span');
        this.elements.colonYValue.className = 'range-value';
        colonYGroup.appendChild(this.elements.colonYSlider);
        colonYGroup.appendChild(this.elements.colonYValue);
        controls.push(colonYGroup);


        return controls;
    }

    /** Creates controls for Color, Size, and Opacity */
    _createAppearanceControls() {
        const controls = [];
        // Color
        const colorGroup = this._createControlGroup('Clock Color:');
        this.elements.colorPicker = document.createElement('input');
        this.elements.colorPicker.type = 'color';
        this.elements.colorPicker.id = `${this.elementId}-color-picker`;
        colorGroup.appendChild(this.elements.colorPicker);
        controls.push(colorGroup);

        // Size
        const sizeGroup = this._createControlGroup('Clock Size:');
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
        const opacityGroup = this._createControlGroup('Clock Opacity:');
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
