/**
 * Builds the DOM elements for the Background Controls section.
 */
export class BackgroundUIBuilder {
    /**
     * Creates a BackgroundUIBuilder instance.
     * @param {HTMLElement} parentContainer - The DOM element to append the controls to.
     * @param {object} peapixCountries - An object mapping country codes to names.
     * @param {Map<string, object>} availableProviders - Map of available image provider instances.
     * @param {FavoritesService} favoritesService - The application's FavoritesService instance.
     */
    constructor(parentContainer, peapixCountries, availableProviders, favoritesService) {
        if (!parentContainer) {
            throw new Error('BackgroundUIBuilder requires a parent container element.');
        }
        this.parentContainer = parentContainer;
        this.peapixCountries = peapixCountries || {};
        this.availableProviders = availableProviders || new Map();
        this.favoritesService = favoritesService;
        this.elements = {}; // To store references to created input elements
    }

    /**
     * Creates all DOM elements for the background controls and returns references.
     * @returns {object} An object containing references to the created DOM elements.
     */
    build() {
        console.log('Building background control elements...');
        // Don't clear parent, it might contain the section title

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

        // Add YouTube video URL input (hidden by default)
        contentWrapper.appendChild(this._createYouTubeInput());

        // Add YouTube quality select (hidden by default)
        contentWrapper.appendChild(this._createYouTubeQualitySelect());

        const commonControls = this._createCommonControls();
        commonControls.forEach(control => contentWrapper.appendChild(control));

        console.log('Background control elements built.');
        // Return the wrapper along with other elements
        return { ...this.elements, contentWrapper };
    }

    /** Creates the Type select control */
    _createTypeSelect() {
        const inputId = 'background-type-select'; // Define ID
        const group = this.createControlGroup('Type:', inputId); // Pass ID to helper
        this.elements.typeSelect = document.createElement('select');
        this.elements.typeSelect.id = inputId; // Use defined ID
        ['color', 'image', 'youtube'].forEach(type => {
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
        const inputId = 'background-source-select'; // Define ID
        const group = this.createControlGroup('Image Source:', inputId); // Pass ID to helper
        this.elements.sourceSelect = document.createElement('select');
        this.elements.sourceSelect.id = inputId; // Use defined ID
        this.elements.sourceSelect.innerHTML = ''; // Clear existing options

        if (this.availableProviders.size > 0) {
            this.availableProviders.forEach((providerInstance, providerName) => {
                const option = document.createElement('option');
                option.value = providerName;
                // Capitalize name and add indicator if backend key is required
                let optionText = providerName.charAt(0).toUpperCase() + providerName.slice(1);
                if (providerInstance.requiresBackendKey) {
                    optionText += ' (API)'; // Indicate it uses a backend API key
                }
                option.textContent = optionText;
                // Do not disable the option; let the backend/handler manage errors if key is missing.
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
        const inputId = 'background-peapix-country-select'; // Define ID
        this.elements.peapixCountryGroup = this.createControlGroup('Country:', inputId); // Pass ID to helper
        this.elements.peapixCountrySelect = document.createElement('select');
        this.elements.peapixCountrySelect.id = inputId; // Use defined ID
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
        const categoryInputId = 'background-category-select'; // Define ID for select
        const categoryGroup = this.createControlGroup('Category:', categoryInputId); // Pass ID
        this.elements.categorySelect = document.createElement('select');
        this.elements.categorySelect.id = categoryInputId; // Use ID
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

        const customInputId = 'background-custom-category-input'; // Define ID for input
        const customGroup = this.createControlGroup('Custom:', customInputId); // Pass ID
        this.elements.customCategoryInput = document.createElement('input');
        this.elements.customCategoryInput.type = 'text';
        this.elements.customCategoryInput.id = customInputId; // Use ID
        this.elements.customCategoryInput.placeholder = 'Enter custom category';
        this.elements.customCategoryInput.maxLength = 30;
        this.elements.customCategoryInput.style.padding = '4px 8px';
        this.elements.customCategoryInput.style.width = '140px';
        customGroup.appendChild(this.elements.customCategoryInput);
        customGroup.style.display = 'none'; // Hide initially
        this.elements.customCategoryGroup = customGroup; // Store reference

        return [categoryGroup, customGroup];
    }

    /** Creates the YouTube video URL/ID input control (hidden by default) */
    _createYouTubeInput() {
        const inputId = 'background-youtube-url-input';
        const group = this.createControlGroup('YouTube URL:', inputId);
        
        // Create a container for the input and apply button
        const inputContainer = document.createElement('div');
        inputContainer.className = 'youtube-input-container';
        inputContainer.style.display = 'flex';
        inputContainer.style.alignItems = 'center';
        inputContainer.style.gap = '8px';
        inputContainer.style.width = '100%';
        
        // Create the input element
        this.elements.youtubeUrlInput = document.createElement('input');
        this.elements.youtubeUrlInput.type = 'text';
        this.elements.youtubeUrlInput.id = inputId;
        this.elements.youtubeUrlInput.placeholder = 'e.g. https://youtu.be/xyz or ID';
        this.elements.youtubeUrlInput.maxLength = 100;
        
        // Ensure the input uses the correct styling from controls-panel.css
        this.elements.youtubeUrlInput.className = 'control-input-text';
        this.elements.youtubeUrlInput.style.width = 'calc(100% - 70px)'; // Make room for the Apply button
        
        // Add event listeners to handle autofill and maintain styling
        this.elements.youtubeUrlInput.addEventListener('input', () => {
            // Ensure the class is maintained after autofill
            if (!this.elements.youtubeUrlInput.classList.contains('control-input-text')) {
                this.elements.youtubeUrlInput.className = 'control-input-text';
            }
        });
        
        this.elements.youtubeUrlInput.addEventListener('change', () => {
            // Ensure the class is maintained after autofill
            if (!this.elements.youtubeUrlInput.classList.contains('control-input-text')) {
                this.elements.youtubeUrlInput.className = 'control-input-text';
            }
        });
        
        // Create the Apply button
        this.elements.youtubeApplyButton = document.createElement('a');
        this.elements.youtubeApplyButton.textContent = 'Apply';
        this.elements.youtubeApplyButton.className = 'center-link';
        this.elements.youtubeApplyButton.id = 'youtube-apply-button';
        this.elements.youtubeApplyButton.href = '#';
        this.elements.youtubeApplyButton.title = 'Apply YouTube URL';
        
        // Add the input and button to the container
        inputContainer.appendChild(this.elements.youtubeUrlInput);
        inputContainer.appendChild(this.elements.youtubeApplyButton);
        
        // Add the container to the control group
        group.appendChild(inputContainer);
        group.style.display = 'none'; // Hide initially, shown only for type 'youtube'
        this.elements.youtubeUrlGroup = group; // Store reference for toggling
        return group;
    }

    /** Creates the YouTube quality select control (hidden by default) */
    _createYouTubeQualitySelect() {
        const inputId = 'background-youtube-quality-select';
        const group = this.createControlGroup('YouTube Quality:', inputId);
        this.elements.youtubeQualitySelect = document.createElement('select');
        this.elements.youtubeQualitySelect.id = inputId;
        [
            { value: 'auto', label: 'Auto' },
            { value: 'small', label: '240p' },
            { value: 'medium', label: '360p' },
            { value: 'large', label: '480p' },
            { value: 'hd720', label: '720p' },
            { value: 'hd1080', label: '1080p' },
            { value: 'hd1440', label: '1440p (2K)' },
            { value: 'hd2160', label: '2160p (4K)' }
        ].forEach(opt => {
            const option = document.createElement('option');
            option.value = opt.value;
            option.textContent = opt.label;
            this.elements.youtubeQualitySelect.appendChild(option);
        });
        group.appendChild(this.elements.youtubeQualitySelect);
        group.style.display = 'none'; // Hide initially, shown only for type 'youtube'
        this.elements.youtubeQualityGroup = group;
        return group;
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

        // Use Favorites Only
        const favoritesOnlyGroup = this.createControlGroup('Use Favorites Only:');
        this.elements.favoritesOnlyCheckbox = document.createElement('input');
        this.elements.favoritesOnlyCheckbox.type = 'checkbox';
        this.elements.favoritesOnlyCheckbox.id = 'background-favorites-only-checkbox';
        favoritesOnlyGroup.appendChild(this.elements.favoritesOnlyCheckbox);
        favoritesOnlyGroup.querySelector('label').htmlFor = this.elements.favoritesOnlyCheckbox.id;
        controls.push(favoritesOnlyGroup);
        this.elements.favoritesOnlyGroup = favoritesOnlyGroup; // Store reference to group for visibility toggling

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
        const colorInputId = 'background-color-picker'; // Define ID
        const colorGroup = this.createControlGroup('Color:', colorInputId); // Pass ID
        this.elements.colorPicker = document.createElement('input');
        this.elements.colorPicker.type = 'color';
        this.elements.colorPicker.id = colorInputId; // Use ID
        // Add title for color picker as label might not be sufficient for all screen readers
        this.elements.colorPicker.title = 'Background Color';
        colorGroup.appendChild(this.elements.colorPicker);
        controls.push(colorGroup);
        this.elements.colorGroup = colorGroup; // Store reference to the group for visibility toggling

        // Refresh Button - REMOVED

        return controls;
    }

    /**
     * Helper to create a label and container for a control.
     * @param {string} labelText - The text for the label.
     * @param {string} [inputId] - Optional ID of the input element this label is for.
     * @returns {HTMLElement} The container div with the label.
     */
    createControlGroup(labelText, inputId) { // Added inputId parameter
        const group = document.createElement('div');
        group.className = 'control-group';
        const label = document.createElement('label');
        label.textContent = labelText;
        if (inputId) { // Set the 'for' attribute if an ID is provided
            label.htmlFor = inputId;
        }
        group.appendChild(label);
        return group;
    }
}
