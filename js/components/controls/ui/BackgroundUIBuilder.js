/**
 * Builds the DOM elements for the Background Controls section.
 */
export class BackgroundUIBuilder {
    /**
     * Creates a BackgroundUIBuilder instance.
     * @param {HTMLElement} parentContainer - The DOM element to append the controls to.
     * @param {object} peapixCountries - An object mapping country codes to names.
     * @param {Map<string, object>} availableProviders - Map of available image provider instances.
     */
    constructor(parentContainer, peapixCountries, availableProviders) {
        if (!parentContainer) {
            throw new Error('BackgroundUIBuilder requires a parent container element.');
        }
        this.parentContainer = parentContainer;
        this.peapixCountries = peapixCountries || {};
        this.availableProviders = availableProviders || new Map();
        this.elements = {}; // To store references to created input elements
    }

    /**
     * Creates all DOM elements for the background controls and returns references.
     * @returns {object} An object containing references to the created DOM elements.
     */
    build() {
        console.log('Building background control elements...');
        // Don't clear parent, it might contain the section title
        // this.parentContainer.innerHTML = ''; // Removed

        // Create a wrapper for the controls inside the parent container
        const contentWrapper = document.createElement('div');
        contentWrapper.className = 'background-controls-content-wrapper'; // Add a class
        this.parentContainer.appendChild(contentWrapper);

        // Create and append controls using helper methods TO THE WRAPPER
        contentWrapper.appendChild(this._createTypeSelect());
        contentWrapper.appendChild(this._createSourceSelect());
        contentWrapper.appendChild(this._createPeapixSelect());

        const categoryControls = this._createCategorySelects();
        categoryControls.forEach(control => contentWrapper.appendChild(control));

        const commonControls = this._createCommonControls();
        commonControls.forEach(control => contentWrapper.appendChild(control));

        console.log('Background control elements built.');
        // Return the wrapper along with other elements
        return { ...this.elements, contentWrapper };
    }

    /** Creates the Type select control */
    _createTypeSelect() {
        const group = this.createControlGroup('Type:');
        this.elements.typeSelect = document.createElement('select');
        this.elements.typeSelect.id = 'background-type-select';
        ['color', 'image'].forEach(type => {
            const option = document.createElement('option');
            option.value = type;
            option.textContent = type.charAt(0).toUpperCase() + type.slice(1);
            this.elements.typeSelect.appendChild(option);
        });
        group.appendChild(this.elements.typeSelect);
        return group;
    }

    /** Creates the Image Source select control */
    _createSourceSelect() {
        const group = this.createControlGroup('Image Source:');
        this.elements.sourceSelect = document.createElement('select');
        this.elements.sourceSelect.id = 'background-source-select';
        this.elements.sourceSelect.innerHTML = ''; // Clear existing options

        if (this.availableProviders.size > 0) {
            this.availableProviders.forEach((providerInstance, providerName) => {
                const option = document.createElement('option');
                option.value = providerName;
                option.textContent = providerName.charAt(0).toUpperCase() + providerName.slice(1);
                this.elements.sourceSelect.appendChild(option);
            });
            this.elements.sourceSelect.disabled = false;
        } else {
            this.elements.sourceSelect.disabled = true;
            const option = document.createElement('option');
            option.textContent = 'No Image Providers Available';
            this.elements.sourceSelect.appendChild(option);
        }
        group.appendChild(this.elements.sourceSelect);
        return group;
    }

    /** Creates the Peapix Country select control */
    _createPeapixSelect() {
        this.elements.peapixCountryGroup = this.createControlGroup('Country:');
        this.elements.peapixCountrySelect = document.createElement('select');
        this.elements.peapixCountrySelect.id = 'background-peapix-country-select';
        Object.entries(this.peapixCountries).forEach(([code, name]) => {
            const option = document.createElement('option');
            option.value = code;
            option.textContent = name;
            this.elements.peapixCountrySelect.appendChild(option);
        });
        this.elements.peapixCountryGroup.appendChild(this.elements.peapixCountrySelect);
        this.elements.peapixCountryGroup.style.display = 'none'; // Hide initially
        return this.elements.peapixCountryGroup;
    }

    /** Creates the Category select and Custom Category input controls */
    _createCategorySelects() {
        const categoryGroup = this.createControlGroup('Category:');
        this.elements.categorySelect = document.createElement('select');
        this.elements.categorySelect.id = 'background-category-select';
        ['Nature', 'Technology', 'Architecture', 'People', 'Animals', 'Travel', 'Food', 'Abstract', 'Other']
        .forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            option.textContent = cat;
            this.elements.categorySelect.appendChild(option);
        });
        categoryGroup.appendChild(this.elements.categorySelect);
        categoryGroup.style.display = 'none'; // Hide initially
        this.elements.categorySelectGroup = categoryGroup; // Store reference

        const customGroup = this.createControlGroup('Custom:');
        this.elements.customCategoryInput = document.createElement('textarea');
        this.elements.customCategoryInput.id = 'background-custom-category-input';
        this.elements.customCategoryInput.placeholder = 'Enter custom category';
        this.elements.customCategoryInput.rows = 1;
        this.elements.customCategoryInput.style.resize = 'none';
        this.elements.customCategoryInput.style.overflow = 'hidden';
        this.elements.customCategoryInput.style.lineHeight = '1.5';
        this.elements.customCategoryInput.style.padding = '4px 8px';
        this.elements.customCategoryInput.style.width = '140px';
        customGroup.appendChild(this.elements.customCategoryInput);
        customGroup.style.display = 'none'; // Hide initially
        this.elements.customCategoryGroup = customGroup; // Store reference

        return [categoryGroup, customGroup];
    }

    /** Creates common controls like Opacity, Zoom, Info, Refresh */
    _createCommonControls() {
        const controls = [];

        // Opacity
        const opacityGroup = this.createControlGroup('Opacity:');
        this.elements.opacitySlider = document.createElement('input');
        this.elements.opacitySlider.type = 'range';
        this.elements.opacitySlider.id = 'background-opacity-slider';
        this.elements.opacitySlider.min = '0';
        this.elements.opacitySlider.max = '1';
        this.elements.opacitySlider.step = '0.05';
        this.elements.opacityValue = document.createElement('span');
        this.elements.opacityValue.className = 'range-value';
        opacityGroup.appendChild(this.elements.opacitySlider);
        opacityGroup.appendChild(this.elements.opacityValue);
        controls.push(opacityGroup);

        // Zoom
        const zoomGroup = this.createControlGroup('Zoom Effect:');
        this.elements.zoomCheckbox = document.createElement('input');
        this.elements.zoomCheckbox.type = 'checkbox';
        this.elements.zoomCheckbox.id = 'background-zoom-checkbox';
        zoomGroup.appendChild(this.elements.zoomCheckbox);
        zoomGroup.querySelector('label').htmlFor = this.elements.zoomCheckbox.id;
        controls.push(zoomGroup);

        // Info
        const infoGroup = this.createControlGroup('Show Info:');
        this.elements.infoCheckbox = document.createElement('input');
        this.elements.infoCheckbox.type = 'checkbox';
        this.elements.infoCheckbox.id = 'background-info-checkbox';
        infoGroup.appendChild(this.elements.infoCheckbox);
        infoGroup.querySelector('label').htmlFor = this.elements.infoCheckbox.id;
        controls.push(infoGroup);

        // Cycle Enable
        const cycleEnableGroup = this.createControlGroup('Auto Cycle:');
        this.elements.cycleEnableCheckbox = document.createElement('input');
        this.elements.cycleEnableCheckbox.type = 'checkbox';
        this.elements.cycleEnableCheckbox.id = 'background-cycle-enable-checkbox';
        cycleEnableGroup.appendChild(this.elements.cycleEnableCheckbox);
        cycleEnableGroup.querySelector('label').htmlFor = this.elements.cycleEnableCheckbox.id;
        controls.push(cycleEnableGroup);
        this.elements.cycleEnableGroup = cycleEnableGroup; // Store reference

        // Cycle Interval Slider
        const cycleIntervalGroup = this.createControlGroup('Cycle Interval (min):');
        this.elements.cycleIntervalSlider = document.createElement('input');
        this.elements.cycleIntervalSlider.type = 'range';
        this.elements.cycleIntervalSlider.id = 'background-cycle-interval-slider';
        this.elements.cycleIntervalSlider.min = '1';  // 1 minute
        this.elements.cycleIntervalSlider.max = '60'; // 60 minutes
        this.elements.cycleIntervalSlider.step = '1';
        this.elements.cycleIntervalValue = document.createElement('span');
        this.elements.cycleIntervalValue.className = 'range-value'; // Reuse class for styling
        cycleIntervalGroup.appendChild(this.elements.cycleIntervalSlider);
        cycleIntervalGroup.appendChild(this.elements.cycleIntervalValue);
        controls.push(cycleIntervalGroup);
        this.elements.cycleIntervalGroup = cycleIntervalGroup; // Store reference

        // Background Color Picker
        const colorGroup = this.createControlGroup('Color:');
        this.elements.colorPicker = document.createElement('input');
        this.elements.colorPicker.type = 'color';
        this.elements.colorPicker.id = 'background-color-picker';
        colorGroup.appendChild(this.elements.colorPicker);
        controls.push(colorGroup);
        this.elements.colorGroup = colorGroup; // Store reference to the group for visibility toggling

        // Refresh Button - REMOVED

        return controls;
    }

    /**
     * Helper to create a label and container for a control.
     * @param {string} labelText - The text for the label.
     * @returns {HTMLElement} The container div with the label.
     */
    createControlGroup(labelText) {
        const group = document.createElement('div');
        group.className = 'control-group';
        const label = document.createElement('label');
        label.textContent = labelText;
        group.appendChild(label);
        return group;
    }
}
