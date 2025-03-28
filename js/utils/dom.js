/**
 * DOM utility functions for the Ambient Clock application
 */

/**
 * Gets an element by its ID
 * @param {string} id - The element ID
 * @returns {HTMLElement|null} The element or null if not found
 */
export function getElement(id) {
    return document.getElementById(id);
}

/**
 * Gets elements by a selector
 * @param {string} selector - The CSS selector
 * @returns {NodeList} The matching elements
 */
export function getElements(selector) {
    return document.querySelectorAll(selector);
}

/**
 * Updates the text content of an element
 * @param {HTMLElement} element - The element to update
 * @param {string} text - The new text content
 */
export function updateText(element, text) {
    if (element) {
        element.textContent = text;
    }
}

/**
 * Updates the style of an element
 * @param {HTMLElement} element - The element to update
 * @param {Object} styles - Object containing style properties and values
 */
export function updateStyle(element, styles) {
    if (element) {
        Object.assign(element.style, styles);
    }
}

/**
 * Adds a class to an element
 * @param {HTMLElement} element - The element to update
 * @param {string} className - The class to add
 */
export function addClass(element, className) {
    if (element) {
        element.classList.add(className);
    }
}

/**
 * Removes a class from an element
 * @param {HTMLElement} element - The element to update
 * @param {string} className - The class to remove
 */
export function removeClass(element, className) {
    if (element) {
        element.classList.remove(className);
    }
}

/**
 * Toggles a class on an element
 * @param {HTMLElement} element - The element to update
 * @param {string} className - The class to toggle
 * @param {boolean} [force] - If true, adds the class; if false, removes it
 */
export function toggleClass(element, className, force) {
    if (element) {
        element.classList.toggle(className, force);
    }
}

/**
 * Shows an element by setting its display style
 * @param {HTMLElement} element - The element to show
 * @param {string} [display='block'] - The display value to use
 */
export function showElement(element, display = 'block') {
    if (element) {
        element.style.display = display;
    }
}

/**
 * Hides an element by setting its display style to 'none'
 * @param {HTMLElement} element - The element to hide
 */
export function hideElement(element) {
    if (element) {
        element.style.display = 'none';
    }
}

/**
 * Creates a new element with optional attributes and content
 * @param {string} tag - The tag name
 * @param {Object} [attributes] - Attributes to set on the element
 * @param {string|HTMLElement} [content] - Content to append to the element
 * @returns {HTMLElement} The created element
 */
export function createElement(tag, attributes = {}, content = null) {
    const element = document.createElement(tag);
    
    // Set attributes
    Object.entries(attributes).forEach(([key, value]) => {
        if (key === 'className') {
            element.className = value;
        } else {
            element.setAttribute(key, value);
        }
    });
    
    // Add content
    if (content) {
        if (typeof content === 'string') {
            element.textContent = content;
        } else {
            element.appendChild(content);
        }
    }
    
    return element;
}

/**
 * Adds an event listener to an element
 * @param {HTMLElement} element - The element to add the listener to
 * @param {string} event - The event type
 * @param {Function} callback - The event handler
 * @param {Object} [options] - Event listener options
 */
export function addEvent(element, event, callback, options) {
    if (element) {
        element.addEventListener(event, callback, options);
    }
}

/**
 * Removes an event listener from an element
 * @param {HTMLElement} element - The element to remove the listener from
 * @param {string} event - The event type
 * @param {Function} callback - The event handler
 * @param {Object} [options] - Event listener options
 */
export function removeEvent(element, event, callback, options) {
    if (element) {
        element.removeEventListener(event, callback, options);
    }
}

/**
 * Updates a datalist with options
 * @param {HTMLElement} datalist - The datalist element
 * @param {Array<string>} options - The options to add
 */
export function updateDatalist(datalist, options) {
    if (!datalist) return;
    
    // Clear existing options
    datalist.innerHTML = '';
    
    // Add options
    options.forEach(optionText => {
        const option = document.createElement('option');
        option.value = optionText;
        datalist.appendChild(option);
    });
}
